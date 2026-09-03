import React from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  Play, 
  Power, 
  ShieldAlert, 
  Router, 
  FileCode, 
  CheckCircle2,
  Server
} from 'lucide-react';
import { ZKTecoDevice } from '../types';

interface WindowsSetupViewProps {
  device?: ZKTecoDevice;
}

export const WindowsSetupView: React.FC<WindowsSetupViewProps> = ({ device }) => {
  const [copied, setCopied] = React.useState<string | null>(null);

  const activeIp = device?.ip_address || '192.168.227.180';
  const activePort = device?.port || 4370;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#121212] p-6 rounded-2xl border border-[#262626] shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Terminal className="w-5 h-5 text-blue-400" />
          <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">Windows Local Execution Guide</h1>
        </div>
        <p className="text-sm text-neutral-400">
          How to run the standalone ZKTeco K40 attendance portal directly on your local Windows PC &bull; Active Terminal: <strong className="text-blue-400 font-mono">{activeIp}:{activePort}</strong>
        </p>
      </div>

      {/* Architecture Overview */}
      <div className="bg-[#121212] text-neutral-100 p-6 rounded-2xl border border-[#262626] shadow-sm">
        <h3 className="font-bold text-neutral-100 text-base mb-3 flex items-center gap-2">
          <Router className="w-4 h-4 text-emerald-400" />
          <span>Local Windows Direct Socket Architecture</span>
        </h3>

        <div className="font-mono text-xs bg-[#0a0a0a] p-4 rounded-xl border border-[#222222] overflow-x-auto text-emerald-400 leading-relaxed">
          {`[ Browser (http://localhost:3000) ]
        |
        | HTTP Requests / AJAX Polling
        v
[ Full-Stack Server Proxy ] (Port 3000)
        |
        | REST API / Direct ZKTeco Protocol (Port 5005 / 4370)
        v
[ Python ZKTeco Connector Daemon ]
        |
        | Raw TCP/IP Socket Protocol (Port ${activePort})
        v
[ Physical ZKTeco K40 Biometric Machine ] (${activeIp})`}
        </div>

        <p className="text-xs text-neutral-400 mt-3">
          <strong className="text-neutral-200">Source of Truth:</strong> The ZKTeco K40 flash memory at IP <code className="text-emerald-400 font-mono">{activeIp}</code>. Zero SQL databases (No MySQL, Postgres, SQLite, MongoDB) are installed or needed.
        </p>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1: Install */}
        <div className="bg-[#121212] p-6 rounded-2xl border border-[#262626] shadow-xs space-y-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-sm">
            1
          </div>
          <h4 className="font-bold text-neutral-100 text-sm">Run install.bat</h4>
          <p className="text-xs text-neutral-400">
            Checks Python 3.8+ and installs connector socket dependencies.
          </p>
          <div className="bg-[#171717] border border-[#262626] text-neutral-200 p-2.5 rounded-xl font-mono text-xs flex items-center justify-between">
            <span>install.bat</span>
            <button
              onClick={() => copyToClipboard('install.bat', 's1')}
              className="text-neutral-500 hover:text-neutral-200 cursor-pointer"
            >
              {copied === 's1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Step 2: Start */}
        <div className="bg-[#121212] p-6 rounded-2xl border border-[#262626] shadow-xs space-y-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm">
            2
          </div>
          <h4 className="font-bold text-neutral-100 text-sm">Run start.bat</h4>
          <p className="text-xs text-neutral-400">
            Launches Python connector daemon on port 5005 and starts PHP server on port 3000.
          </p>
          <div className="bg-[#171717] border border-[#262626] text-neutral-200 p-2.5 rounded-xl font-mono text-xs flex items-center justify-between">
            <span>start.bat</span>
            <button
              onClick={() => copyToClipboard('start.bat', 's2')}
              className="text-neutral-500 hover:text-neutral-200 cursor-pointer"
            >
              {copied === 's2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Step 3: Stop */}
        <div className="bg-[#121212] p-6 rounded-2xl border border-[#262626] shadow-xs space-y-3">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold flex items-center justify-center text-sm">
            3
          </div>
          <h4 className="font-bold text-neutral-100 text-sm">Run stop.bat</h4>
          <p className="text-xs text-neutral-400">
            Cleanly terminates background Python and PHP tasks.
          </p>
          <div className="bg-[#171717] border border-[#262626] text-neutral-200 p-2.5 rounded-xl font-mono text-xs flex items-center justify-between">
            <span>stop.bat</span>
            <button
              onClick={() => copyToClipboard('stop.bat', 's3')}
              className="text-neutral-500 hover:text-neutral-200 cursor-pointer"
            >
              {copied === 's3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Troubleshooting "Windows cannot find php" */}
      <div className="bg-[#121212] p-6 rounded-2xl border border-amber-500/30 shadow-xs space-y-4">
        <h3 className="font-bold text-amber-400 text-base flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <span>Fix: 'Windows cannot find php' Error</span>
        </h3>
        <p className="text-xs text-neutral-300">
          If clicking <code className="text-amber-300">start.bat</code> shows <em>"Windows cannot find 'php'"</em>, choose one of these quick fixes:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-[#171717] rounded-xl border border-[#262626] space-y-2">
            <h5 className="font-bold text-neutral-100 flex items-center gap-1.5">
              <span>Option 1: Add XAMPP to PATH</span>
            </h5>
            <p className="text-neutral-400 leading-relaxed">
              If you have XAMPP installed at <code className="text-neutral-200">C:\xampp</code>:
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-neutral-400 text-[11px]">
              <li>Press <kbd className="px-1 py-0.5 bg-[#222] rounded text-neutral-200">Win + R</kbd>, type <code className="text-neutral-200">sysdm.cpl</code>, hit Enter.</li>
              <li>Go to <strong>Advanced</strong> &rarr; <strong>Environment Variables</strong>.</li>
              <li>Select <strong>Path</strong> &rarr; click <strong>Edit</strong> &rarr; <strong>New</strong>.</li>
              <li>Add <code className="text-emerald-400">C:\xampp\php</code> and click OK.</li>
            </ol>
          </div>

          <div className="p-4 bg-[#171717] rounded-xl border border-[#262626] space-y-2">
            <h5 className="font-bold text-neutral-100">Option 2: Run via Node.js React Portal</h5>
            <p className="text-neutral-400 leading-relaxed">
              If you prefer Node.js without installing PHP:
            </p>
            <div className="bg-[#0a0a0a] p-2 rounded-lg font-mono text-[11px] text-emerald-400 border border-[#222]">
              npm run dev
            </div>
            <p className="text-[11px] text-neutral-400">
              Open <code className="text-blue-400">http://localhost:3000</code> in your browser.
            </p>
          </div>

          <div className="p-4 bg-[#171717] rounded-xl border border-[#262626] space-y-2">
            <h5 className="font-bold text-neutral-100">Option 3: Copy to XAMPP htdocs</h5>
            <p className="text-neutral-400 leading-relaxed">
              Move this folder into:
            </p>
            <div className="bg-[#0a0a0a] p-2 rounded-lg font-mono text-[11px] text-amber-300 border border-[#222]">
              C:\xampp\htdocs\zkteco
            </div>
            <p className="text-[11px] text-neutral-400">
              Start Apache in XAMPP and open <code className="text-blue-400">http://localhost/zkteco/public/</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Checklist Card */}
      <div className="bg-[#121212] p-6 rounded-2xl border border-[#262626] shadow-xs space-y-4">
        <h3 className="font-bold text-neutral-100 text-base flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <span>Physical ZKTeco K40 Hardware Checklist</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-[#171717] rounded-xl border border-[#262626] space-y-2">
            <h5 className="font-bold text-neutral-200">1. Verify K40 Network Setup</h5>
            <p className="text-neutral-400 leading-relaxed">
              Connect your ZKTeco K40 machine to the local network router with an RJ45 Ethernet cable. On the physical device, press <strong className="text-neutral-200">Menu &rarr; Comm. &rarr; Ethernet</strong> to confirm its IP (e.g. <code className="text-neutral-300">192.168.1.201</code>).
            </p>
          </div>

          <div className="p-4 bg-[#171717] rounded-xl border border-[#262626] space-y-2">
            <h5 className="font-bold text-neutral-200">2. Verify Comm Key</h5>
            <p className="text-neutral-400 leading-relaxed">
              In K40 menu, go to <strong className="text-neutral-200">Menu &rarr; Comm. &rarr; Comm Key</strong>. If set to a custom number (e.g. <code className="text-neutral-300">123456</code>), enter that key in the Device Settings page. Default is <code className="text-neutral-300">0</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
