import React, { useState } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { SpatialThreatRadarHUD } from '../components/radar/SpatialThreatRadarHUD';

export const FireDetectionPage: React.FC = () => {
  const {
    fireDetected,
    flameSensors,
    isAlarmSilenced,
    toggleSilenceAlarm,
    simulateFireTrigger,
    recalibrateSensors,
    isRecalibrating,
    incidents,
    selectedIncident,
    setSelectedIncident,
    adcThreshold
  } = useTelemetry();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDirection, setFilterDirection] = useState('ALL');
  const [filterAction, setFilterAction] = useState('ALL');

  const maxSensorVal = Math.max(flameSensors.left, flameSensors.center, flameSensors.right);
  let triangulatedHeading = '0.0° (Center)';
  let triangulatedSector = 'Center Hearth';
  if (maxSensorVal > adcThreshold) {
    if (maxSensorVal === flameSensors.center) {
      triangulatedHeading = '0.0° (Direct Hearth)';
      triangulatedSector = 'Center Sensor (0°)';
    } else if (maxSensorVal === flameSensors.left) {
      triangulatedHeading = '-45.0° (Port Flank)';
      triangulatedSector = 'Left Sensor (-45°)';
    } else {
      triangulatedHeading = '+45.0° (Starboard Flank)';
      triangulatedSector = 'Right Sensor (+45°)';
    }
  }

  const filteredIncidents = incidents.filter(inc => {
    const matchesSearch =
      inc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.vector.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDir = filterDirection === 'ALL' || inc.vector.toLowerCase().includes(filterDirection.toLowerCase());
    const matchesAct =
      filterAction === 'ALL' ||
      (filterAction === 'Discharged' && (inc.action.toLowerCase().includes('spray') || inc.action.toLowerCase().includes('manual'))) ||
      (filterAction === 'None' && (inc.action.toLowerCase().includes('filtered') || inc.action.toLowerCase().includes('cleared')));
    return matchesSearch && matchesDir && matchesAct;
  });

  return (
    <div className="flex flex-col w-full gap-5 sm:gap-6">
      {/* Hero Threat State Banner */}
      <div
        className={`rounded-2xl p-4 sm:p-6 border transition-all duration-300 shadow-sm ${
          fireDetected
            ? 'bg-red-50 border-2 border-red-500 shadow-red-200'
            : 'bg-white border-neutral-200/90'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 sm:w-14 h-12 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                fireDetected
                  ? 'bg-red-600 text-white animate-bounce'
                  : 'bg-neutral-100 text-neutral-800 border border-neutral-200'
              }`}
            >
              <span className="material-symbols-outlined text-2xl sm:text-3xl">
                {fireDetected ? 'local_fire_department' : 'verified_user'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    fireDetected ? 'bg-red-500 animate-ping' : 'bg-neutral-700'
                  }`}
                />
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 font-bold">
                  Tri-Directional Photodiode Matrix (GPIO 32, 34, 35)
                </span>
              </div>
              <h2
                className={`text-xl sm:text-2xl font-extrabold tracking-tight mt-1 ${
                  fireDetected ? 'text-red-600' : 'text-neutral-900'
                }`}
              >
                {fireDetected ? 'FLAME SIGNATURE BREACH DETECTED' : 'NO FIRE HAZARDS DETECTED'}
              </h2>
              <p className="text-neutral-500 text-xs sm:text-sm mt-0.5">
                {fireDetected
                  ? `Hazard locked on ${triangulatedSector} (${triangulatedHeading}). Extinguisher servo armed.`
                  : 'Sensors calibrated to nominal baseline ambient radiation levels (< 600 ADC).'}
              </p>
            </div>
          </div>

          {/* Action Button Controls */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              onClick={toggleSilenceAlarm}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-medium transition flex items-center gap-2 border active:scale-[0.98] shadow-2xs ${
                isAlarmSilenced
                  ? 'bg-zinc-200 text-zinc-900 border-zinc-400 shadow-2xs font-semibold'
                  : 'bg-white text-zinc-700 border-zinc-200/90 hover:bg-zinc-50'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {isAlarmSilenced ? 'volume_off' : 'volume_up'}
              </span>
              {isAlarmSilenced ? 'ALARM MUTED' : 'SILENCE ALARM'}
            </button>

            <button
              onClick={recalibrateSensors}
              disabled={isRecalibrating}
              className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-medium bg-white text-zinc-700 border border-zinc-200/90 hover:bg-zinc-50 transition shadow-2xs flex items-center gap-2 active:scale-[0.98]"
            >
              <span className={`material-symbols-outlined text-base ${isRecalibrating ? 'animate-spin' : ''}`}>
                tune
              </span>
              {isRecalibrating ? 'CALIBRATING...' : 'RECALIBRATE'}
            </button>

            <button
              onClick={simulateFireTrigger}
              className="px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition shadow-xs flex items-center gap-2 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-base">whatshot</span>
              SIMULATE TRIGGER
            </button>
          </div>
        </div>
      </div>

      {/* Sensor Array & Spatial Radar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Spatial 180-deg Tactical Radar Map */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <SpatialThreatRadarHUD />
        </div>

        {/* Photodiode ADC Matrix & Live Metrics */}
        <div className="lg:col-span-7 bg-white border border-neutral-200/90 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-neutral-800 text-xl">speed</span>
              <h3 className="font-bold text-neutral-900 text-base">Photodiode SAR ADC Matrix</h3>
            </div>
            <span className="text-xs text-neutral-500">
              Threshold: <span className="font-bold text-red-600 font-mono">{adcThreshold} ADC</span>
            </span>
          </div>

          {/* Matrix Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-5">
            {/* Left */}
            <div className={`p-4 rounded-xl border transition ${
              flameSensors.left > adcThreshold ? 'bg-red-50 border-red-300 shadow-sm ring-1 ring-red-200' : 'bg-neutral-50 border-neutral-200'
            }`}>
              <div className="flex justify-between items-center text-xs font-bold text-neutral-500 mb-1">
                <span>LEFT VECTOR</span>
                <span className="font-mono">GPIO 34</span>
              </div>
              <div className={`text-2xl font-extrabold font-mono ${flameSensors.left > adcThreshold ? 'text-red-600' : 'text-neutral-900'}`}>
                {flameSensors.left}
                <span className="text-xs text-neutral-500 font-normal ml-1">/ 4095</span>
              </div>
              <div className="w-full bg-neutral-200 h-2 rounded-full mt-2 overflow-hidden border border-neutral-300">
                <div
                  className={`h-full ${flameSensors.left > adcThreshold ? 'bg-red-500' : 'bg-neutral-400'}`}
                  style={{ width: `${Math.min(100, (flameSensors.left / 4095) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-neutral-500 mt-2">
                <span>Base: 0 ADC</span>
                <span className={`font-bold ${flameSensors.left > adcThreshold ? 'text-red-600' : 'text-neutral-900'}`}>
                  {flameSensors.left > adcThreshold ? 'ALERT' : 'NOMINAL'}
                </span>
              </div>
            </div>

            {/* Center */}
            <div className={`p-4 rounded-xl border transition ${
              flameSensors.center > adcThreshold ? 'bg-red-50 border-red-300 shadow-sm ring-1 ring-red-200' : 'bg-neutral-50 border-neutral-200'
            }`}>
              <div className="flex justify-between items-center text-xs font-bold text-neutral-500 mb-1">
                <span>CENTER VECTOR</span>
                <span className="font-mono">GPIO 32</span>
              </div>
              <div className={`text-2xl font-extrabold font-mono ${flameSensors.center > adcThreshold ? 'text-red-600' : 'text-neutral-900'}`}>
                {flameSensors.center}
                <span className="text-xs text-neutral-500 font-normal ml-1">/ 4095</span>
              </div>
              <div className="w-full bg-neutral-200 h-2 rounded-full mt-2 overflow-hidden border border-neutral-300">
                <div
                  className={`h-full ${flameSensors.center > adcThreshold ? 'bg-red-500' : 'bg-neutral-400'}`}
                  style={{ width: `${Math.min(100, (flameSensors.center / 4095) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-neutral-500 mt-2">
                <span>Base: 0 ADC</span>
                <span className={`font-bold ${flameSensors.center > adcThreshold ? 'text-red-600' : 'text-neutral-900'}`}>
                  {flameSensors.center > adcThreshold ? 'ALERT' : 'NOMINAL'}
                </span>
              </div>
            </div>

            {/* Right */}
            <div className={`p-4 rounded-xl border transition ${
              flameSensors.right > adcThreshold ? 'bg-red-50 border-red-300 shadow-sm ring-1 ring-red-200' : 'bg-neutral-50 border-neutral-200'
            }`}>
              <div className="flex justify-between items-center text-xs font-bold text-neutral-500 mb-1">
                <span>RIGHT VECTOR</span>
                <span className="font-mono">GPIO 35</span>
              </div>
              <div className={`text-2xl font-extrabold font-mono ${flameSensors.right > adcThreshold ? 'text-red-600' : 'text-neutral-900'}`}>
                {flameSensors.right}
                <span className="text-xs text-neutral-500 font-normal ml-1">/ 4095</span>
              </div>
              <div className="w-full bg-neutral-200 h-2 rounded-full mt-2 overflow-hidden border border-neutral-300">
                <div
                  className={`h-full ${flameSensors.right > adcThreshold ? 'bg-red-500' : 'bg-neutral-400'}`}
                  style={{ width: `${Math.min(100, (flameSensors.right / 4095) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-neutral-500 mt-2">
                <span>Base: 0 ADC</span>
                <span className={`font-bold ${flameSensors.right > adcThreshold ? 'text-red-600' : 'text-neutral-900'}`}>
                  {flameSensors.right > adcThreshold ? 'ALERT' : 'NOMINAL'}
                </span>
              </div>
            </div>
          </div>

          {/* Incident Log Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mb-4">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-neutral-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Search incident id, vector..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 focus:outline-none focus:border-black"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={filterDirection}
                onChange={e => setFilterDirection(e.target.value)}
                className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-medium text-neutral-800 focus:outline-none"
              >
                <option value="ALL">All Directions</option>
                <option value="Center">Center Cone</option>
                <option value="Left">Left Flank</option>
                <option value="Right">Right Cone</option>
              </select>

              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-medium text-neutral-800 focus:outline-none"
              >
                <option value="ALL">All Actions</option>
                <option value="Discharged">Discharged</option>
                <option value="None">Filtered</option>
              </select>
            </div>
          </div>

          {/* Incidents Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 uppercase font-sans font-bold">
                  <th className="py-2.5 px-3">Incident ID</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Vector</th>
                  <th className="py-2.5 px-3">Peak ADC</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredIncidents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-400 font-sans">
                      No fire incidents recorded. Vehicle is on nominal baseline patrol.
                    </td>
                  </tr>
                )}
                {filteredIncidents.map(inc => (
                  <tr
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`cursor-pointer transition hover:bg-neutral-50 ${
                      selectedIncident?.id === inc.id ? 'bg-neutral-100' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-neutral-900">{inc.id}</td>
                    <td className="py-3 px-3 text-neutral-500 font-sans">{inc.timestamp}</td>
                    <td className="py-3 px-3 font-semibold text-neutral-800 font-sans">{inc.vector}</td>
                    <td className="py-3 px-3 text-neutral-700">{inc.peakAdc}</td>
                    <td className="py-3 px-3 text-neutral-600 font-sans">{inc.action}</td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          inc.status === 'Extinguished'
                            ? 'bg-neutral-100 text-neutral-900 border border-neutral-300'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {inc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Selected Incident Detail Drawer */}
          {selectedIncident && (
            <div className="mt-5 pt-4 border-t border-neutral-100 bg-neutral-50 rounded-2xl p-4 border border-neutral-200">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-neutral-900 text-xs sm:text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-neutral-800 text-base">info</span>
                  Incident Dossier: {selectedIncident.id}
                </span>
                <span className="font-mono text-xs bg-neutral-100 text-neutral-900 border border-neutral-300 px-2.5 py-0.5 rounded-full font-bold">
                  {selectedIncident.status}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-neutral-500 block font-medium">Detection Vector</span>
                  <span className="font-bold text-neutral-900">{selectedIncident.vector}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block font-medium">Peak Radiation</span>
                  <span className="font-mono font-bold text-red-600">{selectedIncident.peakAdc} ADC</span>
                </div>
                <div>
                  <span className="text-neutral-500 block font-medium">Fluid Discharge</span>
                  <span className="font-mono font-bold text-neutral-900">{selectedIncident.fluidUsed}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block font-medium">Response Time</span>
                  <span className="font-mono font-bold text-neutral-900">{selectedIncident.responseDuration}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
