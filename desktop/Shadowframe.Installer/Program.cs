using System.Diagnostics;
using System.Formats.Tar;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Win32;

namespace Shadowframe.Installer;

internal static class Program
{
    public const string ProductName = "Shadowframe AI";
    public const string ProductVersion = "0.3.0";
    public const string Publisher = "Shadowframe AI";
    public const string PayloadName = "Shadowframe-Core.tar";
    public const string ManifestName = "Shadowframe-Package.json";
    public const string UninstallKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\ShadowframeAI";

    [STAThread]
    private static int Main(string[] args)
    {
        Application.SetHighDpiMode(HighDpiMode.PerMonitorV2);
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        if (File.Exists(Path.Combine(AppContext.BaseDirectory, ModelPackApplication.ManifestName)))
            return ModelPackApplication.Run(args);

        var options = InstallOptions.Parse(args);
        try
        {
            if (options.Uninstall)
                return InstallerEngine.Uninstall(options);

            if (options.Silent)
            {
                var checks = PrerequisiteChecker.Run(options.InstallDirectory, LoadManifest());
                if (checks.Blockers.Count > 0 && !options.AllowUnsupported)
                    throw new InvalidOperationException(string.Join(Environment.NewLine, checks.Blockers));
                InstallerEngine.Install(options, LoadManifest(), null);
                return 0;
            }

            Application.Run(new InstallerForm(options, LoadManifest()));
            return Environment.ExitCode;
        }
        catch (Exception exception)
        {
            try
            {
                File.AppendAllText(Path.Combine(Path.GetTempPath(), "Shadowframe-Setup.log"), $"[{DateTimeOffset.Now:O}] {exception}\r\n");
            }
            catch { }
            if (!options.Silent)
                MessageBox.Show(exception.Message, ProductName, MessageBoxButtons.OK, MessageBoxIcon.Error);
            else
                Console.Error.WriteLine(exception);
            return 1;
        }
    }

    public static PackageManifest LoadManifest()
    {
        var path = Path.Combine(AppContext.BaseDirectory, ManifestName);
        if (!File.Exists(path)) throw new FileNotFoundException($"{ManifestName} must be beside Setup.", path);
        return JsonSerializer.Deserialize<PackageManifest>(File.ReadAllText(path), JsonOptions.Default)
               ?? throw new InvalidDataException("The Shadowframe package manifest is invalid.");
    }
}

internal sealed record PackageManifest(string Version, string PayloadFile, string Sha256, long UncompressedBytes, int FileCount);

internal static class JsonOptions
{
    public static readonly JsonSerializerOptions Default = new() { PropertyNameCaseInsensitive = true, WriteIndented = true };
}

internal sealed class InstallOptions
{
    public bool Silent { get; init; }
    public bool Uninstall { get; init; }
    public bool Detached { get; init; }
    public bool RemoveData { get; init; }
    public bool DesktopShortcut { get; init; } = true;
    public bool NoShortcuts { get; init; }
    public bool AllowUnsupported { get; init; }
    public string InstallDirectory { get; init; } = DefaultInstallDirectory();

    public static InstallOptions Parse(IEnumerable<string> args)
    {
        var values = args.ToArray();
        string? installDirectory = values.FirstOrDefault(value => value.StartsWith("/INSTALLDIR=", StringComparison.OrdinalIgnoreCase));
        return new InstallOptions
        {
            Silent = values.Any(value => value.Equals("/SILENT", StringComparison.OrdinalIgnoreCase) || value.Equals("/VERYSILENT", StringComparison.OrdinalIgnoreCase)),
            Uninstall = values.Any(value => value.Equals("/UNINSTALL", StringComparison.OrdinalIgnoreCase)),
            Detached = values.Any(value => value.Equals("/DETACHED", StringComparison.OrdinalIgnoreCase)),
            RemoveData = values.Any(value => value.Equals("/REMOVEDATA", StringComparison.OrdinalIgnoreCase)),
            DesktopShortcut = !values.Any(value => value.Equals("/NODESKTOP", StringComparison.OrdinalIgnoreCase)),
            NoShortcuts = values.Any(value => value.Equals("/NOSHORTCUTS", StringComparison.OrdinalIgnoreCase)),
            AllowUnsupported = values.Any(value => value.Equals("/ALLOWUNSUPPORTED", StringComparison.OrdinalIgnoreCase)),
            InstallDirectory = installDirectory is null
                ? DefaultInstallDirectory()
                : Path.GetFullPath(installDirectory[(installDirectory.IndexOf('=') + 1)..].Trim('"'))
        };
    }

