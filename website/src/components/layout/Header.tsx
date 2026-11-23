import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';

export const Header: React.FC = () => {
  const { currentPage, setCurrentPage, alerts, wifiRssi, latencyMs, toggleMobileMenu, showToast } = useTelemetry();
  const unreadAlerts = alerts.filter(a => !a.acknowledged).length;

  const pageTitles: Record<string, string> = {
    dashboard: 'Mission Overview',
    'live-monitoring': 'Live Optics & HUD',
    'fire-detection': 'Threat Triangulation',
    alerts: 'Alert Center',
    'reports-analytics': 'Reports & Logs',
    'device-information': 'Hardware Architecture',
    settings: 'System Settings'
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#EAE4D9] z-40 flex items-center justify-between px-3 sm:px-6 shadow-2xs select-none text-stone-800 transition-colors">
      {/* Brand & Mobile Hamburger */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          onClick={toggleMobileMenu}
          className="lg:hidden p-2 text-stone-600 hover:text-stone-900 rounded-xl hover:bg-[#F4EFE6] transition"
          aria-label="Toggle Navigation Menu"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>

        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white text-stone-900 flex items-center justify-center font-bold shadow-2xs shrink-0 border border-[#EAE4D9]">
          <span className="material-symbols-outlined text-xl sm:text-2xl text-stone-800">local_fire_department</span>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-900 tracking-tight text-sm sm:text-base">
              FireBot IoT
            </span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#F4EFE6] text-stone-700 border border-[#EAE4D9]">
              v2.4
            </span>
          </div>
          <span className="text-[11px] text-stone-500 font-medium flex items-center gap-1.5">
            <span className="hidden sm:inline">Autonomous Rover</span>
            <span className="hidden sm:inline text-stone-300">•</span>
            <span className="text-stone-600 font-mono truncate max-w-[140px] sm:max-w-none">
              {pageTitles[currentPage] || 'Telemetry'}
            </span>
          </span>
        </div>
      </div>

      {/* Real-time Status Badges */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Force Ping Quick Action */}
        <button
          onClick={() => showToast(`Ping OK · Latency: ${latencyMs}ms · ESP32-S3 Responding`)}
          className="hidden md:flex items-center gap-1.5 bg-white hover:bg-[#F4EFE6] text-stone-700 hover:text-stone-900 px-3 py-1.5 rounded-xl border border-[#EAE4D9] text-xs font-semibold transition shadow-2xs active:scale-[0.98]"
          title="Send heartbeat probe"
        >
          <span className="material-symbols-outlined text-base text-stone-500">sensors</span>
          <span>Probe Link</span>
        </button>

        {/* Vehicle Online status */}
        <div className="flex items-center gap-2 bg-[#F4EFE6] px-2.5 sm:px-3.5 py-1.5 rounded-full border border-[#EAE4D9]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-stone-600 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-stone-700"></span>
          </span>
          <span className="text-xs text-stone-600 font-medium hidden sm:inline">Vehicle Online</span>
          <span className="text-xs text-stone-800 font-mono font-bold">{latencyMs}ms</span>
        </div>

        {/* WiFi signal */}
        <div className="hidden sm:flex items-center gap-1.5 text-stone-700 bg-[#F4EFE6] px-3 py-1.5 rounded-full border border-[#EAE4D9]">
          <span className="material-symbols-outlined text-base text-stone-500">wifi</span>
          <span className="text-xs font-mono font-semibold">{wifiRssi} dBm</span>
        </div>

        {/* Notifications Button */}
        <button
          onClick={() => setCurrentPage('alerts')}
          aria-label="Notifications"
          className="p-2 text-stone-600 hover:text-stone-900 rounded-xl hover:bg-[#F4EFE6] transition relative"
          type="button"
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
          {unreadAlerts > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold shadow-xs">
              {unreadAlerts}
            </span>
          )}
        </button>

        {/* User Operator Profile */}
        <div
          onClick={() => setCurrentPage('settings')}
          className="flex items-center gap-2.5 bg-white hover:bg-[#F4EFE6] border border-[#EAE4D9] pl-1.5 pr-3 py-1 rounded-full cursor-pointer transition select-none shadow-2xs"
        >
          <div className="w-7 h-7 rounded-full bg-[#F4EFE6] text-stone-800 border border-[#EAE4D9] flex items-center justify-center text-xs font-bold">
            OP
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-stone-800 leading-tight">Command Operator</span>
            <span className="text-[10px] text-stone-500 font-mono leading-tight">Station Alpha</span>
          </div>
        </div>
      </div>
    </header>
  );
};
