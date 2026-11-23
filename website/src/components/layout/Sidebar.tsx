import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { NavPage } from '../../types/telemetry';

interface NavSection {
  title: string;
  items: {
    id: NavPage;
    label: string;
    icon: string;
    badge?: number;
    description?: string;
  }[];
}

export const Sidebar: React.FC = () => {
  const {
    currentPage,
    setCurrentPage,
    alerts,
    batteryLevel,
    batteryVoltage,
    pumpActive,
    emergencyStop,
    vehicleMode,
    latencyMs,
    wifiRssi,
    isMobileMenuOpen,
    setIsMobileMenuOpen
  } = useTelemetry();

  const unreadAlerts = alerts.filter(a => !a.acknowledged).length;

  const navSections: NavSection[] = [
    {
      title: 'MISSION OPERATIONS',
      items: [
        { id: 'dashboard', label: 'System Overview', icon: 'dashboard', description: 'Multisensor telemetry' },
        { id: 'live-monitoring', label: 'Live Optics & HUD', icon: 'videocam', description: 'OV2640 feed & radar' },
        { id: 'fire-detection', label: 'Flame Detection', icon: 'local_fire_department', description: '180° IR photodiode array' },
      ]
    },
    {
      title: 'FLEET & DIAGNOSTICS',
      items: [
        { id: 'alerts', label: 'Alert Center', icon: 'notifications_active', badge: unreadAlerts, description: 'Fault triggers & logs' },
        { id: 'reports-analytics', label: 'Suppression Logs', icon: 'analytics', description: 'Historical analytics' },
        { id: 'device-information', label: 'Hardware Specs', icon: 'memory', description: 'ESP32-S3 architecture' },
        { id: 'settings', label: 'System Settings', icon: 'tune', description: 'Thresholds & calibration' },
      ]
    }
  ];

  const handleNavClick = (id: NavPage) => {
    setCurrentPage(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-neutral-900/30 backdrop-blur-xs z-45 lg:hidden transition-opacity"
        />
      )}

      {/* Modern Sleek Light Sidebar */}
      <aside
        className={`fixed left-0 top-16 bottom-0 w-64 bg-[#FAF7F2] border-r border-[#EAE4D9] z-50 flex flex-col justify-between overflow-y-auto shadow-sm transition-transform duration-300 ease-in-out select-none text-stone-800 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Navigation Groups */}
        <div className="p-3.5 sm:p-4 space-y-6">
          {navSections.map(section => (
            <div key={section.title}>
              {/* Section Header */}
              <div className="px-3 mb-2 flex items-center justify-between text-[11px] font-mono font-semibold tracking-wider uppercase text-stone-400">
                <span>{section.title}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
              </div>

              {/* Section Nav Items */}
              <nav className="flex flex-col gap-1">
                {section.items.map(item => {
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm transition-all duration-150 text-left relative group cursor-pointer ${
                        isActive
                          ? 'bg-white text-stone-900 font-bold border border-[#EAE4D9] shadow-2xs'
                          : 'text-stone-600 hover:bg-[#F4EFE6] hover:text-stone-900 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Icon */}
                        <span
                          className={`material-symbols-outlined text-lg sm:text-xl transition-transform shrink-0 ${
                            isActive
                              ? 'text-stone-900 font-bold'
                              : 'text-stone-400 group-hover:text-stone-600'
                          }`}
                        >
                          {item.icon}
                        </span>

                        {/* Title & Micro description */}
                        <div className="flex flex-col truncate">
                          <span className="truncate leading-tight">{item.label}</span>
                          {item.description && (
                            <span
                              className={`text-[10px] font-normal truncate mt-0.5 ${
                                isActive ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-500'
                              }`}
                            >
                              {item.description}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Indicator / Badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-600 text-white shadow-xs">
                            {item.badge}
                          </span>
                        )}

                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-800 shadow-xs" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Bottom Integrated Hardware Telemetry Dock */}
        <div className="border-t border-[#EAE4D9] bg-[#F4EFE6]/70 p-3.5 sm:p-4 text-xs select-none">
          {/* Header Status */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-stone-600 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-stone-700"></span>
              </span>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-700">
                ESP32-S3 ONLINE
              </span>
            </div>
            <span className="text-[10px] font-mono text-stone-500 font-semibold">{latencyMs}ms</span>
          </div>

          {/* Battery Level Progress */}
          <div className="space-y-1.5 mb-3 bg-white p-2.5 rounded-xl border border-[#EAE4D9] shadow-2xs">
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 text-stone-600 font-medium">
                <span className="material-symbols-outlined text-sm text-stone-500">battery_charging_full</span>
                <span>3S LiPo Power</span>
              </span>
              <span className="font-mono font-bold text-stone-800">
                {batteryLevel}% <span className="text-stone-400 text-[10px] font-normal">({batteryVoltage}V)</span>
              </span>
            </div>

            <div className="w-full bg-[#FAF7F2] h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  batteryLevel < 25 ? 'bg-red-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${batteryLevel}%` }}
              />
            </div>
          </div>

          {/* Rover State Matrix */}
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            {/* Drive Mode */}
            <div className="bg-white p-2 rounded-lg border border-[#EAE4D9] shadow-2xs flex flex-col">
              <span className="text-stone-400 text-[9px] uppercase font-sans font-bold">Drive Mode</span>
              <span className="font-bold text-stone-800 uppercase truncate mt-0.5">
                {vehicleMode === 'auto' ? 'Autonomous' : 'Manual'}
              </span>
            </div>

            {/* Pump Relay */}
            <div className="bg-white p-2 rounded-lg border border-[#EAE4D9] shadow-2xs flex flex-col">
              <span className="text-stone-400 text-[9px] uppercase font-sans font-bold">Pump Valve</span>
              <span
                className={`font-bold uppercase truncate mt-0.5 ${
                  pumpActive ? 'text-red-600 animate-pulse' : 'text-stone-600'
                }`}
              >
                {pumpActive ? 'DISCHARGE' : 'STANDBY'}
              </span>
            </div>
          </div>

          {/* Radio Signal & E-Stop status */}
          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-[#EAE4D9] text-[10px] text-stone-500 font-mono">
            <span>Wi-Fi RSSI: {wifiRssi} dBm</span>
            <span className={`font-bold ${emergencyStop ? 'text-red-600' : 'text-stone-600'}`}>
              {emergencyStop ? 'E-STOP ARMED' : 'FAILSAFE OK'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
