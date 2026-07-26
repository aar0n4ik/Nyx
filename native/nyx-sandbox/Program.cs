using System;
using System.IO;
using System.Text;
using System.Runtime.InteropServices;

namespace NyxSandbox
{
    internal static class Program
    {
        const uint CREATE_SUSPENDED = 0x00000004;
        const uint CREATE_NO_WINDOW = 0x08000000;
        const uint STARTF_USESTDHANDLES = 0x00000100;
        const int STD_INPUT_HANDLE = -10;
        const int STD_OUTPUT_HANDLE = -11;
        const int STD_ERROR_HANDLE = -12;

        const uint TOKEN_DUPLICATE = 0x0002;
        const uint TOKEN_QUERY = 0x0008;
        const uint TOKEN_ASSIGN_PRIMARY = 0x0001;
        const uint TOKEN_ADJUST_DEFAULT = 0x0080;
        const uint TOKEN_ADJUST_GROUPS = 0x0040;
        const uint TOKEN_ADJUST_PRIVILEGES = 0x0020;
        const uint MAXIMUM_ALLOWED = 0x02000000;

        const int SecurityImpersonation = 2;
        const int TokenPrimary = 1;
        const int TokenIntegrityLevel = 25;
        const uint SE_GROUP_INTEGRITY = 0x00000020;

        const uint JOB_OBJECT_LIMIT_ACTIVE_PROCESS = 0x00000008;
        const uint JOB_OBJECT_LIMIT_PROCESS_TIME = 0x00000002;
        const uint JOB_OBJECT_LIMIT_PROCESS_MEMORY = 0x00000100;
        const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
        const uint JOB_OBJECT_LIMIT_DIE_ON_UNHANDLED_EXCEPTION = 0x00000400;
        const int JobObjectExtendedLimitInformation = 9;

        const uint WAIT_TIMEOUT = 0x00000102;
        const uint INFINITE = 0xFFFFFFFF;

        [StructLayout(LayoutKind.Sequential)]
        struct PROCESS_INFORMATION { public IntPtr hProcess; public IntPtr hThread; public uint dwProcessId; public uint dwThreadId; }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        struct STARTUPINFO {
            public int cb; public string lpReserved; public string lpDesktop; public string lpTitle;
            public int dwX; public int dwY; public int dwXSize; public int dwYSize;
            public int dwXCountChars; public int dwYCountChars; public int dwFillAttribute;
            public uint dwFlags; public short wShowWindow; public short cbReserved2;
            public IntPtr lpReserved2; public IntPtr hStdInput; public IntPtr hStdOutput; public IntPtr hStdError;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct SID_AND_ATTRIBUTES { public IntPtr Sid; public uint Attributes; }
        [StructLayout(LayoutKind.Sequential)]
        struct TOKEN_MANDATORY_LABEL { public SID_AND_ATTRIBUTES Label; }

        [StructLayout(LayoutKind.Sequential)]
        struct IO_COUNTERS {
            public ulong ReadOperationCount; public ulong WriteOperationCount; public ulong OtherOperationCount;
            public ulong ReadTransferCount; public ulong WriteTransferCount; public ulong OtherTransferCount;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
            public long PerProcessUserTimeLimit; public long PerJobUserTimeLimit; public uint LimitFlags;
            public UIntPtr MinimumWorkingSetSize; public UIntPtr MaximumWorkingSetSize; public uint ActiveProcessLimit;
            public UIntPtr Affinity; public uint PriorityClass; public uint SchedulingClass;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
            public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
            public IO_COUNTERS IoInfo;
            public UIntPtr ProcessMemoryLimit; public UIntPtr JobMemoryLimit;
            public UIntPtr PeakProcessMemoryUsed; public UIntPtr PeakJobMemoryUsed;
        }

