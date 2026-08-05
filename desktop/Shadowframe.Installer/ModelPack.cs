using System.Diagnostics;
using System.Formats.Tar;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Win32;

namespace Shadowframe.Installer;

internal static class ModelPackApplication
{
    public const string ManifestName = "Shadowframe-ModelPack.json";

    public static int Run(string[] args)
    {
        var options = ModelPackOptions.Parse(args);
        try
        {
            var manifest = LoadManifest();
            ModelPackEngine.ValidateManifest(manifest);
            if (options.Uninstall)
                return ModelPackEngine.Uninstall(options, manifest);

            var checks = ModelPackPrerequisites.Run(options.DataRoot, manifest);
            if (options.Silent)
            {
                if (checks.Blockers.Count > 0 && !options.AllowUnsupported)
                    throw new InvalidOperationException(string.Join(Environment.NewLine, checks.Blockers));
                ModelPackEngine.Install(options, manifest, null);
                return 0;
            }

            Application.Run(new ModelPackForm(options, manifest, checks));
            return Environment.ExitCode;
        }
        catch (Exception exception)
        {
            try { File.AppendAllText(Path.Combine(Path.GetTempPath(), "Shadowframe-ModelPack-Setup.log"), $"[{DateTimeOffset.Now:O}] {exception}\r\n"); } catch { }
            if (!options.Silent) MessageBox.Show(exception.Message, "Shadowframe Model Pack", MessageBoxButtons.OK, MessageBoxIcon.Error);
            else Console.Error.WriteLine(exception);
            return 1;
        }
    }

    public static ModelPackManifest LoadManifest()
    {
        var path = Path.Combine(AppContext.BaseDirectory, ManifestName);
        return JsonSerializer.Deserialize<ModelPackManifest>(File.ReadAllText(path), JsonOptions.Default)
               ?? throw new InvalidDataException("The model-pack manifest is invalid.");
    }
}

internal sealed record ModelPackManifest(
    int SchemaVersion,
    string PackId,
    string DisplayName,
    string Version,
    string MinimumCoreVersion,
    string PayloadFile,
    string Sha256,
    long InstalledBytes,
    int FileCount,
    string DistributionPolicy,
    List<ModelPackFile> Files,
    List<ModelPackSource> Sources,
    List<ModelPackCompatibilityCheck>? CompatibilityChecks = null);

internal sealed record ModelPackFile(string RelativePath, long Bytes, string Sha256);
internal sealed record ModelPackSource(string Name, string Url, string License);
internal sealed record ModelPackCompatibilityCheck(string Id, string DisplayName, string RepairMessage, List<ModelPackFile> RequiredFiles);

internal sealed class ModelPackOptions
{
    public bool Silent { get; init; }
    public bool Uninstall { get; init; }
    public bool Detached { get; init; }
    public bool AllowUnsupported { get; init; }
    public string DataRoot { get; init; } = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Shadowframe");

    public static ModelPackOptions Parse(IEnumerable<string> args)
    {
        var values = args.ToArray();
        var data = values.FirstOrDefault(value => value.StartsWith("/DATAROOT=", StringComparison.OrdinalIgnoreCase));
        return new ModelPackOptions
        {
            Silent = values.Any(value => value.Equals("/SILENT", StringComparison.OrdinalIgnoreCase) || value.Equals("/VERYSILENT", StringComparison.OrdinalIgnoreCase)),
            Uninstall = values.Any(value => value.Equals("/UNINSTALLPACK", StringComparison.OrdinalIgnoreCase)),
            Detached = values.Any(value => value.Equals("/DETACHED", StringComparison.OrdinalIgnoreCase)),
            AllowUnsupported = values.Any(value => value.Equals("/ALLOWUNSUPPORTED", StringComparison.OrdinalIgnoreCase)),
            DataRoot = data is null
                ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Shadowframe")
                : Path.GetFullPath(data[(data.IndexOf('=') + 1)..].Trim('"'))
        };
    }
}