    private static string DefaultInstallDirectory()
    {
        using var key = Registry.CurrentUser.OpenSubKey(Program.UninstallKey);
        return key?.GetValue("InstallLocation") is string existing && !string.IsNullOrWhiteSpace(existing)
            ? existing
            : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Shadowframe AI");
    }
}

internal sealed record PrerequisiteResults(List<string> Passed, List<string> Warnings, List<string> Blockers)
{
    public string DisplayText => string.Join(Environment.NewLine, new[]
    {
        string.Join(Environment.NewLine, Passed.Select(item => $"✓ {item}")),
        string.Join(Environment.NewLine, Warnings.Select(item => $"! {item}")),
        string.Join(Environment.NewLine, Blockers.Select(item => $"× {item}"))
    }.Where(value => !string.IsNullOrWhiteSpace(value)));
}

internal static class PrerequisiteChecker
{
    public static PrerequisiteResults Run(string installDirectory, PackageManifest manifest)
    {
        var passed = new List<string>();
        var warnings = new List<string>();
        var blockers = new List<string>();

        if (Environment.Is64BitOperatingSystem && OperatingSystem.IsWindowsVersionAtLeast(10, 0, 19041))
            passed.Add("Supported 64-bit Windows version");
        else
            blockers.Add("Windows 10 version 2004 or newer (64-bit) is required.");

        if (HasNvidiaAdapter()) passed.Add("NVIDIA graphics adapter detected");
        else blockers.Add("A supported NVIDIA graphics adapter and current driver are required.");

        if (HasWebView2()) passed.Add("Microsoft Edge WebView2 Runtime detected");
        else blockers.Add("Microsoft Edge WebView2 Runtime is required. Install it from Microsoft, then run Setup again.");

        var root = Path.GetPathRoot(Path.GetFullPath(installDirectory)) ?? "C:\\";
        var drive = new DriveInfo(root);
        var required = manifest.UncompressedBytes + 5L * 1024 * 1024 * 1024;
        if (drive.AvailableFreeSpace >= required)
            passed.Add($"Enough disk space ({FormatBytes(drive.AvailableFreeSpace)} available)");
        else
            blockers.Add($"At least {FormatBytes(required)} of free space is required on {drive.Name}.");

        if (File.Exists(Path.Combine(installDirectory, "Shadowframe.exe")))
            warnings.Add("An existing installation will be repaired or updated; models and generations are preserved.");

        return new PrerequisiteResults(passed, warnings, blockers);
    }

    private static bool HasWebView2()
    {
        const string client = @"SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";
        foreach (var hive in new[] { Registry.LocalMachine, Registry.CurrentUser })
        foreach (var view in new[] { RegistryView.Registry64, RegistryView.Registry32 })
        {
            using var baseKey = RegistryKey.OpenBaseKey(hive == Registry.LocalMachine ? RegistryHive.LocalMachine : RegistryHive.CurrentUser, view);
            using var key = baseKey.OpenSubKey(client);
            if (key?.GetValue("pv") is string version && !string.IsNullOrWhiteSpace(version) && version != "0.0.0.0") return true;
        }
        return false;
    }

    private static bool HasNvidiaAdapter()
    {
        const string videoKey = @"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}";
        using var root = Registry.LocalMachine.OpenSubKey(videoKey);
        if (root is null) return false;
        foreach (var name in root.GetSubKeyNames())
        {
            using var adapter = root.OpenSubKey(name);
            var description = string.Join(" ", adapter?.GetValue("DriverDesc"), adapter?.GetValue("ProviderName"));
            if (description.Contains("NVIDIA", StringComparison.OrdinalIgnoreCase)) return true;
        }
        return false;
    }

    public static string FormatBytes(long bytes) => $"{bytes / 1024d / 1024d / 1024d:0.0} GB";
}

internal sealed record InstallProgress(int Percent, string Message);

