using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Shadowframe.Launcher;

internal sealed class MainForm : Form
{
    private static readonly Color Background = Color.FromArgb(10, 10, 11);
    private static readonly Color Surface = Color.FromArgb(22, 22, 24);
    private static readonly Color Border = Color.FromArgb(52, 52, 56);
    private static readonly Color Muted = Color.FromArgb(168, 168, 176);
    private static readonly Color Orange = Color.FromArgb(255, 106, 31);

    private readonly WebView2 _webView = new() { Dock = DockStyle.Fill, Visible = false };
    private readonly Panel _loadingPanel = new() { Dock = DockStyle.Fill, BackColor = Background };
    private readonly Label _loadingTitle = new();
    private readonly Label _loadingMessage = new();
    private readonly ProgressBar _progress = new();
    private readonly Button _retryButton = new();
    private readonly Label _statusLabel = new();
    private readonly Button _friendButton = new();
    private readonly Button _restartButton = new();
    private readonly Button _stopButton = new();

    private string? _projectRoot;
    private string? _bridgeAddress;
    private string? _privateKey;
    private bool _starting;
    private bool _allowClose;
    private bool _coreInstallation;

    public MainForm()
    {
        Text = "Shadowframe AI";
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Background;
        ForeColor = Color.White;
        MinimumSize = new Size(980, 680);
        Size = new Size(1440, 920);
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);

        BuildToolbar();
        BuildLoadingPanel();

        var content = new Panel { Dock = DockStyle.Fill, BackColor = Background };
        content.Controls.Add(_webView);
        content.Controls.Add(_loadingPanel);
        Controls.Add(content);
        Controls.SetChildIndex(content, 1);