internal sealed record ModelPackCheck(List<string> Passed, List<string> Warnings, List<string> Blockers)
{
    public string DisplayText => string.Join(Environment.NewLine, new[]
    {
        string.Join(Environment.NewLine, Passed.Select(item => $"✓ {item}")),
        string.Join(Environment.NewLine, Warnings.Select(item => $"! {item}")),
        string.Join(Environment.NewLine, Blockers.Select(item => $"× {item}"))
    }.Where(value => !string.IsNullOrWhiteSpace(value)));
}

internal static class ModelPackPrerequisites
{
    public static ModelPackCheck Run(string dataRoot, ModelPackManifest manifest)
    {
        var passed = new List<string>();
        var warnings = new List<string>();
        var blockers = new List<string>();
        using var core = Registry.CurrentUser.OpenSubKey(Program.UninstallKey);
        var coreRoot = core?.GetValue("InstallLocation") as string;
        var installedVersionText = core?.GetValue("DisplayVersion") as string;
        if (!string.IsNullOrWhiteSpace(coreRoot) && File.Exists(Path.Combine(coreRoot, "runtime-manifest.json")))
        {
            if (Version.TryParse(installedVersionText, out var installedVersion) &&
                Version.TryParse(manifest.MinimumCoreVersion, out var minimumVersion) &&
                installedVersion < minimumVersion)
                blockers.Add($"Update Shadowframe Core to {manifest.MinimumCoreVersion} or newer before installing this pack.");
            else
                passed.Add($"Shadowframe Core {installedVersionText ?? "installation"} detected");
        }
        else
            blockers.Add("Install Shadowframe Core before installing model packs.");

        var drive = new DriveInfo(Path.GetPathRoot(Path.GetFullPath(dataRoot)) ?? "C:\\");
        var needed = manifest.InstalledBytes + 2L * 1024 * 1024 * 1024;
        if (drive.AvailableFreeSpace >= needed)
            passed.Add($"Enough disk space ({PrerequisiteChecker.FormatBytes(drive.AvailableFreeSpace)} available)");
        else
            blockers.Add($"At least {PrerequisiteChecker.FormatBytes(needed)} free space is required on {drive.Name}.");

        var receipt = ModelPackEngine.ReceiptPath(dataRoot, manifest.PackId);
        if (File.Exists(receipt)) warnings.Add("The installed pack will be repaired or updated.");
        if (!manifest.DistributionPolicy.Equals("redistributable", StringComparison.OrdinalIgnoreCase))
            warnings.Add("This pack is for private use until every third-party redistribution permission is confirmed.");
        return new ModelPackCheck(passed, warnings, blockers);
    }
}

internal sealed record ModelPackProgress(int Percent, string Message);

internal static class ModelPackEngine
{
    public static void ValidateManifest(ModelPackManifest manifest)
    {
        if (manifest.SchemaVersion != 1) throw new InvalidDataException("Unsupported model-pack manifest version.");
        if (!Regex.IsMatch(manifest.PackId, "^[a-z0-9][a-z0-9-]{1,48}$")) throw new InvalidDataException("The model-pack identifier is invalid.");
        if (manifest.Files.Count != manifest.FileCount || manifest.Files.Count == 0) throw new InvalidDataException("The model-pack file list is incomplete.");
        foreach (var file in manifest.Files)
        {
            var normalized = file.RelativePath.Replace('/', Path.DirectorySeparatorChar);
            if (Path.IsPathRooted(normalized) || normalized.Split(Path.DirectorySeparatorChar).Any(segment => segment == ".."))
                throw new InvalidDataException($"Unsafe model path: {file.RelativePath}");
            if (file.Bytes <= 0 || !Regex.IsMatch(file.Sha256, "^[A-Fa-f0-9]{64}$"))
                throw new InvalidDataException($"Invalid model metadata: {file.RelativePath}");
        }
        foreach (var check in manifest.CompatibilityChecks ?? Enumerable.Empty<ModelPackCompatibilityCheck>())
        {
            if (!Regex.IsMatch(check.Id, "^[a-z0-9][a-z0-9-]{1,80}$"))
                throw new InvalidDataException("A model-pack compatibility check has an invalid identifier.");
            if (check.RequiredFiles.Count == 0)
                throw new InvalidDataException($"Compatibility check '{check.DisplayName}' has no required files.");
            foreach (var file in check.RequiredFiles)
            {
                var normalized = file.RelativePath.Replace('/', Path.DirectorySeparatorChar);
                if (Path.IsPathRooted(normalized) || normalized.Split(Path.DirectorySeparatorChar).Any(segment => segment == ".."))
                    throw new InvalidDataException($"Unsafe compatibility-check model path: {file.RelativePath}");
                if (file.Bytes <= 0 || !Regex.IsMatch(file.Sha256, "^[A-Fa-f0-9]{64}$"))
                    throw new InvalidDataException($"Invalid compatibility-check metadata: {file.RelativePath}");
            }
        }
    }

