namespace Shadowframe.Launcher;

internal static class Program
{
    private const string MutexName = "Local\\ShadowframeAI.Desktop.Launcher";

    [STAThread]
    private static void Main()
    {
        using var mutex = new Mutex(true, MutexName, out var firstInstance);
        if (!firstInstance)
        {
            ActivateExistingWindow();
            return;
        }

        ApplicationConfiguration.Initialize();
        Application.Run(new MainForm());
    }

    private static void ActivateExistingWindow()
    {
        var currentId = Environment.ProcessId;
        var existing = System.Diagnostics.Process.GetProcessesByName("Shadowframe")
            .FirstOrDefault(process => process.Id != currentId && process.MainWindowHandle != IntPtr.Zero);
        if (existing is null) return;
        NativeMethods.ShowWindow(existing.MainWindowHandle, 9);
        NativeMethods.SetForegroundWindow(existing.MainWindowHandle);
    }

    private static class NativeMethods
    {
        [System.Runtime.InteropServices.DllImport("user32.dll")]
        internal static extern bool ShowWindow(IntPtr window, int command);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        internal static extern bool SetForegroundWindow(IntPtr window);
    }
}