        Shown += async (_, _) => await StartBridgeAndOpenAsync();
        FormClosing += OnFormClosing;
    }

    private void BuildToolbar()
    {
        var toolbar = new Panel
        {
            Dock = DockStyle.Top,
            Height = 48,
            BackColor = Surface,
            Padding = new Padding(16, 8, 12, 8),
        };

        var brand = new Label
        {
            Text = "S   SHADOWFRAME AI",
            AutoSize = true,
            Dock = DockStyle.Left,
            ForeColor = Color.White,
            Font = new Font("Segoe UI", 10, FontStyle.Bold),
            Padding = new Padding(0, 7, 0, 0),
        };

        _statusLabel.Text = "Starting local services";
        _statusLabel.AutoSize = true;
        _statusLabel.Dock = DockStyle.Left;
        _statusLabel.ForeColor = Muted;
        _statusLabel.Font = new Font("Segoe UI", 9);
        _statusLabel.Padding = new Padding(22, 8, 0, 0);

        ConfigureToolbarButton(_stopButton, "Stop & Exit", async (_, _) => await StopAndExitAsync());
        ConfigureToolbarButton(_restartButton, "Restart bridge", async (_, _) => await StartBridgeAndOpenAsync());
        ConfigureToolbarButton(_friendButton, "Friend access", (_, _) => ShowFriendAccess());
        _friendButton.Enabled = false;

        toolbar.Controls.Add(_stopButton);
        toolbar.Controls.Add(_restartButton);
        toolbar.Controls.Add(_friendButton);
        toolbar.Controls.Add(_statusLabel);
        toolbar.Controls.Add(brand);
        Controls.Add(toolbar);
    }

    private static void ConfigureToolbarButton(Button button, string text, EventHandler onClick)
    {
        button.Text = text;
        button.UseMnemonic = false;
        button.Dock = DockStyle.Right;
        button.Width = text.Length > 12 ? 118 : 104;
        button.FlatStyle = FlatStyle.Flat;
        button.FlatAppearance.BorderColor = Border;
        button.FlatAppearance.MouseOverBackColor = Color.FromArgb(42, 42, 46);
        button.BackColor = Surface;
        button.ForeColor = Color.White;
        button.Font = new Font("Segoe UI", 8.5f, FontStyle.Bold);
        button.Cursor = Cursors.Hand;
        button.Margin = new Padding(6, 0, 0, 0);
        button.Click += onClick;
    }

    private void BuildLoadingPanel()
    {
        var card = new Panel
        {
            Size = new Size(470, 245),
            BackColor = Surface,
            Anchor = AnchorStyles.None,
        };
        card.Paint += (_, eventArgs) =>
        {
            using var pen = new Pen(Border);
            eventArgs.Graphics.DrawRectangle(pen, 0, 0, card.Width - 1, card.Height - 1);
        };

        var mark = new Label
        {
            Text = "S",
            ForeColor = Color.White,
            BackColor = Orange,
            Font = new Font("Segoe UI", 18, FontStyle.Bold),
            TextAlign = ContentAlignment.MiddleCenter,
            Location = new Point(32, 30),
            Size = new Size(50, 50),
        };

        _loadingTitle.Text = "Starting Shadowframe";
        _loadingTitle.ForeColor = Color.White;
        _loadingTitle.Font = new Font("Segoe UI", 20, FontStyle.Bold);
        _loadingTitle.Location = new Point(32, 95);
        _loadingTitle.Size = new Size(400, 38);

        _loadingMessage.Text = "Preparing ComfyUI and your private bridge…";
        _loadingMessage.ForeColor = Muted;
        _loadingMessage.Font = new Font("Segoe UI", 10);
        _loadingMessage.Location = new Point(34, 140);
        _loadingMessage.Size = new Size(400, 42);

        _progress.Style = ProgressBarStyle.Marquee;
        _progress.MarqueeAnimationSpeed = 24;
        _progress.Location = new Point(34, 190);
        _progress.Size = new Size(400, 5);

        _retryButton.Text = "Try again";
        _retryButton.Visible = false;
        _retryButton.Location = new Point(34, 184);
        _retryButton.Size = new Size(120, 36);
        _retryButton.FlatStyle = FlatStyle.Flat;
        _retryButton.FlatAppearance.BorderSize = 0;
        _retryButton.BackColor = Orange;
        _retryButton.ForeColor = Color.White;
        _retryButton.Font = new Font("Segoe UI", 9, FontStyle.Bold);
        _retryButton.Cursor = Cursors.Hand;
        _retryButton.Click += async (_, _) => await StartBridgeAndOpenAsync();

        card.Controls.Add(mark);
        card.Controls.Add(_loadingTitle);
        card.Controls.Add(_loadingMessage);
        card.Controls.Add(_progress);
        card.Controls.Add(_retryButton);
        _loadingPanel.Controls.Add(card);
        _loadingPanel.Resize += (_, _) => card.Location = new Point(
            Math.Max(0, (_loadingPanel.ClientSize.Width - card.Width) / 2),
            Math.Max(0, (_loadingPanel.ClientSize.Height - card.Height) / 2));
    }

    private async Task StartBridgeAndOpenAsync()
    {
        if (_starting) return;
        _starting = true;
        ToggleToolbar(false);
        ShowLoading("Starting Shadowframe", "Preparing the private Shadowframe runtime…", false);

        try
        {
            _projectRoot = FindProjectRoot();
            if (_projectRoot is null)
            {
                throw new InvalidOperationException("Shadowframe could not find its Core runtime. Repair or reinstall Shadowframe Core.");
            }

            _coreInstallation = File.Exists(Path.Combine(_projectRoot, "runtime-manifest.json"));
            var launcherName = _coreInstallation ? "Start-Shadowframe-Core.ps1" : "Start-Shadowframe-Bridge.ps1";
            var launcher = Path.Combine(_projectRoot, "scripts", launcherName);
            var statusFile = Path.Combine(GetStateDirectory(), "desktop-status.txt");
            Directory.CreateDirectory(Path.GetDirectoryName(statusFile)!);
            File.Delete(statusFile);
            var result = await RunPowerShellAsync(
                launcher,
                _coreInstallation ? $"-StatusFile \"{statusFile}\"" : $"-NoBrowser -StartComfyUI -StatusFile \"{statusFile}\"",
                statusFile,
                message => _loadingMessage.Text = message);
            if (result.ExitCode != 0)
            {
                throw new InvalidOperationException("The local services could not start. Choose Try again, or use the original bridge launcher for detailed diagnostics.");
            }

            _loadingMessage.Text = "Opening the Shadowframe studio...";
            ReadFriendAccess();
            await InitializeWebViewAsync();
            NavigateToShadowframe();

            _statusLabel.Text = _coreInstallation ? "●  Private runtime connected" : "●  ComfyUI connected";
            _statusLabel.ForeColor = Color.FromArgb(102, 220, 143);
            _loadingPanel.Visible = false;
            _webView.Visible = true;
            _friendButton.Enabled = !_coreInstallation;
        }
        catch (Exception exception)
        {
            _statusLabel.Text = "●  Needs attention";
            _statusLabel.ForeColor = Color.FromArgb(255, 126, 108);
            ShowLoading("Shadowframe could not start", exception.Message, true);
        }
        finally
        {
            _starting = false;
            ToggleToolbar(true);
        }
    }

    private async Task InitializeWebViewAsync()
    {
        if (_webView.CoreWebView2 is not null) return;
        var userDataFolder = Path.Combine(GetStateDirectory(), "desktop-profile");
        var environment = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
        await _webView.EnsureCoreWebView2Async(environment);
        var core = _webView.CoreWebView2 ?? throw new InvalidOperationException("Microsoft WebView2 could not initialize.");
        core.Settings.AreDevToolsEnabled = false;
        core.Settings.AreDefaultContextMenusEnabled = true;
        core.Settings.IsStatusBarEnabled = false;
        core.NewWindowRequested += (_, eventArgs) =>
        {
            eventArgs.Handled = true;
            Process.Start(new ProcessStartInfo(eventArgs.Uri) { UseShellExecute = true });
        };
        _webView.NavigationCompleted += (_, eventArgs) =>
        {
            if (eventArgs.IsSuccess)
            {
                _statusLabel.Text = _coreInstallation ? "●  Private runtime connected" : "●  ComfyUI connected";
                _statusLabel.ForeColor = Color.FromArgb(102, 220, 143);
            }
        };
    }

    private void NavigateToShadowframe()
    {
        var pairingUrl = $"http://shadowframe.tech/#bridge={Uri.EscapeDataString(_bridgeAddress!)}&token={Uri.EscapeDataString(_privateKey!)}";
        _webView.Source = new Uri(pairingUrl);
    }

    private void ReadFriendAccess()
    {
        var accessPath = Path.Combine(GetStateDirectory(), "Friend Access.txt");
        if (!_coreInstallation)
        {
            accessPath = Path.Combine(_projectRoot!, ".shadowframe", "Friend Access.txt");
        }
        if (!File.Exists(accessPath)) throw new InvalidOperationException("The bridge started without creating access details.");
        var contents = File.ReadAllText(accessPath);
        _bridgeAddress = MatchLine(contents, "Bridge address");
        _privateKey = MatchLine(contents, "Private access key");
        if (string.IsNullOrWhiteSpace(_bridgeAddress) || string.IsNullOrWhiteSpace(_privateKey))
        {
            throw new InvalidOperationException("The bridge access details are incomplete.");
        }
    }

    private void ShowFriendAccess()
    {
        if (string.IsNullOrWhiteSpace(_bridgeAddress) || string.IsNullOrWhiteSpace(_privateKey)) return;
        using var dialog = new FriendAccessForm(_bridgeAddress, _privateKey);
        dialog.ShowDialog(this);
    }

    private async Task StopAndExitAsync()
    {
        ToggleToolbar(false);
        _statusLabel.Text = "Stopping local services";
        try
        {
            _projectRoot ??= FindProjectRoot();
            if (_projectRoot is not null)
            {
                var stopName = _coreInstallation ? "Stop-Shadowframe-Core.ps1" : "Stop-Shadowframe-Bridge.ps1";
                var stopScript = Path.Combine(_projectRoot, "scripts", stopName);
                await RunPowerShellAsync(stopScript, "");
            }
        }
        finally
        {
            _allowClose = true;
            Close();
        }
    }

    private void OnFormClosing(object? sender, FormClosingEventArgs eventArgs)
    {
        if (_allowClose) return;
        var answer = MessageBox.Show(
            this,
            "Close the Shadowframe window? The private generation engine will remain available in the background.\n\nUse “Stop & exit” when you want to shut everything down.",
            "Close Shadowframe",
            MessageBoxButtons.OKCancel,
            MessageBoxIcon.Information);
        if (answer == DialogResult.Cancel) eventArgs.Cancel = true;
    }

    private void ShowLoading(string title, string message, bool failed)
    {
        _webView.Visible = false;
        _loadingPanel.Visible = true;
        _loadingPanel.BringToFront();
        _loadingTitle.Text = title;
        _loadingMessage.Text = message;
        _progress.Visible = !failed;
        _retryButton.Visible = failed;
    }

    private void ToggleToolbar(bool enabled)
    {
        _restartButton.Enabled = enabled;
        _stopButton.Enabled = enabled;
        _friendButton.Enabled = enabled && !_coreInstallation && !string.IsNullOrWhiteSpace(_privateKey);
    }

    private static string? FindProjectRoot()
    {
        var candidates = new[] { AppContext.BaseDirectory, Environment.CurrentDirectory };
        foreach (var candidate in candidates)
        {
            var directory = new DirectoryInfo(candidate);
            for (var depth = 0; directory is not null && depth < 6; depth++, directory = directory.Parent)
            {
                if (File.Exists(Path.Combine(directory.FullName, "runtime-manifest.json")) ||
                    File.Exists(Path.Combine(directory.FullName, "scripts", "Start-Shadowframe-Bridge.ps1")))
                {
                    return directory.FullName;
                }
            }
        }
        return null;
    }

    private string GetStateDirectory()
    {
        if (_coreInstallation)
        {
            return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Shadowframe", "State");
        }
        return Path.Combine(_projectRoot!, ".shadowframe");
    }

    private static async Task<ProcessResult> RunPowerShellAsync(
        string scriptPath,
        string arguments,
        string? statusFile = null,
        Action<string>? statusChanged = null)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = "powershell.exe",
            Arguments = $"-NoProfile -ExecutionPolicy Bypass -File \"{scriptPath}\" {arguments}",
            UseShellExecute = false,
            CreateNoWindow = true,
            WorkingDirectory = Path.GetDirectoryName(Path.GetDirectoryName(scriptPath))!,
        };
        using var process = Process.Start(startInfo) ?? throw new InvalidOperationException("Windows could not start the Shadowframe service launcher.");
        var deadline = DateTime.UtcNow.AddMinutes(5);
        var previousStatus = string.Empty;
        while (!process.HasExited)
        {
            if (DateTime.UtcNow >= deadline)
            {
                process.Kill(true);
                throw new TimeoutException("Shadowframe startup exceeded five minutes. Check that ComfyUI can start normally, then try again.");
            }

            if (!string.IsNullOrWhiteSpace(statusFile) && File.Exists(statusFile))
            {
                try
                {
                    var currentStatus = File.ReadAllText(statusFile).Trim();
                    if (currentStatus.Length > 0 && currentStatus != previousStatus)
                    {
                        previousStatus = currentStatus;
                        statusChanged?.Invoke(currentStatus);
                    }
                }
                catch (IOException) { }
            }
            await Task.Delay(250);
        }
        return new ProcessResult(process.ExitCode);
    }

    private static string MatchLine(string contents, string label)
    {
        var match = Regex.Match(contents, $@"(?m)^{Regex.Escape(label)}:\s*(.+)$");
        return match.Success ? match.Groups[1].Value.Trim() : string.Empty;
    }

    private sealed record ProcessResult(int ExitCode);
}