    public static string ReceiptPath(string dataRoot, string packId) => Path.Combine(dataRoot, "State", "ModelPacks", $"{packId}.json");

    public static void Install(ModelPackOptions options, ModelPackManifest manifest, IProgress<ModelPackProgress>? progress)
    {
        var payload = Path.Combine(AppContext.BaseDirectory, manifest.PayloadFile);
        if (!File.Exists(payload)) throw new FileNotFoundException("The model payload must remain beside Setup.", payload);
        progress?.Report(new(1, "Verifying the model pack…"));
        using (var stream = File.OpenRead(payload))
        {
            var hash = Convert.ToHexString(SHA256.HashData(stream));
            if (!hash.Equals(manifest.Sha256, StringComparison.OrdinalIgnoreCase))
                throw new InvalidDataException("The model pack failed its integrity check. Download it again.");
        }

        var dataRoot = Path.GetFullPath(options.DataRoot).TrimEnd(Path.DirectorySeparatorChar);
        var modelsRoot = Path.Combine(dataRoot, "models");
        var staging = Path.Combine(dataRoot, $".pack-staging-{manifest.PackId}-{Guid.NewGuid():N}");
        var backup = Path.Combine(dataRoot, $".pack-backup-{manifest.PackId}-{Guid.NewGuid():N}");
        Directory.CreateDirectory(staging);
        Directory.CreateDirectory(backup);
        var installed = new List<string>();
        var backedUp = new List<(string Original, string Backup)>();
        try
        {
            Extract(payload, staging, manifest, progress);
            foreach (var file in manifest.Files)
            {
                var relative = file.RelativePath.Replace('/', Path.DirectorySeparatorChar);
                var source = SafeModelPath(staging, relative);
                if (!File.Exists(source) || new FileInfo(source).Length != file.Bytes)
                    throw new InvalidDataException($"The payload is missing or has the wrong size: {file.RelativePath}");
                var target = SafeModelPath(modelsRoot, relative);
                Directory.CreateDirectory(Path.GetDirectoryName(target)!);
                if (File.Exists(target))
                {
                    var backupFile = SafeModelPath(backup, relative);
                    Directory.CreateDirectory(Path.GetDirectoryName(backupFile)!);
                    File.Move(target, backupFile, true);
                    backedUp.Add((target, backupFile));
                }
                File.Move(source, target, true);
                installed.Add(target);
            }
            ValidateCompatibilityChecks(modelsRoot, manifest);

            var receipt = ReceiptPath(dataRoot, manifest.PackId);
            Directory.CreateDirectory(Path.GetDirectoryName(receipt)!);
            File.WriteAllText(receipt, JsonSerializer.Serialize(new
            {
                manifest.PackId,
                manifest.DisplayName,
                manifest.Version,
                installedAt = DateTimeOffset.Now,
                packageRoot = AppContext.BaseDirectory,
                setupPath = Environment.ProcessPath,
                payloadPath = payload,
                manifest.Files,
                manifest.CompatibilityChecks,
                manifest.Sources
            }, JsonOptions.Default));
            CacheUninstaller(dataRoot, manifest);
            WriteRegistration(dataRoot, manifest);
            progress?.Report(new(100, $"{manifest.DisplayName} is ready."));
            Directory.Delete(backup, true);
            Directory.Delete(staging, true);
        }
        catch
        {
            foreach (var target in installed) if (File.Exists(target)) File.Delete(target);
            foreach (var pair in backedUp.AsEnumerable().Reverse())
            {
                if (!File.Exists(pair.Backup)) continue;
                Directory.CreateDirectory(Path.GetDirectoryName(pair.Original)!);
                File.Move(pair.Backup, pair.Original, true);
            }
            if (Directory.Exists(staging)) Directory.Delete(staging, true);
            if (Directory.Exists(backup)) Directory.Delete(backup, true);
            throw;
        }
    }