internal static class InstallerEngine
{
    public static void Install(InstallOptions options, PackageManifest manifest, IProgress<InstallProgress>? progress)
    {
        var payloadPath = Path.Combine(AppContext.BaseDirectory, manifest.PayloadFile);
        if (!File.Exists(payloadPath)) throw new FileNotFoundException("The Shadowframe Core payload must remain beside Setup.", payloadPath);

        progress?.Report(new(2, "Verifying the Core package…"));
        using (var stream = File.OpenRead(payloadPath))
        {
            var hash = Convert.ToHexString(SHA256.HashData(stream));
            if (!hash.Equals(manifest.Sha256, StringComparison.OrdinalIgnoreCase))
                throw new InvalidDataException("The Core package failed its integrity check. Download the installer again.");
        }

        var installRoot = Path.GetFullPath(options.InstallDirectory).TrimEnd(Path.DirectorySeparatorChar);
        var parent = Directory.GetParent(installRoot)?.FullName ?? throw new InvalidOperationException("The installation folder is invalid.");
        Directory.CreateDirectory(parent);
        StopInstalledRuntime(installRoot);

        var staging = Path.Combine(parent, $".shadowframe-staging-{Guid.NewGuid():N}");
        var backup = Path.Combine(parent, $".shadowframe-backup-{Guid.NewGuid():N}");
        Directory.CreateDirectory(staging);
        var replacedExisting = false;
        try
        {
            progress?.Report(new(8, "Installing the private AI runtime…"));
            ExtractPayload(payloadPath, staging, manifest.FileCount, progress);
            ValidateStaging(staging);

            if (Directory.Exists(installRoot))
            {
                Directory.Move(installRoot, backup);
                replacedExisting = true;
            }
            Directory.Move(staging, installRoot);

            var uninstaller = Path.Combine(installRoot, "Shadowframe Uninstaller.exe");
            File.Copy(Environment.ProcessPath!, uninstaller, true);
            File.WriteAllText(Path.Combine(installRoot, "install-receipt.json"), JsonSerializer.Serialize(new
            {
                product = Program.ProductName,
                version = manifest.Version,
                installedAt = DateTimeOffset.Now,
                dataRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Shadowframe")
            }, JsonOptions.Default));

            if (!options.NoShortcuts) CreateShortcuts(installRoot, options.DesktopShortcut);
            WriteUninstallRegistration(installRoot, manifest);
            progress?.Report(new(100, "Shadowframe AI is ready."));

            if (Directory.Exists(backup)) Directory.Delete(backup, true);
        }
        catch
        {
            if (Directory.Exists(staging)) Directory.Delete(staging, true);
            if (replacedExisting && Directory.Exists(backup))
            {
                if (Directory.Exists(installRoot)) Directory.Delete(installRoot, true);
                Directory.Move(backup, installRoot);
            }
            throw;
        }
    }

    private static void ExtractPayload(string payloadPath, string destination, int expectedFiles, IProgress<InstallProgress>? progress)
    {
        using var stream = File.OpenRead(payloadPath);
        using var archive = new TarReader(stream);
        var completed = 0;
        while (archive.GetNextEntry() is { } entry)
        {
            var normalizedName = entry.Name.Replace('/', Path.DirectorySeparatorChar).TrimStart('.', Path.DirectorySeparatorChar);
            if (string.IsNullOrWhiteSpace(normalizedName)) continue;
            var target = Path.GetFullPath(Path.Combine(destination, normalizedName));
            if (!target.StartsWith(destination + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                throw new InvalidDataException("The Core payload contains an unsafe path.");
            if (entry.EntryType == TarEntryType.Directory)
            {
                Directory.CreateDirectory(target);
                continue;
            }
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            entry.ExtractToFile(target, true);
            completed++;
            if (completed % 250 == 0)
                progress?.Report(new(8 + (int)(Math.Min(completed, expectedFiles) / (double)Math.Max(expectedFiles, 1) * 86), $"Installing Core files… {completed:N0} of {expectedFiles:N0}"));
        }
        if (expectedFiles > 0 && completed < expectedFiles) throw new InvalidDataException("The Core payload is incomplete.");
    }

    private static void ValidateStaging(string staging)
    {
        foreach (var relative in new[] { "Shadowframe.exe", "runtime-manifest.json", @"Runtime\ComfyUI\main.py", @"Runtime\PythonBase\python.exe", @"Runtime\Node\node.exe", @"scripts\Start-Shadowframe-Core.ps1" })
            if (!File.Exists(Path.Combine(staging, relative))) throw new InvalidDataException($"The installed Core is missing {relative}.");
    }

    private static void StopInstalledRuntime(string installRoot)
    {
        var stopScript = Path.Combine(installRoot, "scripts", "Stop-Shadowframe-Core.ps1");
        if (!File.Exists(stopScript)) return;
        using var process = Process.Start(new ProcessStartInfo("powershell.exe", $"-NoProfile -ExecutionPolicy Bypass -File \"{stopScript}\"")
        {
            CreateNoWindow = true,
            UseShellExecute = false
        });
        process?.WaitForExit(30000);
    }

    private static void CreateShortcuts(string installRoot, bool desktop)
    {
        var executable = Path.Combine(installRoot, "Shadowframe.exe");
        var startMenu = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "Shadowframe AI");
        Directory.CreateDirectory(startMenu);
        Shortcut.Create(Path.Combine(startMenu, "Shadowframe AI.lnk"), executable, installRoot, "Private local AI creation");
        Shortcut.Create(Path.Combine(startMenu, "Uninstall Shadowframe AI.lnk"), Path.Combine(installRoot, "Shadowframe Uninstaller.exe"), installRoot, "Remove Shadowframe AI", "/UNINSTALL");
        var desktopPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "Shadowframe AI.lnk");
        if (desktop) Shortcut.Create(desktopPath, executable, installRoot, "Private local AI creation");
        else if (File.Exists(desktopPath)) File.Delete(desktopPath);
    }

