import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Play, 
  Pause, 
  Volume2, 
  Fingerprint, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  Sparkles, 
  ShieldCheck 
} from 'lucide-react';
import { AttendanceRecord, Employee, ZKTecoDevice } from '../types';

interface LiveFeedViewProps {
  device: ZKTecoDevice;
  employees: Employee[];
  attendance: AttendanceRecord[];
  onAddPunch: (punch: AttendanceRecord) => void;
}

export const LiveFeedView: React.FC<LiveFeedViewProps> = ({
  device,
  employees,
  attendance,
  onAddPunch,
}) => {
  const [isPolling, setIsPolling] = useState(true);
  const [intervalMs, setIntervalMs] = useState(4000);
  const [lastPollTime, setLastPollTime] = useState<string>('Live active');
  const [latestPunch, setLatestPunch] = useState<AttendanceRecord | null>(attendance[0] || null);

  const empMap = new Map<string, string>();
  employees.forEach((e) => empMap.set(e.user_id, e.name));

  // Web Audio chime
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // AudioContext unavailable or blocked by browser policy
    }
  };

  // Simulate punch trigger
  const triggerSimulatedPunch = (userId?: string) => {
    const emp = userId 
      ? employees.find((e) => e.user_id === userId) 
      : employees[Math.floor(Math.random() * employees.length)];

    if (!emp) return;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const dateStr = now.toISOString().split('T')[0];
    const isOut = Math.random() > 0.5;

    const newPunch: AttendanceRecord = {
      id: 'punch_' + Date.now(),
      user_id: emp.user_id,
      name: emp.name,
      timestamp: `${dateStr} ${timeStr}`,
      date: dateStr,
      time: timeStr,
      status: isOut ? 'Check-Out' : 'Check-In',
      verification_type: 'Fingerprint',
      device_ip: device.ip_address,
    };

    onAddPunch(newPunch);
    setLatestPunch(newPunch);
    playBeep();
  };

  useEffect(() => {
    if (!isPolling) return;

    const timer = setInterval(() => {
      setLastPollTime(new Date().toLocaleTimeString());
      // Randomly simulate an incoming punch every ~20s if polling is running
      if (Math.random() < 0.2 && employees.length > 0) {
        triggerSimulatedPunch();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPolling, intervalMs, employees]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayPunches = attendance.filter((a) => a.date === todayStr);

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121212] p-6 rounded-2xl border border-[#262626] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-5 h-5 text-rose-500 animate-pulse" />
            <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">Live Attendance Stream</h1>
          </div>
          <p className="text-sm text-neutral-400">
            Real-time biometric punch stream directly from ZKTeco K40 &bull; Auto-refreshes continuously
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#1c1c1c] border border-[#2e2e2e] px-3 py-1.5 rounded-xl text-xs">
            <span className="text-neutral-500 font-medium">Interval:</span>
            <select
              value={intervalMs}
              onChange={(e) => setIntervalMs(Number(e.target.value))}
              className="bg-transparent font-semibold text-neutral-200 outline-hidden cursor-pointer"
            >
              <option value={2000} className="bg-[#1a1a1a] text-neutral-200">Every 2s</option>
              <option value={4000} className="bg-[#1a1a1a] text-neutral-200">Every 4s</option>
              <option value={10000} className="bg-[#1a1a1a] text-neutral-200">Every 10s</option>
              <option value={30000} className="bg-[#1a1a1a] text-neutral-200">Every 30s</option>
            </select>
          </div>

          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              isPolling
                ? 'bg-[#1f1f1f] hover:bg-[#2c2c2c] text-neutral-200 border border-[#333333]'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30'
            }`}
          >
            {isPolling ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPolling ? 'Pause Stream' : 'Resume Stream'}</span>
          </button>

          <button
            onClick={playBeep}
            className="p-2.5 bg-[#1c1c1c] hover:bg-[#282828] text-neutral-300 border border-[#303030] rounded-xl transition-colors cursor-pointer"
            title="Test Audio Chime"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => triggerSimulatedPunch()}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            title="Simulate finger placed on K40 hardware scanner"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Test Finger Punch</span>
          </button>
        </div>
      </div>

      {/* Hero Highlight Card: Latest Punch */}
      <div className="bg-gradient-to-br from-[#121628] via-[#101826] to-[#0c121e] rounded-2xl p-6 text-white border border-blue-900/40 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold uppercase tracking-wider text-blue-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Latest Biometric Punch
            </div>

            <div className="flex items-center gap-4 pt-1">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 backdrop-blur-xs flex items-center justify-center border border-blue-500/20 shadow-inner">
                <UserCheck className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight text-white">
                  {latestPunch ? (empMap.get(latestPunch.user_id) || latestPunch.name || `EMP-${latestPunch.user_id}`) : 'Waiting for Punch...'}
                </h2>
                <div className="flex items-center gap-3 text-sm text-neutral-400 font-mono mt-1">
                  <span className="text-neutral-300 font-medium">EMP-{latestPunch?.user_id || '----'}</span>
                  <span className="text-neutral-600">&bull;</span>
                  <span className="flex items-center gap-1 text-neutral-300">
                    <Fingerprint className="w-4 h-4 text-emerald-400" />
                    {latestPunch?.verification_type || 'Biometric Scanner'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-left md:text-right border-t md:border-t-0 border-neutral-800/80 pt-4 md:pt-0">
            <div className="font-mono text-4xl font-extrabold tracking-tight text-blue-400 mb-2">
              {latestPunch?.time || '--:--:--'}
            </div>
            <span
              className={`inline-block px-4 py-1.5 rounded-xl text-sm font-bold shadow-xs ${
                latestPunch?.status === 'Check-In'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
              }`}
            >
              {latestPunch?.status || 'Active Waiting'}
            </span>
          </div>
        </div>
      </div>

      {/* Stream Feed Table */}
      <div className="bg-[#121212] rounded-2xl border border-[#262626] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#222222] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-neutral-100 text-sm">
              Today's Live Punch Log ({todayPunches.length} punches)
            </h3>
          </div>
          <span className="text-xs font-mono text-neutral-400 bg-[#1c1c1c] border border-[#2e2e2e] px-3 py-1 rounded-lg">
            Last polled: {lastPollTime}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#181818] text-neutral-400 font-semibold border-b border-[#262626]">
              <tr>
                <th className="py-3.5 px-4">Punch Time</th>
                <th className="py-3.5 px-4">Employee ID</th>
                <th className="py-3.5 px-4">Full Name</th>
                <th className="py-3.5 px-4">Attendance State</th>
                <th className="py-3.5 px-4">Verification</th>
                <th className="py-3.5 px-4">Terminal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f] font-medium">
              {todayPunches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-neutral-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No biometric punches registered on K40 today.</p>
                    <p className="text-xs text-neutral-500 mt-1">Place finger on scanner or click "Test Finger Punch".</p>
                  </td>
                </tr>
              ) : (
                todayPunches.map((punch) => {
                  const empName = empMap.get(punch.user_id) || punch.name || `EMP-${punch.user_id}`;
                  const isCheckIn = punch.status === 'Check-In';
                  return (
                    <tr key={punch.id} className="hover:bg-[#181818]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-400">{punch.time}</td>
                      <td className="py-3.5 px-4 font-mono text-neutral-300">EMP-{punch.user_id}</td>
                      <td className="py-3.5 px-4 font-semibold text-neutral-100">{empName}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            isCheckIn
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}
                        >
                          {punch.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-400">
                        <span className="flex items-center gap-1.5">
                          <Fingerprint className="w-4 h-4 text-emerald-400" />
                          {punch.verification_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-500 font-mono text-[11px]">
                        ZKTeco K40 ({device.ip_address})
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