    private static void Extract(string payload, string staging, ModelPackManifest manifest, IProgress<ModelPackProgress>? progress)
    {
        using var stream = File.OpenRead(payload);
        using var archive = new TarReader(stream);
        var completed = 0;
        while (archive.GetNextEntry() is { } entry)
        {
            var name = entry.Name.Replace('/', Path.DirectorySeparatorChar).TrimStart('.', Path.DirectorySeparatorChar);
            if (string.IsNullOrWhiteSpace(name)) continue;
            var target = SafeModelPath(staging, name);
            if (entry.EntryType == TarEntryType.Directory) { Directory.CreateDirectory(target); continue; }
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            entry.ExtractToFile(target, true);
            completed++;
            progress?.Report(new(8 + (int)(Math.Min(completed, manifest.FileCount) / (double)manifest.FileCount * 86), $"Installing models… {completed:N0} of {manifest.FileCount:N0}"));
        }
        if (completed < manifest.FileCount) throw new InvalidDataException("The model payload is incomplete.");
    }

    private static string SafeModelPath(string root, string relative)
    {
        var fullRoot = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar);
        var result = Path.GetFullPath(Path.Combine(fullRoot, relative));
        if (!result.StartsWith(fullRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("The model pack contains an unsafe path.");
        return result;
    }

    private static void ValidateCompatibilityChecks(string modelsRoot, ModelPackManifest manifest)
    {
        foreach (var check in manifest.CompatibilityChecks ?? Enumerable.Empty<ModelPackCompatibilityCheck>())
        {
            foreach (var file in check.RequiredFiles)
            {
                var target = SafeModelPath(modelsRoot, file.RelativePath.Replace('/', Path.DirectorySeparatorChar));
                if (!File.Exists(target))
                    throw new InvalidDataException($"{check.DisplayName} is incomplete. {check.RepairMessage}");
                var info = new FileInfo(target);
                if (info.Length != file.Bytes)
                    throw new InvalidDataException($"{check.DisplayName} has a wrong-size file: {file.RelativePath}. {check.RepairMessage}");
                using var stream = File.OpenRead(target);
                var hash = Convert.ToHexString(SHA256.HashData(stream));
                if (!hash.Equals(file.Sha256, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidDataException($"{check.DisplayName} has a mismatched file: {file.RelativePath}. {check.RepairMessage}");
            }
        }
    }

    private static void CacheUninstaller(string dataRoot, ModelPackManifest manifest)
    {
        var cache = Path.Combine(dataRoot, "PackInstallers", manifest.PackId);
        Directory.CreateDirectory(cache);
        File.Copy(Environment.ProcessPath!, Path.Combine(cache, "Model Pack Uninstaller.exe"), true);
        File.Copy(Path.Combine(AppContext.BaseDirectory, ModelPackApplication.ManifestName), Path.Combine(cache, ModelPackApplication.ManifestName), true);
    }

    private static void WriteRegistration(string dataRoot, ModelPackManifest manifest)
    {
        var cache = Path.Combine(dataRoot, "PackInstallers", manifest.PackId);
        var uninstaller = Path.Combine(cache, "Model Pack Uninstaller.exe");
        using var key = Registry.CurrentUser.CreateSubKey($"{Program.UninstallKey}.ModelPack.{manifest.PackId}");
        key.SetValue("DisplayName", $"Shadowframe — {manifest.DisplayName}");
        key.SetValue("DisplayVersion", manifest.Version);
        key.SetValue("Publisher", Program.Publisher);
        key.SetValue("InstallLocation", Path.Combine(dataRoot, "models"));
        key.SetValue("UninstallString", $"\"{uninstaller}\" /UNINSTALLPACK /DATAROOT=\"{dataRoot}\"");
        key.SetValue("QuietUninstallString", $"\"{uninstaller}\" /UNINSTALLPACK /SILENT /DATAROOT=\"{dataRoot}\"");
        key.SetValue("EstimatedSize", (int)Math.Min(int.MaxValue, manifest.InstalledBytes / 1024), RegistryValueKind.DWord);
        key.SetValue("NoModify", 1, RegistryValueKind.DWord);
        key.SetValue("NoRepair", 1, RegistryValueKind.DWord);
    }

    public static int Uninstall(ModelPackOptions options, ModelPackManifest manifest)
    {
        var dataRoot = Path.GetFullPath(options.DataRoot).TrimEnd(Path.DirectorySeparatorChar);
        var cacheRoot = Path.Combine(dataRoot, "PackInstallers", manifest.PackId);
        if (!options.Detached && Environment.ProcessPath is string processPath && processPath.StartsWith(cacheRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
        {
            var temp = Path.Combine(Path.GetTempPath(), $"Shadowframe-Pack-Uninstall-{Guid.NewGuid():N}");
            Directory.CreateDirectory(temp);
            var detached = Path.Combine(temp, "Model Pack Uninstaller.exe");
            File.Copy(processPath, detached, true);
            File.Copy(Path.Combine(cacheRoot, ModelPackApplication.ManifestName), Path.Combine(temp, ModelPackApplication.ManifestName), true);
            Process.Start(new ProcessStartInfo(detached, $"/UNINSTALLPACK /DETACHED {(options.Silent ? "/SILENT " : "")}/DATAROOT=\"{dataRoot}\"") { UseShellExecute = true });
            return 0;
        }

        if (!options.Silent && MessageBox.Show($"Remove {manifest.DisplayName}?", "Shadowframe Model Pack", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
            return 0;

        var modelsRoot = Path.Combine(dataRoot, "models");
        var retained = 0;
        foreach (var file in manifest.Files)
        {
            var target = SafeModelPath(modelsRoot, file.RelativePath.Replace('/', Path.DirectorySeparatorChar));
            if (!File.Exists(target)) continue;
            string hash;
            using (var stream = File.OpenRead(target))
                hash = Convert.ToHexString(SHA256.HashData(stream));
            if (hash.Equals(file.Sha256, StringComparison.OrdinalIgnoreCase)) File.Delete(target);
            else retained++;
        }
        var receipt = ReceiptPath(dataRoot, manifest.PackId);
        if (File.Exists(receipt)) File.Delete(receipt);
        Registry.CurrentUser.DeleteSubKeyTree($"{Program.UninstallKey}.ModelPack.{manifest.PackId}", false);
        if (Directory.Exists(cacheRoot)) Directory.Delete(cacheRoot, true);
        RemoveEmptyModelDirectories(modelsRoot, manifest.Files);

        if (!options.Silent)
        {
            var message = retained == 0 ? $"{manifest.DisplayName} was removed." : $"{manifest.DisplayName} was removed. {retained} modified model file(s) were preserved.";
            MessageBox.Show(message, "Shadowframe Model Pack", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        if (options.Detached && Environment.ProcessPath is string detachedPath)
        {
            var tempRoot = Path.GetDirectoryName(detachedPath)!;
            Process.Start(new ProcessStartInfo("cmd.exe", $"/d /c ping 127.0.0.1 -n 3 >nul & rmdir /s /q \"{tempRoot}\"")
            { CreateNoWindow = true, UseShellExecute = false, WindowStyle = ProcessWindowStyle.Hidden });
        }
        return 0;
    }

    private static void RemoveEmptyModelDirectories(string root, IEnumerable<ModelPackFile> files)
    {
        if (!Directory.Exists(root)) return;
        var candidates = files
            .Select(file => Path.GetDirectoryName(SafeModelPath(root, file.RelativePath.Replace('/', Path.DirectorySeparatorChar))))
            .Where(directory => !string.IsNullOrWhiteSpace(directory))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderByDescending(directory => directory!.Length);
        foreach (var directory in candidates)
            if (Directory.Exists(directory) && !Directory.EnumerateFileSystemEntries(directory).Any()) Directory.Delete(directory);
    }
}

internal sealed class ModelPackForm : Form
{
    private readonly ModelPackOptions _options;
    private readonly ModelPackManifest _manifest;
    private readonly Label _status = new();
    private readonly ProgressBar _progress = new();
    private readonly Button _install = new();
    private readonly Button _cancel = new();
    private bool _installed;

    public ModelPackForm(ModelPackOptions options, ModelPackManifest manifest, ModelPackCheck checks)
    {
        _options = options;
        _manifest = manifest;
        Text = $"Shadowframe — {manifest.DisplayName}";
        ClientSize = new Size(700, 470);
        BackColor = Color.FromArgb(10, 10, 11);
        ForeColor = Color.White;
        Font = new Font("Segoe UI", 10);
        StartPosition = FormStartPosition.CenterScreen;
        Icon = Icon.ExtractAssociatedIcon(Environment.ProcessPath!);
        var accent = Color.FromArgb(255, 102, 29);
        var title = new Label { Text = manifest.DisplayName, Font = new Font("Segoe UI", 24, FontStyle.Bold), AutoSize = true, Location = new Point(42, 36) };
        var subtitle = new Label { Text = "Add the models required by Shadowframe's workflows.", ForeColor = Color.FromArgb(180, 185, 195), AutoSize = true, Location = new Point(46, 84) };
        var details = new Label { Text = $"PACK {manifest.Version}  •  {PrerequisiteChecker.FormatBytes(manifest.InstalledBytes)}  •  {manifest.FileCount} files", ForeColor = accent, AutoSize = true, Location = new Point(47, 120) };
        var checksLabel = new Label { Text = checks.DisplayText, ForeColor = Color.FromArgb(210, 213, 220), Location = new Point(47, 158), Size = new Size(606, 105) };
        var destination = new Label { Text = $"Models will be installed to:\n{Path.Combine(options.DataRoot, "models")}", ForeColor = Color.FromArgb(165, 170, 180), Location = new Point(47, 278), Size = new Size(606, 52) };
        _progress.Location = new Point(47, 345); _progress.Size = new Size(606, 10); _progress.Style = ProgressBarStyle.Continuous;
        _status.Text = File.Exists(ModelPackEngine.ReceiptPath(options.DataRoot, manifest.PackId)) ? "Ready to repair or update" : "Ready to install";
        _status.Location = new Point(47, 366); _status.Size = new Size(606, 26); _status.ForeColor = Color.FromArgb(168, 172, 182);
        _install.Text = File.Exists(ModelPackEngine.ReceiptPath(options.DataRoot, manifest.PackId)) ? "Repair / Update" : "Install Models";
        _install.Location = new Point(463, 408); _install.Size = new Size(190, 42); _install.FlatStyle = FlatStyle.Flat; _install.FlatAppearance.BorderSize = 0; _install.BackColor = accent; _install.ForeColor = Color.White;
        _install.Enabled = checks.Blockers.Count == 0 || options.AllowUnsupported; _install.Click += async (_, _) =>
        {
            if (_installed) Close();
            else await Install();
        };
        _cancel.Text = "Cancel"; _cancel.Location = new Point(353, 408); _cancel.Size = new Size(100, 42); _cancel.FlatStyle = FlatStyle.Flat; _cancel.BackColor = Color.FromArgb(26, 26, 29); _cancel.ForeColor = Color.White; _cancel.Click += (_, _) => Close();
        Controls.AddRange(new Control[] { title, subtitle, details, checksLabel, destination, _progress, _status, _install, _cancel });
    }

    private async Task Install()
    {
        _install.Enabled = _cancel.Enabled = false;
        var progress = new Progress<ModelPackProgress>(update => { _progress.Value = Math.Clamp(update.Percent, 0, 100); _status.Text = update.Message; });
        try
        {
            await Task.Run(() => ModelPackEngine.Install(_options, _manifest, progress));
            _installed = true;
            _install.Text = "Done"; _install.Enabled = true;
            _cancel.Text = "Close"; _cancel.Enabled = true;
        }
        catch (Exception exception)
        {
            _status.Text = "Installation failed.";
            MessageBox.Show(this, exception.Message, "Shadowframe Model Pack", MessageBoxButtons.OK, MessageBoxIcon.Error);
            _install.Enabled = _cancel.Enabled = true;
        }
    }
}
