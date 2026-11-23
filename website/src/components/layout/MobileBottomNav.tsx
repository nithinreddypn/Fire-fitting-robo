import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { NavPage } from '../../types/telemetry';

export const MobileBottomNav: React.FC = () => {
  const { currentPage, setCurrentPage, alerts, toggleMobileMenu } = useTelemetry();
  const unreadAlerts = alerts.filter(a => !a.acknowledged).length;

  const quickNav: { id: NavPage; label: string; icon: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Overview', icon: 'dashboard' },
    { id: 'live-monitoring', label: 'Optics', icon: 'videocam' },
    { id: 'fire-detection', label: 'Detection', icon: 'local_fire_department' },
    { id: 'alerts', label: 'Alerts', icon: 'notifications', badge: unreadAlerts },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#FAF7F2]/95 backdrop-blur-md border-t border-[#EAE4D9] z-50 flex items-center justify-around px-2 shadow-lg text-stone-900 select-none">
      {quickNav.map(item => {
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-colors ${
              isActive ? 'text-stone-900 font-bold' : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <div className="relative">
              <span className="material-symbols-outlined text-2xl">{item.icon}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
            {isActive && (
              <span className="absolute bottom-0 w-8 h-1 bg-stone-900 rounded-full"></span>
            )}
          </button>
        );
      })}

      {/* Drawer Toggle */}
      <button
        onClick={toggleMobileMenu}
        className="flex flex-col items-center justify-center flex-1 py-1 text-stone-400 hover:text-stone-600 transition-colors"
      >
        <span className="material-symbols-outlined text-2xl">menu</span>
        <span className="text-[10px] tracking-tight mt-0.5">More</span>
      </button>
    </div>
  );
};