    private static void WriteUninstallRegistration(string installRoot, PackageManifest manifest)
    {
        using var key = Registry.CurrentUser.CreateSubKey(Program.UninstallKey);
        var uninstaller = Path.Combine(installRoot, "Shadowframe Uninstaller.exe");
        key.SetValue("DisplayName", Program.ProductName);
        key.SetValue("DisplayVersion", manifest.Version);
        key.SetValue("Publisher", Program.Publisher);
        key.SetValue("InstallLocation", installRoot);
        key.SetValue("DisplayIcon", $"{Path.Combine(installRoot, "Shadowframe.exe")},0");
        key.SetValue("UninstallString", $"\"{uninstaller}\" /UNINSTALL /INSTALLDIR=\"{installRoot}\"");
        key.SetValue("QuietUninstallString", $"\"{uninstaller}\" /UNINSTALL /SILENT /INSTALLDIR=\"{installRoot}\"");
        key.SetValue("EstimatedSize", (int)Math.Min(int.MaxValue, manifest.UncompressedBytes / 1024), RegistryValueKind.DWord);
        key.SetValue("NoModify", 1, RegistryValueKind.DWord);
        key.SetValue("NoRepair", 1, RegistryValueKind.DWord);
    }

    public static int Uninstall(InstallOptions options)
    {
        var installRoot = Path.GetFullPath(options.InstallDirectory).TrimEnd(Path.DirectorySeparatorChar);
        if (!options.Detached && Environment.ProcessPath is string processPath && processPath.StartsWith(installRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
        {
            var detached = Path.Combine(Path.GetTempPath(), $"Shadowframe-Uninstall-{Guid.NewGuid():N}.exe");
            File.Copy(processPath, detached, true);
            Process.Start(new ProcessStartInfo(detached, $"/UNINSTALL /DETACHED {(options.Silent ? "/SILENT " : "")}{(options.RemoveData ? "/REMOVEDATA " : "")}{(options.NoShortcuts ? "/NOSHORTCUTS " : "")}/INSTALLDIR=\"{installRoot}\"") { UseShellExecute = true });
            return 0;
        }

        if (!options.Silent)
        {
            var prompt = options.RemoveData
                ? "Remove Shadowframe AI and all local models, inputs, outputs, and generations?"
                : "Remove Shadowframe AI? Your models, inputs, outputs, and generations will be preserved.";
            if (MessageBox.Show(prompt, "Uninstall Shadowframe AI", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return 0;
        }

        StopInstalledRuntime(installRoot);
        if (!options.NoShortcuts) RemoveShortcuts();
        Registry.CurrentUser.DeleteSubKeyTree(Program.UninstallKey, false);
        if (Directory.Exists(installRoot)) DeleteWithRetries(installRoot);
        if (options.RemoveData)
        {
            var dataRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Shadowframe");
            if (Directory.Exists(dataRoot)) DeleteWithRetries(dataRoot);
        }
        if (!options.Silent)
        {
            var message = options.RemoveData
                ? "Shadowframe AI and its local model and generation data were removed."
                : "Shadowframe AI was removed. Your model and generation data was preserved.";
            MessageBox.Show(message, Program.ProductName, MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        if (options.Detached && Environment.ProcessPath is string detachedPath)
        {
            Process.Start(new ProcessStartInfo("cmd.exe", $"/d /c ping 127.0.0.1 -n 3 >nul & del /f /q \"{detachedPath}\"")
            {
                CreateNoWindow = true,
                UseShellExecute = false,
                WindowStyle = ProcessWindowStyle.Hidden
            });
        }
        return 0;
    }

    private static void RemoveShortcuts()
    {
        foreach (var path in new[]
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "Shadowframe AI.lnk"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "Shadowframe AI")
        })
        {
            if (File.Exists(path)) File.Delete(path);
            else if (Directory.Exists(path)) Directory.Delete(path, true);
        }
    }

    private static void DeleteWithRetries(string directory)
    {
        for (var attempt = 0; attempt < 5; attempt++)
        {
            try { Directory.Delete(directory, true); return; }
            catch when (attempt < 4) { Thread.Sleep(750); }
        }
    }
}

internal static class Shortcut
{
    public static void Create(string shortcutPath, string targetPath, string workingDirectory, string description, string arguments = "")
    {
        var shellType = Type.GetTypeFromProgID("WScript.Shell") ?? throw new InvalidOperationException("Windows shortcut support is unavailable.");
        dynamic shell = Activator.CreateInstance(shellType)!;
        dynamic shortcut = shell.CreateShortcut(shortcutPath);
        try
        {
            shortcut.TargetPath = targetPath;
            shortcut.WorkingDirectory = workingDirectory;
            shortcut.Description = description;
            shortcut.Arguments = arguments;
            shortcut.IconLocation = $"{targetPath},0";
            shortcut.Save();
        }
        finally
        {
            Marshal.FinalReleaseComObject(shortcut);
            Marshal.FinalReleaseComObject(shell);
        }
    }
}

internal sealed class InstallerForm : Form
{
    private readonly InstallOptions _options;
    private readonly PackageManifest _manifest;
    private readonly TextBox _installPath = new();
    private readonly Label _checks = new();
    private readonly Label _status = new();
    private readonly ProgressBar _progress = new();
    private readonly Button _primary = new();
    private readonly Button _cancel = new();
    private readonly CheckBox _desktop = new();
    private bool _installed;

    public InstallerForm(InstallOptions options, PackageManifest manifest)
    {
        _options = options;
        _manifest = manifest;
        Text = "Shadowframe AI Setup";
        ClientSize = new Size(720, 530);
        MinimumSize = new Size(720, 530);
        BackColor = Color.FromArgb(10, 10, 11);
        ForeColor = Color.White;
        Font = new Font("Segoe UI", 10);
        StartPosition = FormStartPosition.CenterScreen;
        Icon = Icon.ExtractAssociatedIcon(Environment.ProcessPath!);

        var accent = Color.FromArgb(255, 102, 29);
        var title = new Label { Text = "Install Shadowframe AI", Font = new Font("Segoe UI", 25, FontStyle.Bold), AutoSize = true, Location = new Point(42, 38) };
        var subtitle = new Label { Text = "Private local image and video generation, powered by your GPU.", ForeColor = Color.FromArgb(180, 185, 195), AutoSize = true, Location = new Point(46, 88) };
        var version = new Label { Text = $"CORE {manifest.Version}", ForeColor = accent, Font = new Font("Segoe UI Semibold", 9), AutoSize = true, Location = new Point(47, 124) };

        _checks.Location = new Point(47, 156);
        _checks.Size = new Size(625, 112);
        _checks.ForeColor = Color.FromArgb(210, 213, 220);

        var pathLabel = new Label { Text = "Install location", AutoSize = true, Location = new Point(47, 284) };
        _installPath.Text = options.InstallDirectory;
        _installPath.Location = new Point(47, 309);
        _installPath.Size = new Size(535, 30);
        _installPath.BackColor = Color.FromArgb(31, 31, 34);
        _installPath.ForeColor = Color.White;
        _installPath.BorderStyle = BorderStyle.FixedSingle;
        var browse = new Button { Text = "Browse", Location = new Point(592, 307), Size = new Size(80, 32), FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(29, 29, 31), ForeColor = Color.White };
        browse.FlatAppearance.BorderColor = Color.FromArgb(65, 65, 69);
        browse.Click += (_, _) => Browse();

        _desktop.Text = "Create a Desktop shortcut";
        _desktop.Checked = true;
        _desktop.AutoSize = true;
        _desktop.Location = new Point(47, 356);
        _desktop.ForeColor = Color.FromArgb(205, 208, 215);

        _progress.Location = new Point(47, 399);
        _progress.Size = new Size(625, 10);
        _progress.Style = ProgressBarStyle.Continuous;
        _status.Text = "Ready to install";
        _status.Location = new Point(47, 419);
        _status.Size = new Size(625, 28);
        _status.ForeColor = Color.FromArgb(168, 172, 182);

        _primary.Text = File.Exists(Path.Combine(options.InstallDirectory, "Shadowframe.exe")) ? "Repair / Update" : "Install";
        _primary.Location = new Point(482, 466);
        _primary.Size = new Size(190, 42);
        _primary.FlatStyle = FlatStyle.Flat;
        _primary.FlatAppearance.BorderSize = 0;
        _primary.BackColor = accent;
        _primary.ForeColor = Color.White;
        _primary.Font = new Font("Segoe UI Semibold", 10);
        _primary.Click += async (_, _) => await PrimaryAction();

        _cancel.Text = "Cancel";
        _cancel.Location = new Point(372, 466);
        _cancel.Size = new Size(100, 42);
        _cancel.FlatStyle = FlatStyle.Flat;
        _cancel.FlatAppearance.BorderColor = Color.FromArgb(65, 65, 69);
        _cancel.BackColor = Color.FromArgb(26, 26, 29);
        _cancel.ForeColor = Color.White;
        _cancel.Click += (_, _) => Close();

        Controls.AddRange(new Control[] { title, subtitle, version, _checks, pathLabel, _installPath, browse, _desktop, _progress, _status, _primary, _cancel });
        RefreshPrerequisites();
    }

    private void Browse()
    {
        using var dialog = new FolderBrowserDialog { InitialDirectory = _installPath.Text, Description = "Choose where Shadowframe AI will be installed", UseDescriptionForTitle = true };
        if (dialog.ShowDialog(this) == DialogResult.OK)
        {
            _installPath.Text = Path.Combine(dialog.SelectedPath, "Shadowframe AI");
            RefreshPrerequisites();
        }
    }

    private void RefreshPrerequisites()
    {
        try
        {
            var results = PrerequisiteChecker.Run(_installPath.Text, _manifest);
            _checks.Text = results.DisplayText;
            _primary.Enabled = results.Blockers.Count == 0;
            if (results.Blockers.Count > 0) _status.Text = "Resolve the requirements above before installing.";
        }
        catch (Exception exception)
        {
            _checks.Text = $"× {exception.Message}";
            _primary.Enabled = false;
        }
    }

    private async Task PrimaryAction()
    {
        if (_installed)
        {
            Process.Start(new ProcessStartInfo(Path.Combine(_installPath.Text, "Shadowframe.exe")) { UseShellExecute = true });
            Close();
            return;
        }

        _primary.Enabled = _cancel.Enabled = _installPath.Enabled = _desktop.Enabled = false;
        var progress = new Progress<InstallProgress>(update => { _progress.Value = Math.Clamp(update.Percent, 0, 100); _status.Text = update.Message; });
        try
        {
            var options = new InstallOptions { InstallDirectory = Path.GetFullPath(_installPath.Text), DesktopShortcut = _desktop.Checked };
            await Task.Run(() => InstallerEngine.Install(options, _manifest, progress));
            _installed = true;
            _primary.Text = "Launch Shadowframe";
            _primary.Enabled = true;
            _cancel.Text = "Close";
            _cancel.Enabled = true;
        }
        catch (Exception exception)
        {
            _status.Text = "Installation failed.";
            MessageBox.Show(this, exception.Message, "Shadowframe AI Setup", MessageBoxButtons.OK, MessageBoxIcon.Error);
            _primary.Enabled = _cancel.Enabled = _installPath.Enabled = _desktop.Enabled = true;
        }
    }
}
