import React, { useState } from 'react';
import { 
  Fingerprint, 
  LayoutDashboard, 
  Users, 
  Clock, 
  Radio, 
  FileText, 
  Sliders, 
  CalendarClock, 
  Terminal, 
  CheckCircle2, 
  AlertCircle,
  Download,
  Database,
  ChevronDown,
  Plus,
  Server,
  HardDrive
} from 'lucide-react';
import { ZKTecoDevice } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  device: ZKTecoDevice;
  devices?: ZKTecoDevice[];
  onSelectDevice?: (dev: ZKTecoDevice) => void;
  onQuickAddIp?: (ip: string) => void;
  onSyncTime: () => void;
  onTestConnection: () => void;
  onOpenDownloadModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  device,
  devices = [],
  onSelectDevice,
  onQuickAddIp,
  onSyncTime,
  onTestConnection,
  onOpenDownloadModal,
}) => {
  const isConnected = device.status === 'Connected';
  const [isTerminalDropdownOpen, setIsTerminalDropdownOpen] = useState(false);
  const [quickNewIp, setQuickNewIp] = useState('');
  const [showAddIpInput, setShowAddIpInput] = useState(false);

  const handleApplyQuickIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNewIp.trim()) return;
    if (onQuickAddIp) {
      onQuickAddIp(quickNewIp.trim());
    }
    setQuickNewIp('');
    setShowAddIpInput(false);
    setIsTerminalDropdownOpen(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live', label: 'Live Stream', icon: Radio, badge: 'Live' },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'records', label: 'Attendance Logs', icon: Clock },
    { id: 'reports', label: 'Reports & PDF', icon: FileText },
    { id: 'shifts', label: 'Shifts & Org', icon: CalendarClock },
    { id: 'device', label: 'Device & Hardware', icon: Sliders },
    { id: 'setup', label: 'Windows Setup', icon: Terminal },
  ];

  return (
    <header className="bg-[#0a0a0a]/95 backdrop-blur-md border-b border-[#262626] sticky top-0 z-50 text-neutral-100 select-none">
      {/* Top Telemetry Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between text-xs border-b border-[#1f1f1f] gap-2">
        <div className="flex items-center gap-3 relative">
          {/* Quick Terminal Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsTerminalDropdownOpen(!isTerminalDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] border border-[#2b2b2b] text-neutral-200 transition-colors cursor-pointer"
              title="Click to switch or enter another ZKTeco K40 IP"
            >
              <Server className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-neutral-400">Target IP:</span>
              <span className="font-mono font-bold text-blue-300">{device.ip_address}:{device.port}</span>
              <ChevronDown className="w-3 h-3 text-neutral-500" />
            </button>

            {isTerminalDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-72 bg-[#121212] border border-[#333333] rounded-xl shadow-2xl p-2.5 z-50 text-xs space-y-2 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-1.5 py-1 text-[11px] font-bold text-neutral-400 border-b border-[#222]">
                  <span>SWITCH ACTIVE K40 MACHINE</span>
                  <span className="text-emerald-400 font-mono">Port 4370</span>
                </div>

                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {devices.map((d) => {
                    const isSelected = d.ip_address === device.ip_address;
                    return (
                      <button
                        key={d.id || d.ip_address}
                        onClick={() => {
                          if (onSelectDevice) onSelectDevice(d);
                          setIsTerminalDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-lg transition-all flex items-center justify-between cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-600/20 border border-blue-500/40 text-blue-200' 
                            : 'hover:bg-[#1a1a1a] text-neutral-300'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-semibold truncate text-[11px]">{d.name}</div>
                          <div className="font-mono text-[10px] text-neutral-400">{d.ip_address}:{d.port}</div>
                        </div>
                        {isSelected && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500 text-white shrink-0">ACTIVE</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Quick Add Custom IP */}
                <div className="pt-2 border-t border-[#222]">
                  {!showAddIpInput ? (
                    <button
                      onClick={() => setShowAddIpInput(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#181818] hover:bg-[#222] text-neutral-200 rounded-lg text-[11px] font-semibold border border-[#2a2a2a] cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-400" />
                      <span>Enter Custom K40 IP Address</span>
                    </button>
                  ) : (
                    <form onSubmit={handleApplyQuickIp} className="space-y-1.5">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          autoFocus
                          placeholder="e.g. 192.168.1.201"
                          value={quickNewIp}
                          onChange={(e) => setQuickNewIp(e.target.value)}
                          className="flex-1 px-2 py-1 bg-[#181818] border border-blue-500/50 rounded-lg text-xs font-mono text-white placeholder:text-neutral-600 focus:outline-hidden"
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs cursor-pointer"
                        >
                          Connect
                        </button>
                      </div>
                      <span className="text-[10px] text-neutral-500 block">Applies immediately to reports, logs & telemetry.</span>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>

          <span className="text-[#333333]">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500">Comm Key:</span>
            <span className="font-mono text-neutral-300">{device.comm_key === 0 ? 'Default (0)' : 'Encrypted Key'}</span>
          </div>
          <span className="text-[#333333] hidden sm:inline">|</span>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-neutral-500">Local PC Storage:</span>
            <span className="text-emerald-400 font-medium">Auto-Persisted (Browser & MDB)</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenDownloadModal && (
            <button
              onClick={onOpenDownloadModal}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-sm shadow-blue-900/40 cursor-pointer text-xs"
              title="Download & sync attendance logs from machine or import USB"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Logs</span>
            </button>
          )}

          <button
            onClick={onTestConnection}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#181818] hover:bg-[#222222] border border-[#2e2e2e] text-neutral-300 transition-colors cursor-pointer"
            title="Test TCP/IP Handshake with K40"
          >
            {isConnected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className={isConnected ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {isConnected ? 'K40 Connected' : 'Offline / Reconnect'}
            </span>
          </button>

          <button
            onClick={onSyncTime}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#181818] hover:bg-[#222222] border border-[#2e2e2e] text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            title="Sync device real-time clock with PC"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-[11px] text-neutral-200">{device.device_time.split(' ')[1] || '08:00:00'}</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/90 border border-blue-400/30 flex items-center justify-center shadow-lg shadow-blue-500/10">
              <Fingerprint className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">ZKTeco K40</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-md">
                  TCP/IP Terminal
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">Standalone Biometric Attendance System</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all relative cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 font-semibold'
                      : 'text-neutral-400 hover:bg-[#181818] hover:text-neutral-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-2 right-2"></span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Navigation Row */}
      <div className="md:hidden flex items-center gap-1 px-4 py-2 bg-[#080808] overflow-x-auto border-t border-[#262626]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium cursor-pointer ${
                isActive ? 'bg-blue-600 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