        [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr GetCurrentProcess();
        [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr GetStdHandle(int nStdHandle);
        [DllImport("kernel32.dll", SetLastError = true)] static extern bool CloseHandle(IntPtr h);
        [DllImport("kernel32.dll", SetLastError = true)] static extern uint ResumeThread(IntPtr hThread);
        [DllImport("kernel32.dll", SetLastError = true)] static extern uint WaitForSingleObject(IntPtr h, uint ms);
        [DllImport("kernel32.dll", SetLastError = true)] static extern bool GetExitCodeProcess(IntPtr hProcess, out uint code);
        [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr CreateJobObject(IntPtr sa, string name);
        [DllImport("kernel32.dll", SetLastError = true)] static extern bool SetInformationJobObject(IntPtr hJob, int cls, IntPtr info, uint len);
        [DllImport("kernel32.dll", SetLastError = true)] static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);
        [DllImport("kernel32.dll", SetLastError = true)] static extern bool TerminateJobObject(IntPtr hJob, uint code);
        [DllImport("advapi32.dll", SetLastError = true)] static extern bool OpenProcessToken(IntPtr h, uint access, out IntPtr token);
        [DllImport("advapi32.dll", SetLastError = true)] static extern bool DuplicateTokenEx(IntPtr existing, uint access, IntPtr sa, int imp, int type, out IntPtr newToken);
        [DllImport("advapi32.dll", SetLastError = true)] static extern bool SetTokenInformation(IntPtr token, int cls, IntPtr info, uint len);
        [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)] static extern bool ConvertStringSidToSid(string sid, out IntPtr pSid);
        [DllImport("kernel32.dll")] static extern IntPtr LocalFree(IntPtr p);
        [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        static extern bool CreateProcessAsUser(IntPtr hToken, string app, StringBuilder cmdline,
            IntPtr procAttr, IntPtr threadAttr, bool inherit, uint flags, IntPtr env, string cwd,
            ref STARTUPINFO si, out PROCESS_INFORMATION pi);

        static string JsonStr(string s) {
            var sb = new StringBuilder();
            foreach (char c in s) {
                if (c == '"' || c == '\\') { sb.Append('\\'); sb.Append(c); }
                else if (c == '\n') sb.Append("\\n");
                else if (c == '\r') sb.Append("\\r");
                else if (c == '\t') sb.Append("\\t");
                else if (c < 0x20) sb.Append("\\u" + ((int)c).ToString("x4"));
                else sb.Append(c);
            }
            return sb.ToString();
        }

        static string GetStr(string j, string key) {
            int i = j.IndexOf("\"" + key + "\"");
            if (i < 0) return null;
            i = j.IndexOf(':', i); if (i < 0) return null;
            i++;
            while (i < j.Length && (j[i] == ' ' || j[i] == '\t')) i++;
            if (i >= j.Length || j[i] != '"') return null;
            i++;
            var sb = new StringBuilder();
            while (i < j.Length && j[i] != '"') {
                if (j[i] == '\\' && i + 1 < j.Length) { i++; char c = j[i]; if (c=='n') sb.Append('\n'); else if (c=='r') sb.Append('\r'); else if (c=='t') sb.Append('\t'); else sb.Append(c); }
                else sb.Append(j[i]);
                i++;
            }
            return sb.ToString();
        }

        static long GetNum(string j, string key, long dflt) {
            int i = j.IndexOf("\"" + key + "\"");
            if (i < 0) return dflt;
            i = j.IndexOf(':', i); if (i < 0) return dflt;
            i++;
            while (i < j.Length && (j[i]==' '||j[i]=='\t')) i++;
            int st = i;
            while (i < j.Length && (char.IsDigit(j[i]) || j[i]=='-')) i++;
            if (i == st) return dflt;
            long v; return long.TryParse(j.Substring(st, i-st), out v) ? v : dflt;
        }

        static System.Collections.Generic.List<string> GetArr(string j, string key) {
            var list = new System.Collections.Generic.List<string>();
            int i = j.IndexOf("\"" + key + "\"");
            if (i < 0) return list;
            i = j.IndexOf('[', i); if (i < 0) return list;
            i++;
            while (i < j.Length && j[i] != ']') {
                while (i < j.Length && j[i] != '"' && j[i] != ']') i++;
                if (i >= j.Length || j[i] == ']') break;
                i++;
                var sb = new StringBuilder();
                while (i < j.Length && j[i] != '"') {
                    if (j[i] == '\\' && i+1 < j.Length) { i++; char c=j[i]; if (c=='n') sb.Append('\n'); else if (c=='r') sb.Append('\r'); else if (c=='t') sb.Append('\t'); else sb.Append(c); }
                    else sb.Append(j[i]);
                    i++;
                }
                list.Add(sb.ToString());
                i++;
            }
            return list;
        }

        static string QuoteArg(string a) {
            if (a.Length > 0 && a.IndexOfAny(new[] {' ', '\t', '"', '\n', '\v'}) < 0) return a;
            var sb = new StringBuilder();
            sb.Append('"');
            int bs = 0;
            foreach (char c in a) {
                if (c == '\\') { bs++; }
                else if (c == '"') { sb.Append('\\', bs*2 + 1); sb.Append('"'); bs = 0; }
                else { if (bs > 0) { sb.Append('\\', bs); bs = 0; } sb.Append(c); }
            }
            if (bs > 0) sb.Append('\\', bs*2);
            sb.Append('"');
            return sb.ToString();
        }

        static int Main(string[] argv) {
            string specPath = null, resultPath = null;
            for (int k = 0; k < argv.Length - 1; k++) {
                if (argv[k] == "--spec") specPath = argv[k+1];
                else if (argv[k] == "--result") resultPath = argv[k+1];
            }
            string err = null; uint exitCode = 0xFFFFFFFF; bool timedOut = false; bool sandboxed = false;
            IntPtr hDupToken = IntPtr.Zero, hJob = IntPtr.Zero, pSid = IntPtr.Zero, labelPtr = IntPtr.Zero, extPtr = IntPtr.Zero;
            var pi = new PROCESS_INFORMATION();
            try {
                if (specPath == null) throw new Exception("no --spec");
                string spec = File.ReadAllText(specPath, Encoding.UTF8);
                string exe = GetStr(spec, "exe");
                var args = GetArr(spec, "args");
                string cwd = GetStr(spec, "cwd");
                string integrity = GetStr(spec, "integrity") ?? "low";
                long timeoutMs = GetNum(spec, "timeoutMs", 15000);
                long maxMemMB = GetNum(spec, "maxMemoryMB", 1024);
                long maxProc = GetNum(spec, "maxProcesses", 32);
                long cpuSec = GetNum(spec, "cpuSeconds", 60);
                if (string.IsNullOrEmpty(exe)) throw new Exception("no exe in spec");

                var cl = new StringBuilder();
                cl.Append(QuoteArg(exe));
                foreach (var a in args) { cl.Append(' '); cl.Append(QuoteArg(a)); }

                IntPtr hProcTok;
                if (!OpenProcessToken(GetCurrentProcess(), TOKEN_DUPLICATE|TOKEN_QUERY|TOKEN_ASSIGN_PRIMARY|TOKEN_ADJUST_DEFAULT|TOKEN_ADJUST_GROUPS|TOKEN_ADJUST_PRIVILEGES, out hProcTok))
                    throw new Exception("OpenProcessToken " + Marshal.GetLastWin32Error());
                if (!DuplicateTokenEx(hProcTok, MAXIMUM_ALLOWED, IntPtr.Zero, SecurityImpersonation, TokenPrimary, out hDupToken))
                    throw new Exception("DuplicateTokenEx " + Marshal.GetLastWin32Error());
                CloseHandle(hProcTok);

                if (integrity == "low") {
                    if (!ConvertStringSidToSid("S-1-16-4096", out pSid))
                        throw new Exception("ConvertStringSidToSid " + Marshal.GetLastWin32Error());
                    var label = new TOKEN_MANDATORY_LABEL();
                    label.Label.Sid = pSid;
                    label.Label.Attributes = SE_GROUP_INTEGRITY;
                    int lsz = Marshal.SizeOf(typeof(TOKEN_MANDATORY_LABEL));
                    labelPtr = Marshal.AllocHGlobal(lsz);
                    Marshal.StructureToPtr(label, labelPtr, false);
                    if (!SetTokenInformation(hDupToken, TokenIntegrityLevel, labelPtr, (uint)lsz))
                        throw new Exception("SetTokenInformation " + Marshal.GetLastWin32Error());
                }

                hJob = CreateJobObject(IntPtr.Zero, null);
                if (hJob == IntPtr.Zero) throw new Exception("CreateJobObject " + Marshal.GetLastWin32Error());
                var ext = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
                ext.BasicLimitInformation.LimitFlags =
                    JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE | JOB_OBJECT_LIMIT_DIE_ON_UNHANDLED_EXCEPTION |
                    JOB_OBJECT_LIMIT_ACTIVE_PROCESS | JOB_OBJECT_LIMIT_PROCESS_MEMORY | JOB_OBJECT_LIMIT_PROCESS_TIME;
                ext.BasicLimitInformation.ActiveProcessLimit = (uint)Math.Max(1L, maxProc);
                ext.BasicLimitInformation.PerProcessUserTimeLimit = cpuSec * 10000000L;
                ext.ProcessMemoryLimit = (UIntPtr)(ulong)(maxMemMB * 1024L * 1024L);
                int esz = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
                extPtr = Marshal.AllocHGlobal(esz);
                Marshal.StructureToPtr(ext, extPtr, false);
                if (!SetInformationJobObject(hJob, JobObjectExtendedLimitInformation, extPtr, (uint)esz))
                    throw new Exception("SetInformationJobObject " + Marshal.GetLastWin32Error());

                var si = new STARTUPINFO();
                si.cb = Marshal.SizeOf(typeof(STARTUPINFO));
                si.dwFlags = STARTF_USESTDHANDLES;
                si.hStdInput = GetStdHandle(STD_INPUT_HANDLE);
                si.hStdOutput = GetStdHandle(STD_OUTPUT_HANDLE);
                si.hStdError = GetStdHandle(STD_ERROR_HANDLE);

                if (string.IsNullOrEmpty(cwd)) cwd = null;
                if (!CreateProcessAsUser(hDupToken, null, new StringBuilder(cl.ToString()), IntPtr.Zero, IntPtr.Zero, true,
                        CREATE_SUSPENDED | CREATE_NO_WINDOW, IntPtr.Zero, cwd, ref si, out pi))
                    throw new Exception("CreateProcessAsUser " + Marshal.GetLastWin32Error());

                AssignProcessToJobObject(hJob, pi.hProcess);
                ResumeThread(pi.hThread);
                sandboxed = true;

                uint w = WaitForSingleObject(pi.hProcess, timeoutMs > 0 ? (uint)timeoutMs : INFINITE);
                if (w == WAIT_TIMEOUT) { timedOut = true; TerminateJobObject(hJob, 1); WaitForSingleObject(pi.hProcess, 3000); }
                if (!GetExitCodeProcess(pi.hProcess, out exitCode)) exitCode = 0xFFFFFFFF;
            } catch (Exception e) {
                err = e.Message;
            } finally {
                if (pi.hThread != IntPtr.Zero) CloseHandle(pi.hThread);
                if (pi.hProcess != IntPtr.Zero) CloseHandle(pi.hProcess);
                if (extPtr != IntPtr.Zero) Marshal.FreeHGlobal(extPtr);
                if (labelPtr != IntPtr.Zero) Marshal.FreeHGlobal(labelPtr);
                if (pSid != IntPtr.Zero) LocalFree(pSid);
                if (hDupToken != IntPtr.Zero) CloseHandle(hDupToken);
                if (hJob != IntPtr.Zero) CloseHandle(hJob);
            }

            int code = (err == null) ? unchecked((int)exitCode) : -1;
            string json = "{\"sandbox\":" + (sandboxed ? "true" : "false") +
                ",\"timedOut\":" + (timedOut ? "true" : "false") +
                ",\"code\":" + code +
                ",\"error\":" + (err == null ? "null" : ("\"" + JsonStr(err) + "\"")) + "}";
            try { if (resultPath != null) File.WriteAllText(resultPath, json, new UTF8Encoding(false)); } catch {}
            if (err != null) { try { Console.Error.WriteLine("[nyx-sandbox] " + err); } catch {} return 1; }
            return code;
        }
    }
}