internal sealed class FriendAccessForm : Form
{
    public FriendAccessForm(string bridgeAddress, string privateKey)
    {
        Text = "Shadowframe Friend Access";
        StartPosition = FormStartPosition.CenterParent;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        ClientSize = new Size(620, 300);
        BackColor = Color.FromArgb(20, 20, 22);
        ForeColor = Color.White;

        var title = new Label
        {
            Text = "Share private access",
            Font = new Font("Segoe UI", 17, FontStyle.Bold),
            ForeColor = Color.White,
            Location = new Point(26, 22),
            Size = new Size(560, 36),
        };
        var note = new Label
        {
            Text = "Your PC, ComfyUI, and Shadowframe must remain running. Treat the key like a password.",
            Font = new Font("Segoe UI", 9),
            ForeColor = Color.FromArgb(170, 170, 178),
            Location = new Point(28, 62),
            Size = new Size(560, 36),
        };

        Controls.Add(title);
        Controls.Add(note);
        Controls.Add(BuildAccessRow("Bridge address", bridgeAddress, 108));
        Controls.Add(BuildAccessRow("Private access key", privateKey, 174));

        var copyBoth = new Button
        {
            Text = "Copy both",
            Location = new Point(456, 244),
            Size = new Size(132, 36),
            FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(255, 106, 31),
            ForeColor = Color.White,
            Font = new Font("Segoe UI", 9, FontStyle.Bold),
            Cursor = Cursors.Hand,
        };
        copyBoth.FlatAppearance.BorderSize = 0;
        copyBoth.Click += (_, _) =>
        {
            Clipboard.SetText($"Bridge address: {bridgeAddress}\r\nPrivate access key: {privateKey}");
            copyBoth.Text = "Copied";
        };
        Controls.Add(copyBoth);
    }

