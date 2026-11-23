import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';

export const Toast: React.FC = () => {
  const { toastMessage } = useTelemetry();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-black text-white px-4 py-3 rounded-xl shadow-xl border border-neutral-800 animate-bounce">
      <span className="material-symbols-outlined text-white text-xl">info</span>
      <span className="text-sm font-medium">{toastMessage}</span>
    </div>
  );
};
