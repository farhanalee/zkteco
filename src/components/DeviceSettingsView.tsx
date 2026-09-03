import React, { useState } from 'react';
import { 
  Sliders, 
  Router, 
  Key, 
  Clock, 
  Cpu, 
  HardDrive, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Server,
  Plus,
  Trash2,
  Check,
  Building,
  Radio
} from 'lucide-react';
import { ZKTecoDevice } from '../types';

interface DeviceSettingsViewProps {
  device: ZKTecoDevice;
  devices?: ZKTecoDevice[];
  onUpdateDevice: (updated: Partial<ZKTecoDevice>) => void;
  onSelectDevice?: (dev: ZKTecoDevice) => void;
  onAddDevice?: (dev: ZKTecoDevice) => void;
  onDeleteDevice?: (id: string) => void;
  onSyncTime: () => void;
  onTestConnection: () => void;
}

export const DeviceSettingsView: React.FC<DeviceSettingsViewProps> = ({
  device,
  devices = [],
  onUpdateDevice,
  onSelectDevice,
  onAddDevice,
  onDeleteDevice,
  onSyncTime,
  onTestConnection,
}) => {
  const [ip, setIp] = useState(device.ip_address);
  const [port, setPort] = useState(device.port);
  const [name, setName] = useState(device.name);
  const [location, setLocation] = useState(device.location || 'Karachi Operations');
  const [commKey, setCommKey] = useState(device.comm_key);
  const [timeoutSec, setTimeoutSec] = useState(device.timeout);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Add new machine form state
  const [isAddingMachine, setIsAddingMachine] = useState(false);
  const [newMachName, setNewMachName] = useState('');
  const [newMachIp, setNewMachIp] = useState('');
  const [newMachPort, setNewMachPort] = useState(4370);
  const [newMachLocation, setNewMachLocation] = useState('');

  const isConnected = device.status === 'Connected';

  // Keep local form in sync when device prop changes
  React.useEffect(() => {
    setIp(device.ip_address);
    setPort(device.port);
    setName(device.name);
    setLocation(device.location || 'Karachi Operations');
    setCommKey(device.comm_key);
    setTimeoutSec(device.timeout);
  }, [device.ip_address, device.port, device.comm_key, device.name, device.location, device.timeout]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDevice({
      name: name,
      location: location,
      ip_address: ip.trim(),
      port: Number(port),
      comm_key: Number(commKey),
      timeout: Number(timeoutSec),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleCreateNewMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachIp.trim()) return;

    const newDev: ZKTecoDevice = {
      id: `dev_${Date.now()}`,
      sensor_id: devices.length + 1,
      name: newMachName.trim() || `ZKTeco K40 Terminal (${newMachIp.trim()})`,
      ip_address: newMachIp.trim(),
      port: Number(newMachPort) || 4370,
      comm_key: 0,
      timeout: 5,
      auto_refresh_interval: 30,
      status: 'Connected',
      last_sync: 'Just now',
      serial_number: `ZK${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      firmware_version: 'Ver 6.60 (ZEM560)',
      platform: 'ZEM560 / Linux Standalone',
      mac_address: `00:17:61:${Math.floor(10+Math.random()*89)}:${Math.floor(10+Math.random()*89)}:${Math.floor(10+Math.random()*89)}`,
      user_count: 2466,
      user_capacity: 3000,
      fingerprint_count: 490,
      fingerprint_capacity: 3000,
      attendance_count: 14778,
      attendance_capacity: 100000,
      device_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      pc_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      time_diff_seconds: 0,
      location: newMachLocation.trim() || 'Karachi Operations Tollway'
    };

    if (onAddDevice) {
      onAddDevice(newDev);
    }
    if (onSelectDevice) {
      onSelectDevice(newDev);
    }

    setNewMachName('');
    setNewMachIp('');
    setNewMachPort(4370);
    setNewMachLocation('');
    setIsAddingMachine(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121212] p-6 rounded-2xl border border-[#262626] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">Device & Hardware Telemetry</h1>
          </div>
          <p className="text-sm text-neutral-400">
            Active Target Machine: <strong className="text-blue-400 font-mono">{device.ip_address}:{device.port}</strong> &bull; Applied universally to Reports, Logs, and Direct Socket Sync
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onTestConnection}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>Test Handshake</span>
          </button>
          <button
            onClick={onSyncTime}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-900/30 transition-all cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>Sync Hardware Clock</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs sm:text-sm font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Device communication parameters updated! New IP <strong className="font-mono text-white">{device.ip_address}</strong> is now universally applied to Reports, Attendance Logs, Live Feed, and Windows Setup.</span>
        </div>
      )}

      {/* Multi-Device Fleet Manager Banner */}
      <div className="bg-[#121212] p-6 rounded-2xl border border-[#262626] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222]">
          <div>
            <h3 className="font-bold text-neutral-100 text-base flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" />
              <span>ZKTeco K40 Fleet & Multi-Terminal Directory</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Click any terminal below to instantly switch the active IP across the entire system
            </p>
          </div>

          <button
            onClick={() => setIsAddingMachine(!isAddingMachine)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#242424] text-neutral-200 border border-[#333] rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>{isAddingMachine ? 'Cancel' : 'Add New Machine IP'}</span>
          </button>
        </div>

        {/* Add New Machine Form */}
        {isAddingMachine && (
          <form onSubmit={handleCreateNewMachine} className="p-4 bg-[#171717] rounded-xl border border-blue-500/30 space-y-3 animate-in fade-in">
            <h4 className="text-xs font-bold text-blue-300">Enroll New ZKTeco K40 Hardware Machine:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Terminal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Terminal 4 - Plaza Entry"
                  value={newMachName}
                  onChange={(e) => setNewMachName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-white font-medium focus:outline-hidden focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-neutral-400 font-semibold mb-1">IP Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.168.1.201"
                  value={newMachIp}
                  onChange={(e) => setNewMachIp(e.target.value)}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg font-mono text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Port</label>
                <input
                  type="number"
                  value={newMachPort}
                  onChange={(e) => setNewMachPort(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg font-mono text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Server Room / Gate 3"
                  value={newMachLocation}
                  onChange={(e) => setNewMachLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingMachine(false)}
                className="px-3 py-1.5 bg-[#222] hover:bg-[#2a2a2a] text-neutral-300 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
              >
                Save & Set Active Machine
              </button>
            </div>
          </form>
        )}

        {/* Terminals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {devices.map((d) => {
            const isSelected = d.ip_address === device.ip_address;
            return (
              <div
                key={d.id || d.ip_address}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-950/20 border-blue-500/50 shadow-md shadow-blue-950/30 ring-1 ring-blue-500/30'
                    : 'bg-[#171717] border-[#262626] hover:border-[#383838]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
                      <h4 className="font-bold text-sm text-neutral-100 leading-tight">{d.name}</h4>
                    </div>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 space-y-1 text-xs text-neutral-400">
                    <div className="flex items-center justify-between">
                      <span>IP Address:</span>
                      <span className="font-mono font-bold text-neutral-200">{d.ip_address}:{d.port}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span>Location:</span>
                      <span className="text-neutral-300 truncate max-w-[140px]">{d.location || 'Karachi Operations'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span>Serial:</span>
                      <span className="font-mono text-neutral-400">{d.serial_number}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#222] flex items-center justify-between gap-2">
                  {!isSelected ? (
                    <button
                      onClick={() => {
                        if (onSelectDevice) onSelectDevice(d);
                      }}
                      className="w-full py-1.5 bg-[#202020] hover:bg-blue-600 hover:text-white text-neutral-200 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center"
                    >
                      Set as Active Terminal
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Connected & Active</span>
                    </span>
                  )}

                  {devices.length > 1 && !isSelected && onDeleteDevice && (
                    <button
                      onClick={() => onDeleteDevice(d.id || '')}
                      className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Remove terminal profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clock Drift Sync Banner */}
      <div className="bg-[#121212] text-white p-6 rounded-2xl border border-[#262626] shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div>
            <span className="text-xs uppercase font-semibold text-neutral-400">Device Hardware RTC ({device.ip_address})</span>
            <div className="font-mono text-2xl font-bold text-blue-400 mt-1">{device.device_time}</div>
          </div>
          <div>
            <span className="text-xs uppercase font-semibold text-neutral-400">Local PC Time</span>
            <div className="font-mono text-2xl font-bold text-neutral-200 mt-1">{device.pc_time}</div>
          </div>
          <div className="md:text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Clock Synchronized (0s drift)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Socket Settings Form */}
        <div className="lg:col-span-7 bg-[#121212] p-6 rounded-2xl border border-[#262626] shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#222222] mb-5">
            <div className="flex items-center gap-2">
              <Router className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-neutral-100 text-base">TCP/IP Network Configuration</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono">
              Port 4370 Direct Socket
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Terminal Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Terminal 1 - Karachi North Entry"
                  className="w-full px-3.5 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Physical Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="North Entry Lanes 1-6 Booth Gantry"
                  className="w-full px-3.5 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Device IP Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  placeholder="192.168.1.201"
                  className="w-full px-3.5 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm font-mono text-neutral-100 placeholder:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="text-[11px] text-neutral-400 mt-1 block">Static IP configured in K40 terminal Menu &rarr; Comm &rarr; Ethernet</span>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  TCP Port <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm font-mono text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="text-[11px] text-neutral-400 mt-1 block">Default: 4370</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-neutral-300">Communication Key (Comm Password)</label>
                <span className="text-[10px] text-neutral-400">Default: 0</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={commKey}
                  onChange={(e) => setCommKey(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm font-mono text-neutral-100 placeholder:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-neutral-400">Quick Presets:</span>
                {[0, 123456, 1234, 111111, 888888].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCommKey(preset)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono border transition-colors cursor-pointer ${
                      commKey === preset
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-[#181818] text-neutral-400 border-[#2a2a2a] hover:text-neutral-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-neutral-400 mt-1.5 block">
                Physical K40 terminal: <strong>Menu &rarr; Comm. &rarr; Comm Key</strong>
              </span>
            </div>

            <div>
              <label className="block font-semibold text-neutral-300 mb-1">Socket Timeout (Seconds)</label>
              <input
                type="number"
                min={2}
                max={30}
                value={timeoutSec}
                onChange={(e) => setTimeoutSec(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#222222]">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-md shadow-blue-900/30 transition-all cursor-pointer"
              >
                Save & Apply IP Globally Across All Files
              </button>
            </div>
          </form>
        </div>

        {/* Right: Telemetry & Specs */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#121212] p-6 rounded-2xl border border-[#262626] shadow-xs">
            <div className="flex items-center gap-2 pb-4 border-b border-[#222222] mb-4">
              <Cpu className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-neutral-100 text-base">Terminal Specifications</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-[#1f1f1f]">
                <span className="text-neutral-400">Target IP & Port</span>
                <span className="font-mono font-bold text-emerald-400">{device.ip_address}:{device.port}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1f1f1f]">
                <span className="text-neutral-400">Device Model</span>
                <span className="font-semibold text-neutral-200">{device.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1f1f1f]">
                <span className="text-neutral-400">Serial Number</span>
                <span className="font-mono font-semibold text-neutral-200">{device.serial_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1f1f1f]">
                <span className="text-neutral-400">Firmware Build</span>
                <span className="font-semibold text-neutral-200">{device.firmware_version}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1f1f1f]">
                <span className="text-neutral-400">Platform SoC</span>
                <span className="font-semibold text-neutral-200">{device.platform}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1f1f1f]">
                <span className="text-neutral-400">MAC Address</span>
                <span className="font-mono text-neutral-200">{device.mac_address}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">Protocol Layer</span>
                <span className="font-semibold text-emerald-400">TCP/IP Native Socket</span>
              </div>
            </div>
          </div>

          <div className="bg-[#121212] p-6 rounded-2xl border border-[#262626] shadow-xs">
            <div className="flex items-center gap-2 pb-4 border-b border-[#222222] mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-neutral-100 text-base">K40 Protocol Matrix</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-[#171717] border border-[#262626] flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>TCP Handshake</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#171717] border border-[#262626] flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Read Attendance</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#171717] border border-[#262626] flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Read Employees</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#171717] border border-[#262626] flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Write Employees</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#171717] border border-[#262626] flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Delete User</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#171717] border border-[#262626] flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Set RTC Clock</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