    private static Control BuildAccessRow(string label, string value, int top)
    {
        var panel = new Panel { Location = new Point(28, top), Size = new Size(560, 54) };
        var caption = new Label
        {
            Text = label,
            ForeColor = Color.FromArgb(170, 170, 178),
            Font = new Font("Segoe UI", 8),
            Location = new Point(0, 0),
            Size = new Size(200, 18),
        };
        var field = new TextBox
        {
            Text = value,
            ReadOnly = true,
            BorderStyle = BorderStyle.FixedSingle,
            BackColor = Color.FromArgb(31, 31, 34),
            ForeColor = Color.White,
            Font = new Font("Consolas", 9),
            Location = new Point(0, 21),
            Size = new Size(462, 29),
        };
        var copy = new Button
        {
            Text = "Copy",
            FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(31, 31, 34),
            ForeColor = Color.White,
            Location = new Point(474, 20),
            Size = new Size(86, 30),
            Cursor = Cursors.Hand,
        };
        copy.FlatAppearance.BorderColor = Color.FromArgb(60, 60, 64);
        copy.Click += (_, _) =>
        {
            Clipboard.SetText(value);
            copy.Text = "Copied";
        };
        panel.Controls.Add(caption);
        panel.Controls.Add(field);
        panel.Controls.Add(copy);
        return panel;
    }
}
