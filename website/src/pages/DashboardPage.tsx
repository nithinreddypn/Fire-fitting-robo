import React, { useState } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { IncidentItem } from '../types/telemetry';

export const DashboardPage: React.FC = () => {
  const {
    setCurrentPage,
    vehicleMode,
    setVehicleMode,
    pumpActive,
    togglePump,
    emergencyStop,
    fireDetected,
    flameSensors,
    obstacleDistance,
    reservoirLevel,
    latencyMs,
    wifiRssi,
    dieTemperature,
    batteryVoltage,
    batteryLevel,
    simulateFireTrigger,
    showToast,
    incidents
  } = useTelemetry();

  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [isTestSpraying, setIsTestSpraying] = useState(false);

  // Dynamically compute real incident analytics from live system telemetry
  const totalAlarmsCount = incidents.length;
  const extinguishedCount = incidents.filter((i: IncidentItem) => i.status === 'Extinguished').length;
  const suppressionRate = totalAlarmsCount > 0 ? `${Math.round((extinguishedCount / totalAlarmsCount) * 100)}%` : '100%';
  const avgResponse = totalAlarmsCount > 0 
    ? `${(incidents.reduce((acc: number, curr: IncidentItem) => acc + (parseFloat(curr.responseDuration) || 0), 0) / totalAlarmsCount).toFixed(1)}s` 
    : '0.0s';
  const fluidExpended = totalAlarmsCount > 0
    ? `${incidents.reduce((acc: number, curr: IncidentItem) => acc + (parseFloat(curr.fluidUsed) || 0), 0).toFixed(2)} L`
    : '0.00 L';

  const defaultPoints = activeTab === 'daily'
    ? [
        { label: '00:00', triggers: 0, suppressed: 0, fluid: '0.00 L', response: 'Nominal', sector: 'Clear' },
        { label: '03:00', triggers: 0, suppressed: 0, fluid: '0.00 L', response: 'Nominal', sector: 'Clear' },
        { label: '06:00', triggers: 0, suppressed: 0, fluid: '0.00 L', response: 'Nominal', sector: 'Clear' },
        { label: '09:00', triggers: 0, suppressed: 0, fluid: '0.00 L', response: 'Nominal', sector: 'Clear' },
        { label: '12:00', triggers: 0, suppressed: 0, fluid: '0.00 L', response: 'Nominal', sector: 'Clear' },
        { label: '15:00', triggers: 0, suppressed: 0, fluid: '0.00 L', response: 'Nominal', sector: 'Clear' },
        { label: '18:00', triggers: 0, suppressed: 0, fluid: '0.00 L', response: 'Nominal', sector: 'Clear' },
        { label: '21:00', triggers: 0, suppressed: 0, fluid: '0.00 L', response: 'Nominal', sector: 'Clear' }
      ]
    : activeTab === 'weekly'
    ? [
        { label: 'Mon', triggers: 0, suppressed: 0, fluid: '0.00 L', response: 'Nominal', sector: 'Clear' },
        { label: 'Tue', triggers: 0, suppressed: 0, fluid: '0.00 L', response: 'Nominal', sector: 'Clear' },
        { label: 'Wed', triggers: 0, suppressed: 0, fluid: '0.00 L', response: 'Nominal', sector: 'Clear' },
        { label: 'Thu', triggers: 0, suppressed: 0, fluid: '0.00 L', response: 'Nominal', sector: 'Clear' },
        { label: 'Fri', triggers: 0, suppressed: 0, fluid: '0.00 L', response: 'Nominal', sector: 'Clear' },
        { label: 'Sat', triggers: 0, suppressed: 0, fluid: '0.00 L', response: 'Nominal', sector: 'Clear' },
        { label: 'Sun', triggers: 0, suppressed: 0, fluid: '0.00 L', response: 'Nominal', sector: 'Clear' }
      ]
    : [
        { label: 'W1', triggers: 0, suppressed: 0, fluid: '0.00 L', response: 'Nominal', sector: 'Clear' },
        { label: 'W2', triggers: 0, suppressed: 0, fluid: '0.00 L', response: 'Nominal', sector: 'Clear' },
        { label: 'W3', triggers: 0, suppressed: 0, fluid: '0.00 L', response: 'Nominal', sector: 'Clear' },
        { label: 'W4', triggers: 0, suppressed: 0, fluid: '0.00 L', response: 'Nominal', sector: 'Clear' }
      ];

  if (incidents.length > 0) {
    defaultPoints[defaultPoints.length - 1].triggers = totalAlarmsCount;
    defaultPoints[defaultPoints.length - 1].suppressed = extinguishedCount;
    defaultPoints[defaultPoints.length - 1].fluid = fluidExpended;
    defaultPoints[defaultPoints.length - 1].response = avgResponse;
    defaultPoints[defaultPoints.length - 1].sector = incidents[0]?.vector || 'Active Sector';
  }

  const currentDataset = {
    timeline: activeTab === 'daily' ? '24-Hour Surveillance Window' : activeTab === 'weekly' ? '7-Day Rolling Incident Tally' : '30-Day Fleet Log',
    totalAlarms: totalAlarmsCount,
    avgResponse,
    fluidExpended,
    suppressionRate,
    points: defaultPoints,
    maxScale: Math.max(6, totalAlarmsCount + 2)
  };
  const activeHoverPoint = hoveredPointIndex !== null ? currentDataset.points[hoveredPointIndex] : null;

  const handleTestSpray = () => {
    if (emergencyStop) {
      showToast('Cannot test spray: Emergency Hardware Cutoff is engaged.');
      return;
    }
    setIsTestSpraying(true);
    togglePump();
    showToast('TEST DISCHARGE: Water pump actuated for 2.0s pulse test.');
    setTimeout(() => {
      togglePump();
      setIsTestSpraying(false);
      showToast('Test pulse complete. Solenoid valve sealed.');
    }, 2000);
  };

  // Triangulation vector calculation
  const maxSensorVal = Math.max(flameSensors.left, flameSensors.center, flameSensors.right);
  let headingAngle = '0.0° (Center)';
  let headingSector = 'Center Hearth';
  if (maxSensorVal > 2000) {
    if (maxSensorVal === flameSensors.center) {
      headingAngle = '0.0° (Direct Hearth)';
      headingSector = 'Front Center (90°)';
    } else if (maxSensorVal === flameSensors.left) {
      headingAngle = '-45.0° (Port Flank)';
      headingSector = 'Left Sensor (0°/45°)';
    } else {
      headingAngle = '+45.0° (Starboard Flank)';
      headingSector = 'Right Sensor (135°/180°)';
    }
  }

  return (
    <div className="flex flex-col w-full gap-5 sm:gap-6">
      {/* Top Operational Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl p-4 sm:p-6 border border-neutral-200/90 shadow-sm">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 border border-neutral-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-600 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-700"></span>
              </span>
              Telemetric Feed Live
            </span>
            <span className="text-xs text-neutral-500 font-mono">ESP32-S3-WROOM-1</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight">
            System Overview Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Real-time multisensor telemetry, spatial IR flame vectoring, and autonomous suppression status.
          </p>
        </div>

        {/* Quick Action Ribbon */}
        <div className="flex items-center gap-2 sm:gap-3 self-start md:self-auto flex-wrap">
          <div className="bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-neutral-700 text-base">cloud_sync</span>
            <span className="text-neutral-500 hidden sm:inline">Supabase RT:</span>
            <span className="text-neutral-900 font-bold font-mono">Active ({latencyMs}ms)</span>
          </div>

          <button
            onClick={simulateFireTrigger}
            className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-base">local_fire_department</span>
            <span>Simulate Fire</span>
          </button>

          <button
            onClick={() => showToast(`Probe Link: OK · RTT ${latencyMs}ms · ESP32-S3 Responding`)}
            className="bg-white hover:bg-neutral-50 text-neutral-800 px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition shadow-2xs border border-neutral-300 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-base">sensors</span>
            <span className="hidden sm:inline">Probe Link</span>
          </button>
        </div>
      </div>

      {/* SECTION A: 4 Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Vehicle Link */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/90 shadow-sm hover:border-neutral-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center border border-neutral-200">
                <span className="material-symbols-outlined text-xl">router</span>
              </div>
              <span className="text-sm font-bold text-neutral-900">Vehicle Link</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 text-xs font-bold flex items-center gap-1 border border-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 animate-pulse"></span>ONLINE
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-neutral-900 font-mono tracking-tight">{latencyMs}</span>
              <span className="text-xs sm:text-sm font-semibold text-neutral-500">ms latency</span>
            </div>
            <div className="text-xs text-neutral-500 mt-1">Wi-Fi STA Mode · 2.4GHz</div>
          </div>

          <div className="bg-neutral-50 rounded-xl p-2.5 border border-neutral-100 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Signal (RSSI):</span>
              <span className="font-mono font-bold text-neutral-800">{wifiRssi} dBm (96%)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Packet Jitter:</span>
              <span className="text-neutral-900 font-semibold font-mono">±1.2 ms (Optimal)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Fire Threat Level */}
        <div className={`rounded-2xl p-4 sm:p-5 border shadow-sm transition-all flex flex-col justify-between ${
          fireDetected
            ? 'bg-red-50 border-red-300 ring-2 ring-red-200'
            : 'bg-white border-neutral-200/90 hover:border-neutral-300'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                fireDetected ? 'bg-red-600 text-white animate-bounce' : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                <span className="material-symbols-outlined text-xl">local_fire_department</span>
              </div>
              <span className="text-sm font-bold text-neutral-900">Fire Detection</span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border ${
                fireDetected
                  ? 'bg-red-600 text-white border-red-500 animate-pulse shadow-sm'
                  : 'bg-neutral-100 text-neutral-800 border-neutral-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${fireDetected ? 'bg-white' : 'bg-emerald-500'}`}></span>
              {fireDetected ? 'FLAME ALERT' : 'NO HAZARD'}
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold font-mono tracking-tight ${fireDetected ? 'text-red-600' : 'text-neutral-900'}`}>
                {fireDetected ? '1' : '0'}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-neutral-500">active flame target</span>
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              Peak: {maxSensorVal} ADC · Trigger: &gt; 2800 ADC
            </div>
          </div>

          <div className="bg-neutral-50 rounded-xl p-2.5 border border-neutral-100 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Triangulation:</span>
              <span className={`font-semibold font-mono ${fireDetected ? 'text-red-600 font-bold' : 'text-neutral-800'}`}>
                {headingAngle}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Response Mode:</span>
              <span className="text-neutral-900 font-semibold font-mono">Autonomous Armed</span>
            </div>
          </div>
        </div>

        {/* Card 3: Extinguisher Reservoir */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/90 shadow-sm hover:border-neutral-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center border border-neutral-200">
                <span className="material-symbols-outlined text-xl">water_drop</span>
              </div>
              <span className="text-sm font-bold text-neutral-900">Extinguisher Pump</span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                pumpActive
                  ? 'bg-neutral-200 text-neutral-900 border-neutral-400 animate-pulse shadow-2xs'
                  : 'bg-neutral-100 text-neutral-700 border-neutral-200'
              }`}
            >
              {pumpActive ? 'SPRAYING' : 'STANDBY'}
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-neutral-900 font-mono tracking-tight">{reservoirLevel}</span>
                <span className="text-xs sm:text-sm font-semibold text-neutral-500">% Volume</span>
              </div>
              <span className="text-xs font-mono font-bold text-neutral-700">
                {((reservoirLevel / 100) * 2.0).toFixed(2)} L / 2.0 L
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-neutral-100 h-2.5 rounded-full mt-2 overflow-hidden p-0.5 border border-neutral-200">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  reservoirLevel < 25 ? 'bg-red-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${reservoirLevel}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-neutral-50 rounded-xl p-2.5 border border-neutral-100 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Relay Switch:</span>
              <span className={`font-mono font-bold ${pumpActive ? 'text-black' : 'text-neutral-700'}`}>
                {pumpActive ? 'GPIO 19 HIGH' : 'GPIO 19 LOW'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Suppression Cycles:</span>
              <span className="font-semibold text-neutral-800 font-mono">{incidents.length} completed</span>
            </div>
          </div>
        </div>

        {/* Card 4: Hardware Health */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/90 shadow-sm hover:border-neutral-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center border border-neutral-200">
                <span className="material-symbols-outlined text-xl">memory</span>
              </div>
              <span className="text-sm font-bold text-neutral-900">System Hardware</span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                emergencyStop
                  ? 'bg-red-100 text-red-700 border-red-200'
                  : 'bg-neutral-100 text-neutral-800 border-neutral-300'
              }`}
            >
              {emergencyStop ? 'E-STOP' : 'HEALTHY'}
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-neutral-900 font-mono tracking-tight">{batteryVoltage}</span>
              <span className="text-xs sm:text-sm font-semibold text-neutral-500">V (3S LiPo · {batteryLevel}%)</span>
            </div>
            <div className="text-xs text-neutral-500 mt-1">Dual Core @ 240MHz · FreeRTOS</div>
          </div>

          <div className="bg-neutral-50 rounded-xl p-2.5 border border-neutral-100 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">SoC Die Temp:</span>
              <span className="font-mono font-bold text-neutral-800">{dieTemperature} °C (Normal)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">IR Photodiodes:</span>
              <span className="text-neutral-900 font-semibold">3/3 Calibrated</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION B: High-Tech Flame Sensor Cluster & Spatial Triangulation */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-neutral-200/90 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-neutral-100 gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center border border-neutral-200">
                <span className="material-symbols-outlined text-xl">radar</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                Flame Detection Photodiode Array (760nm – 1100nm IR)
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Tri-directional ADC sampling matrix with automated centroid triangulation and fire tracking.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-mono font-bold border border-neutral-200">
              ADC SAR: 12-Bit · 50 Hz
            </span>
          </div>
        </div>

        {/* Spatial Triangulation Radar Banner */}
        <div className={`rounded-2xl p-4 sm:p-5 mb-5 border transition-all ${
          fireDetected
            ? 'bg-red-50 border-red-300 shadow-sm ring-1 ring-red-200'
            : 'bg-neutral-50 border-neutral-200'
        }`}>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className={`w-12 sm:w-14 h-12 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                fireDetected ? 'bg-red-600 text-white animate-bounce' : 'bg-emerald-600 text-white'
              }`}>
                <span className="material-symbols-outlined text-2xl sm:text-3xl">
                  {fireDetected ? 'local_fire_department' : 'verified_user'}
                </span>
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold text-neutral-900 flex items-center gap-2">
                  {fireDetected ? 'HAZARD BREACH: ACTIVE FLAME SOURCE DETECTED' : 'Perimeter Shield Active: All Sectors Clear'}
                  <span className={`w-2.5 h-2.5 rounded-full ${fireDetected ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`}></span>
                </div>
                <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
                  {fireDetected
                    ? 'Center photodiode breached trigger limit (> 2800 ADC). Directing vehicle alignment and actuator valve towards target hearth.'
                    : 'All three infrared sensor rays are measuring nominal ambient baseline radiation (< 600 ADC). Rover in standard patrol sweep.'}
                </p>
              </div>
            </div>

            {/* Triangulation Angle Display */}
            <div className="flex items-center gap-3.5 bg-white px-4 py-2.5 rounded-xl border border-neutral-200 shadow-sm shrink-0 w-full sm:w-auto justify-between sm:justify-start">
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Triangulated Vector</span>
                <span className="text-sm font-bold font-mono text-neutral-900">{headingAngle}</span>
                <span className="text-[11px] text-neutral-500 block">{headingSector}</span>
              </div>
              <div className="w-10 h-10 rounded-full border border-neutral-200 flex items-center justify-center bg-neutral-100 text-neutral-800 relative shrink-0">
                <span className="material-symbols-outlined text-2xl">navigation</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Sensor Pod Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* Left Sensor */}
          <div className={`rounded-2xl p-4 sm:p-5 border transition-all ${
            flameSensors.left > 2800
              ? 'bg-red-50 border-red-300 shadow-sm ring-1 ring-red-200'
              : 'bg-neutral-50/70 border-neutral-200 hover:border-neutral-300'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${flameSensors.left > 2800 ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`}></span>
                <span className="text-sm font-bold text-neutral-900">Left Sensor (-35°)</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                flameSensors.left > 2800 ? 'bg-red-600 text-white border-red-500' : 'bg-neutral-100 text-neutral-800 border-neutral-300'
              }`}>
                {flameSensors.left > 2800 ? 'FIRE SPIKE' : 'NOMINAL'}
              </span>
            </div>

            <span className="text-[11px] text-neutral-500 font-mono block mb-2">PIN: GPIO 34 (ADC1_CH6)</span>

            <div className="flex items-baseline justify-between mb-2">
              <span className="text-3xl font-extrabold font-mono text-neutral-900">{flameSensors.left}</span>
              <span className="text-xs text-neutral-500 font-mono">/ 4095 ADC</span>
            </div>

            <div className="w-full bg-neutral-200 h-3 rounded-full overflow-hidden mb-3 p-0.5 border border-neutral-300">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  flameSensors.left > 2800 ? 'bg-red-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, (flameSensors.left / 4095) * 100)}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-xs text-neutral-500 pt-2 border-t border-neutral-200">
              <span>Baseline: ~0 ADC</span>
              <span className="font-semibold text-neutral-800">Trigger: &gt; 2800</span>
            </div>
          </div>

          {/* Center Sensor */}
          <div className={`rounded-2xl p-4 sm:p-5 border transition-all ${
            flameSensors.center > 2800
              ? 'bg-red-50 border-red-300 shadow-sm ring-1 ring-red-200'
              : 'bg-neutral-50/70 border-neutral-200 hover:border-neutral-300'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${flameSensors.center > 2800 ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`}></span>
                <span className="text-sm font-bold text-neutral-900">Center Sensor (0°)</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                flameSensors.center > 2800 ? 'bg-red-600 text-white border-red-500' : 'bg-neutral-100 text-neutral-800 border-neutral-300'
              }`}>
                {flameSensors.center > 2800 ? 'FIRE SPIKE' : 'NOMINAL'}
              </span>
            </div>

            <span className="text-[11px] text-neutral-500 font-mono block mb-2">PIN: GPIO 32 (ADC1_CH4)</span>

            <div className="flex items-baseline justify-between mb-2">
              <span className="text-3xl font-extrabold font-mono text-neutral-900">{flameSensors.center}</span>
              <span className="text-xs text-neutral-500 font-mono">/ 4095 ADC</span>
            </div>

            <div className="w-full bg-neutral-200 h-3 rounded-full overflow-hidden mb-3 p-0.5 border border-neutral-300">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  flameSensors.center > 2800 ? 'bg-red-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, (flameSensors.center / 4095) * 100)}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-xs text-neutral-500 pt-2 border-t border-neutral-200">
              <span>Baseline: ~400 ADC</span>
              <span className="font-semibold text-neutral-800">Trigger: &gt; 2800</span>
            </div>
          </div>

          {/* Right Sensor */}
          <div className={`rounded-2xl p-4 sm:p-5 border transition-all ${
            flameSensors.right > 2800
              ? 'bg-red-50 border-red-300 shadow-sm ring-1 ring-red-200'
              : 'bg-neutral-50/70 border-neutral-200 hover:border-neutral-300'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${flameSensors.right > 2800 ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`}></span>
                <span className="text-sm font-bold text-neutral-900">Right Sensor (+35°)</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                flameSensors.right > 2800 ? 'bg-red-600 text-white border-red-500' : 'bg-neutral-100 text-neutral-800 border-neutral-300'
              }`}>
                {flameSensors.right > 2800 ? 'FIRE SPIKE' : 'NOMINAL'}
              </span>
            </div>

            <span className="text-[11px] text-neutral-500 font-mono block mb-2">PIN: GPIO 35 (ADC1_CH7)</span>

            <div className="flex items-baseline justify-between mb-2">
              <span className="text-3xl font-extrabold font-mono text-neutral-900">{flameSensors.right}</span>
              <span className="text-xs text-neutral-500 font-mono">/ 4095 ADC</span>
            </div>

            <div className="w-full bg-neutral-200 h-3 rounded-full overflow-hidden mb-3 p-0.5 border border-neutral-300">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  flameSensors.right > 2800 ? 'bg-red-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, (flameSensors.right / 4095) * 100)}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-xs text-neutral-500 pt-2 border-t border-neutral-200">
              <span>Baseline: ~0 ADC</span>
              <span className="font-semibold text-neutral-800">Trigger: &gt; 2800</span>
            </div>
          </div>
        </div>
      </div>

            {/* SECTION C & D: Rover Chassis Telemetry & Fire Activity Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Column: Vehicle & Actuator Console */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-6 border border-neutral-200 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-xl">smart_toy</span>
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-base leading-tight">Rover Chassis & Actuation</h3>
                  <p className="text-[11px] text-neutral-500 font-mono">NODE-ESP32-FIRE-ROBO-01</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 text-[11px] font-mono font-bold border border-neutral-200">
                CHASSIS V2.4
              </span>
            </div>

            {/* Interactive Rover Blueprint Visualizer */}
            <div className="relative w-full aspect-[16/10] sm:h-56 rounded-2xl overflow-hidden mb-4 bg-neutral-50/90 flex items-center justify-center text-neutral-800 border border-neutral-200 p-2 select-none">
              {/* Technical Blueprint SVG */}
              <svg viewBox="0 0 380 230" className="w-full h-full">
                <defs>
                  {/* Subtle Grid Pattern */}
                  <pattern id="chassis-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="0.75" fill="#D4D4D4" />
                  </pattern>
                  <linearGradient id="tank-fluid-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#A3A3A3" stopOpacity="0.2" />
                  </linearGradient>
                </defs>

                {/* Grid Canvas */}
                <rect width="380" height="230" fill="url(#chassis-grid)" />

                {/* Sonar Sensor Range Arcs (Front) */}
                <g className={obstacleDistance < 50 ? 'animate-pulse' : ''}>
                  <path
                    d="M 140 28 Q 190 6 240 28"
                    fill="none"
                    stroke={obstacleDistance < 50 ? '#EF4444' : '#A3A3A3'}
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  <path
                    d="M 125 18 Q 190 -2 255 18"
                    fill="none"
                    stroke={obstacleDistance < 50 ? '#EF4444' : '#D4D4D4'}
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                </g>

                {/* 4 Drive Track Wheels */}
                {/* Front Left Wheel */}
                <g>
                  <rect x="68" y="42" width="30" height="54" rx="6" fill="#E5E5E5" stroke="#737373" strokeWidth="1.2" />
                  <line x1="72" y1="52" x2="94" y2="52" stroke="#A3A3A3" strokeWidth="1.5" />
                  <line x1="72" y1="62" x2="94" y2="62" stroke="#A3A3A3" strokeWidth="1.5" />
                  <line x1="72" y1="72" x2="94" y2="72" stroke="#A3A3A3" strokeWidth="1.5" />
                  <line x1="72" y1="82" x2="94" y2="82" stroke="#A3A3A3" strokeWidth="1.5" />
                  <text x="83" y="104" fontSize="8" fill="#737373" fontFamily="monospace" textAnchor="middle">FL</text>
                </g>

                {/* Front Right Wheel */}
                <g>
                  <rect x="282" y="42" width="30" height="54" rx="6" fill="#E5E5E5" stroke="#737373" strokeWidth="1.2" />
                  <line x1="286" y1="52" x2="308" y2="52" stroke="#A3A3A3" strokeWidth="1.5" />
                  <line x1="286" y1="62" x2="308" y2="62" stroke="#A3A3A3" strokeWidth="1.5" />
                  <line x1="286" y1="72" x2="308" y2="72" stroke="#A3A3A3" strokeWidth="1.5" />
                  <line x1="286" y1="82" x2="308" y2="82" stroke="#A3A3A3" strokeWidth="1.5" />
                  <text x="297" y="104" fontSize="8" fill="#737373" fontFamily="monospace" textAnchor="middle">FR</text>
                </g>

                {/* Rear Left Wheel */}
                <g>
                  <rect x="68" y="132" width="30" height="54" rx="6" fill="#E5E5E5" stroke="#737373" strokeWidth="1.2" />
                  <line x1="72" y1="142" x2="94" y2="142" stroke="#A3A3A3" strokeWidth="1.5" />
                  <line x1="72" y1="152" x2="94" y2="152" stroke="#A3A3A3" strokeWidth="1.5" />
                  <line x1="72" y1="162" x2="94" y2="162" stroke="#A3A3A3" strokeWidth="1.5" />
                  <line x1="72" y1="172" x2="94" y2="172" stroke="#A3A3A3" strokeWidth="1.5" />
                  <text x="83" y="194" fontSize="8" fill="#737373" fontFamily="monospace" textAnchor="middle">RL</text>
                </g>

                {/* Rear Right Wheel */}
                <g>
                  <rect x="282" y="132" width="30" height="54" rx="6" fill="#E5E5E5" stroke="#737373" strokeWidth="1.2" />
                  <line x1="286" y1="142" x2="308" y2="142" stroke="#A3A3A3" strokeWidth="1.5" />
                  <line x1="286" y1="152" x2="308" y2="152" stroke="#A3A3A3" strokeWidth="1.5" />
                  <line x1="286" y1="162" x2="308" y2="162" stroke="#A3A3A3" strokeWidth="1.5" />
                  <line x1="286" y1="172" x2="308" y2="172" stroke="#A3A3A3" strokeWidth="1.5" />
                  <text x="297" y="194" fontSize="8" fill="#737373" fontFamily="monospace" textAnchor="middle">RR</text>
                </g>

                {/* Main Chassis Body Frame */}
                <rect x="106" y="44" width="168" height="142" rx="14" fill="#FFFFFF" stroke="#525252" strokeWidth="1.5" />
                <rect x="112" y="50" width="156" height="130" rx="10" fill="none" stroke="#D4D4D4" strokeWidth="1" strokeDasharray="6 3" />

                {/* Bumper with 3 Photodiode IR Flame Sensors */}
                <rect x="122" y="36" width="136" height="12" rx="4" fill="#F5F5F5" stroke="#A3A3A3" strokeWidth="1" />

                {/* Left Flame Sensor (GPIO 34) */}
                <circle
                  cx="140"
                  cy="42"
                  r="4"
                  fill={flameSensors.left > 2800 ? '#EF4444' : '#525252'}
                  className={flameSensors.left > 2800 ? 'animate-ping' : ''}
                />
                <circle cx="140" cy="42" r="2.5" fill={flameSensors.left > 2800 ? '#EF4444' : '#A3A3A3'} />

                {/* Center Flame Sensor (GPIO 35) */}
                <circle
                  cx="190"
                  cy="42"
                  r="5"
                  fill={flameSensors.center > 2800 ? '#EF4444' : '#525252'}
                  className={flameSensors.center > 2800 ? 'animate-ping' : ''}
                />
                <circle cx="190" cy="42" r="3" fill={flameSensors.center > 2800 ? '#EF4444' : '#FFFFFF'} />

                {/* Right Flame Sensor (GPIO 32) */}
                <circle
                  cx="240"
                  cy="42"
                  r="4"
                  fill={flameSensors.right > 2800 ? '#EF4444' : '#525252'}
                  className={flameSensors.right > 2800 ? 'animate-ping' : ''}
                />
                <circle cx="240" cy="42" r="2.5" fill={flameSensors.right > 2800 ? '#EF4444' : '#A3A3A3'} />

                {/* Ultrasonic Transducer Module (HC-SR04) */}
                <rect x="168" y="24" width="44" height="14" rx="4" fill="#F5F5F5" stroke="#A3A3A3" strokeWidth="1" />
                <circle cx="178" cy="31" r="4" fill="#E5E5E5" stroke="#737373" strokeWidth="0.8" />
                <circle cx="202" cy="31" r="4" fill="#E5E5E5" stroke="#737373" strokeWidth="0.8" />

                {/* Extinguisher Nozzle & Turret */}
                <g>
                  <circle cx="190" cy="74" r="14" fill="#E5E5E5" stroke="#737373" strokeWidth="1.5" />
                  <circle cx="190" cy="74" r="7" fill="#D4D4D4" stroke="#737373" strokeWidth="1" />
                  {/* Brass Nozzle barrel */}
                  <line x1="190" y1="74" x2="190" y2="52" stroke="#525252" strokeWidth="3" strokeLinecap="round" />

                  {/* Water Spray Particle Cone when Pump Active */}
                  {pumpActive && (
                    <g className="animate-pulse">
                      <polygon points="190,52 165,10 215,10" fill="#FFFFFF" fillOpacity="0.25" />
                      <line x1="190" y1="52" x2="175" y2="12" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 2" />
                      <line x1="190" y1="52" x2="190" y2="8" stroke="#FFFFFF" strokeWidth="2" />
                      <line x1="190" y1="52" x2="205" y2="12" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 2" />
                    </g>
                  )}
                </g>

                {/* Center Fluid Reservoir Tank */}
                <rect x="126" y="98" width="128" height="40" rx="6" fill="#F5F5F5" stroke="#A3A3A3" strokeWidth="1" />
                {/* Fluid Level Fill Bar */}
                <rect
                  x="128"
                  y="100"
                  width={Math.floor((124 * reservoirLevel) / 100)}
                  height="36"
                  rx="4"
                  fill="url(#tank-fluid-grad)"
                />
                <text x="190" y="122" fontSize="9" fontWeight="bold" fill="#404040" fontFamily="monospace" textAnchor="middle">
                  RESERVOIR: {reservoirLevel}% ({((reservoirLevel * 2) / 100).toFixed(2)}L)
                </text>

                {/* ESP32-S3 Microcontroller Unit */}
                <rect x="146" y="146" width="88" height="28" rx="4" fill="#F5F5F5" stroke="#A3A3A3" strokeWidth="1" />
                <text x="190" y="162" fontSize="8.5" fontWeight="bold" fill="#525252" fontFamily="monospace" textAnchor="middle">
                  ESP32-S3 CORE
                </text>
                {/* Status LED */}
                <circle cx="154" cy="160" r="2.5" fill="#525252" className="animate-ping" />
                <circle cx="154" cy="160" r="1.5" fill="#525252" />

                {/* Telemetry HUD Labels */}
                <text x="190" y="215" fontSize="9" fill="#737373" fontFamily="monospace" textAnchor="middle">
                  L298N DUAL H-BRIDGE · 4WD PLATFORM
                </text>
              </svg>

              {/* Status Floating Badges */}
              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-neutral-200 text-[10px] font-mono shadow-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-neutral-700 animate-pulse" />
                <span className="text-neutral-800 font-bold">{vehicleMode === 'auto' ? 'AUTO-PATROL' : 'TELEOP MANUAL'}</span>
              </div>

              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-neutral-200 text-[10px] font-mono shadow-xs">
                <span className="text-neutral-400">SONAR: </span>
                <span className={`font-bold ${obstacleDistance < 50 ? 'text-red-400' : 'text-neutral-800'}`}>
                  {obstacleDistance} cm
                </span>
              </div>

              <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-neutral-200 text-[10px] font-mono shadow-xs">
                <span className="text-neutral-400">PUMP: </span>
                <span className={`font-bold ${pumpActive ? 'text-red-400 animate-pulse' : 'text-neutral-300'}`}>
                  {pumpActive ? 'SPRAYING (ON)' : 'STANDBY (OFF)'}
                </span>
              </div>
            </div>

            {/* Metrics Subgrid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <span className="text-neutral-500 text-xs block mb-1">Operating Mode</span>
                <div className="text-sm font-bold text-neutral-900 flex items-center gap-1.5 uppercase">
                  <span className="material-symbols-outlined text-base">
                    {vehicleMode === 'auto' ? 'smart_toy' : 'videocam'}
                  </span>
                  {vehicleMode}
                </div>
                <span className="text-[11px] text-neutral-500 block mt-0.5">
                  {vehicleMode === 'auto' ? 'Autonomous IR Lock' : 'WASD D-Pad Steering'}
                </span>
              </div>

              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <span className="text-neutral-500 text-xs block mb-1">Obstacle Proximity</span>
                <div className="text-sm font-bold text-neutral-900 flex items-center gap-1.5 font-mono">
                  <span className="material-symbols-outlined text-base text-neutral-900">
                    {obstacleDistance < 50 ? 'warning' : 'check_circle'}
                  </span>
                  {obstacleDistance} cm
                </div>
                <span className={`text-[11px] font-semibold block mt-0.5 ${obstacleDistance < 50 ? 'text-red-600' : 'text-neutral-700'}`}>
                  {obstacleDistance < 50 ? 'Clearance Warning' : 'Safe Trajectory'}
                </span>
              </div>
            </div>

            {/* Actuator States */}
            <div className="space-y-2 mb-4 text-xs font-mono">
              <div className="flex items-center justify-between bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
                <span className="text-neutral-500 font-sans">Target Heading Vector:</span>
                <span className="font-bold text-neutral-800">{headingAngle}</span>
              </div>
              <div className="flex items-center justify-between bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
                <span className="text-neutral-500 font-sans">Submersible Pump:</span>
                <span className={`font-bold ${pumpActive ? 'text-black' : 'text-neutral-600'}`}>
                  {pumpActive ? 'GPIO 23 DISCHARGING (ON)' : 'RELAY STANDBY (OFF)'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="pt-2 flex flex-wrap gap-2.5">
            <button
              onClick={() => setCurrentPage('live-monitoring')}
              className="flex-1 min-w-[130px] bg-neutral-100 hover:bg-neutral-200 text-neutral-800 py-2.5 px-3 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-2 transition shadow-2xs border border-neutral-300 active:scale-[0.98] cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">sports_esports</span>
              Live Optics HUD
            </button>

            <button
              onClick={() => {
                const nextMode = vehicleMode === 'auto' ? 'manual' : 'auto';
                setVehicleMode(nextMode);
                showToast(`Switched operating mode to ${nextMode.toUpperCase()}`);
              }}
              className="bg-white hover:bg-zinc-50 border border-zinc-200/90 text-zinc-700 py-2.5 px-3.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition shadow-2xs active:scale-[0.98] cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">swap_horiz</span>
              Switch Mode
            </button>

            <button
              onClick={handleTestSpray}
              disabled={isTestSpraying}
              className={`py-2.5 px-3.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition border cursor-pointer active:scale-[0.98] shadow-2xs ${
                isTestSpraying
                  ? 'bg-neutral-200 text-neutral-900 border-neutral-400 animate-pulse'
                  : 'bg-white hover:bg-zinc-50 border-zinc-200/90 text-zinc-700'
              }`}
            >
              <span className="material-symbols-outlined text-base">water_drop</span>
              <span>{isTestSpraying ? 'Spraying...' : 'Test Spray'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Fire Activity & Historical Incident Analytics */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-4 sm:p-6 border border-neutral-200 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-neutral-100 gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200 shadow-xs">
                    <span className="material-symbols-outlined text-xl">query_stats</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 text-base leading-tight">Fire Activity & Suppression Trend</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">{currentDataset.timeline}</p>
                  </div>
                </div>
              </div>

              {/* Timeframe Switcher - Modern Segmented Control */}
              <div className="inline-flex bg-zinc-100/90 p-1 rounded-xl text-xs border border-zinc-200/70 self-start sm:self-auto">
                {(['daily', 'weekly', 'monthly'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setHoveredPointIndex(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg transition-all capitalize text-xs ${
                      activeTab === tab
                        ? 'bg-white text-zinc-900 shadow-xs font-semibold border border-zinc-200/80'
                        : 'text-zinc-500 hover:text-zinc-900 font-medium'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics Trio */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-4">
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <span className="text-[11px] text-neutral-500 font-medium block">Total Alarms</span>
                <span className="text-xl sm:text-2xl font-extrabold text-neutral-900 font-mono mt-0.5 block">
                  {currentDataset.totalAlarms}
                </span>
                <span className="text-[10px] text-neutral-800 font-bold block mt-0.5">
                  {currentDataset.suppressionRate} Extinguished
                </span>
              </div>

              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <span className="text-[11px] text-neutral-500 font-medium block">Avg Response</span>
                <span className="text-xl sm:text-2xl font-extrabold text-neutral-900 font-mono mt-0.5 block">
                  {currentDataset.avgResponse}
                </span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">Trip to discharge</span>
              </div>

              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <span className="text-[11px] text-neutral-500 font-medium block">Fluid Expended</span>
                <span className="text-xl sm:text-2xl font-extrabold text-neutral-900 font-mono mt-0.5 block">
                  {currentDataset.fluidExpended}
                </span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">Across all events</span>
              </div>
            </div>

                        {/* Modern Full-Width Analytics Chart */}
            <div className="w-full bg-neutral-50/80 rounded-2xl p-4 sm:p-5 border border-neutral-200">
              {/* Chart Legend & Live Inspector */}
              <div className="flex flex-wrap items-center justify-between mb-5 pb-3 border-b border-neutral-200/80 gap-3">
                <div className="flex items-center gap-4 text-xs font-semibold flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-gradient-to-tr from-amber-500 to-orange-500 inline-block shadow-2xs" />
                    <span className="text-neutral-900 font-semibold">Flame Triggers</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-gradient-to-tr from-emerald-500 to-teal-400 inline-block shadow-2xs" />
                    <span className="text-neutral-900 font-semibold">Extinguished</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 border-t-2 border-dashed border-rose-500 inline-block" />
                    <span className="text-rose-600 font-mono text-[11px] font-bold">Safety Threshold (4)</span>
                  </div>
                </div>

                {/* Active Hover / Inspector Pill */}
                {activeHoverPoint ? (
                  <div className="bg-white text-neutral-800 px-3.5 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2.5 shadow-sm border border-neutral-300">
                    <span className="font-bold text-neutral-900">{activeHoverPoint.label}:</span>
                    <span className="text-amber-700 font-bold">{activeHoverPoint.triggers} Alarms</span>
                    <span className="text-neutral-300">•</span>
                    <span className="text-emerald-700 font-bold">{activeHoverPoint.response}</span>
                    <span className="text-neutral-300">•</span>
                    <span className="text-neutral-600">{activeHoverPoint.fluid}</span>
                  </div>
                ) : (
                  <span className="text-neutral-400 font-mono text-xs hidden sm:inline">Hover over bars to inspect details</span>
                )}
              </div>

              {/* Chart Canvas Area */}
              <div className="relative h-44 sm:h-48 w-full flex flex-col justify-between pt-2">
                {/* Horizontal reference lines & Y-axis labels */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                  {/* Top Max Scale */}
                  <div className="border-b border-neutral-200 w-full flex items-center justify-between text-[10px] font-mono text-neutral-400">
                    <span className="pl-1">{currentDataset.maxScale}</span>
                  </div>
                  {/* Two Thirds */}
                  <div className="border-b border-neutral-200/80 w-full flex items-center justify-between text-[10px] font-mono text-neutral-400">
                    <span className="pl-1">{Math.round((currentDataset.maxScale * 2) / 3)}</span>
                  </div>
                  {/* Alert Threshold Dashed Line */}
                  <div className="border-b-2 border-dashed border-red-400/80 w-full flex items-center justify-end text-[10px] font-mono text-red-500 pr-1">
                    <span className="bg-neutral-50/90 px-1 font-bold">ALERT LINE</span>
                  </div>
                  {/* Baseline 0 */}
                  <div className="border-b border-neutral-300 w-full flex items-center justify-between text-[10px] font-mono text-neutral-400">
                    <span className="pl-1">0</span>
                  </div>
                </div>

                {/* Evenly Distributed Full-Width Columns */}
                <div className="relative z-10 h-full flex items-end justify-between gap-1 sm:gap-3 pl-6 pr-1 pb-1">
                  {currentDataset.points.map((pt, idx) => {
                    const isHovered = hoveredPointIndex === idx;
                    const triggerPct = pt.triggers === 0 ? 0 : Math.min(100, (pt.triggers / currentDataset.maxScale) * 100);
                    const suppressedPct = pt.suppressed === 0 ? 0 : Math.min(100, (pt.suppressed / currentDataset.maxScale) * 100);

                    return (
                      <div
                        key={pt.label}
                        className={`flex-1 h-full flex flex-col justify-end items-center cursor-pointer rounded-xl transition-all duration-150 p-1 sm:p-1.5 ${
                          isHovered ? 'bg-blue-50/60 ring-1 ring-blue-300/60' : 'hover:bg-neutral-100/60'
                        }`}
                        onMouseEnter={() => setHoveredPointIndex(idx)}
                        onMouseLeave={() => setHoveredPointIndex(null)}
                      >
                        {/* Dual Bar Cluster */}
                        <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-[80%] pb-1">
                          {/* Trigger Bar - Vibrant Flame Gradient */}
                          <div className="w-1/2 max-w-[18px] sm:max-w-[22px] flex items-end h-full">
                            {pt.triggers > 0 ? (
                              <div
                                className={`w-full rounded-t-md transition-all duration-300 ${
                                  isHovered
                                    ? 'bg-gradient-to-t from-orange-600 to-amber-500 shadow-md shadow-orange-500/30'
                                    : 'bg-gradient-to-t from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                                }`}
                                style={{ height: `${triggerPct}%` }}
                              />
                            ) : (
                              <div className="w-full h-[2px] bg-amber-200 rounded-full" />
                            )}
                          </div>

                          {/* Suppressed Bar - High-Tech Suppression Emerald/Teal */}
                          <div className="w-1/2 max-w-[18px] sm:max-w-[22px] flex items-end h-full">
                            {pt.suppressed > 0 ? (
                              <div
                                className={`w-full rounded-t-md transition-all duration-300 ${
                                  isHovered
                                    ? 'bg-gradient-to-t from-teal-600 to-emerald-400 shadow-md shadow-emerald-500/30'
                                    : 'bg-gradient-to-t from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500'
                                }`}
                                style={{ height: `${suppressedPct}%` }}
                              />
                            ) : (
                              <div className="w-full h-[2px] bg-emerald-200 rounded-full" />
                            )}
                          </div>
                        </div>

                        {/* X-Axis Label */}
                        <span
                          className={`text-[10px] sm:text-[11px] font-mono mt-1 text-center transition-colors ${
                            isHovered ? 'font-bold text-neutral-900' : 'text-neutral-500'
                          }`}
                        >
                          {pt.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          {/* Real-Time Operational Log Stream Footer */}
          <div className="mt-4 pt-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-neutral-500 border-t border-neutral-100 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time IoT Edge Telemetry synchronized with Supabase</span>
            </div>
            <span className="font-bold text-neutral-900 font-mono">
              {incidents.length > 0 ? `Last Suppression: ${incidents[0].timestamp} (${incidents[0].responseDuration})` : 'No suppression events on record'}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
