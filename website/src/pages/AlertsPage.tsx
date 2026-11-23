import React, { useState } from 'react';
import { useTelemetry } from '../context/TelemetryContext';

export const AlertsPage: React.FC = () => {
  const { alerts, acknowledgeAlert, clearAcknowledgedAlerts, showToast, setCurrentPage } = useTelemetry();
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [selectedAlertIds, setSelectedAlertIds] = useState<string[]>([]);
  const [autoAcknowledge, setAutoAcknowledge] = useState(false);
  const [audioAlarms, setAudioAlarms] = useState(true);
  const [inspectedAlert, setInspectedAlert] = useState<any | null>(null);

  const filteredAlerts = alerts.filter(alert => {
    if (activeFilter === 'all') return true;
    return alert.severity === activeFilter;
  });

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const infoCount = alerts.filter(a => a.severity === 'info').length;

  const toggleSelectAlert = (id: string) => {
    if (selectedAlertIds.includes(id)) {
      setSelectedAlertIds(selectedAlertIds.filter(i => i !== id));
    } else {
      setSelectedAlertIds([...selectedAlertIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedAlertIds.length === filteredAlerts.length) {
      setSelectedAlertIds([]);
    } else {
      setSelectedAlertIds(filteredAlerts.map(a => a.id));
    }
  };

  const handleAcknowledgeSingle = (id: string) => {
    acknowledgeAlert(id);
  };

  const handleAcknowledgeSelected = () => {
    if (selectedAlertIds.length === 0) return;
    selectedAlertIds.forEach(id => acknowledgeAlert(id));
    showToast(`Acknowledged ${selectedAlertIds.length} alert(s).`);
    setSelectedAlertIds([]);
  };

  const handleClearAcknowledged = () => {
    clearAcknowledgedAlerts();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 text-xs font-mono font-bold tracking-wider inline-flex items-center gap-1.5 border border-neutral-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              INCIDENT EVENT LOGS
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Safety & System Alerts
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Real-time multisensor thresholds, hardware watchdog triggers, and emergency fault escalation.
          </p>
        </div>

        {/* Global Alert Actions */}
        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          <button
            onClick={handleClearAcknowledged}
            className="px-3.5 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-800 text-xs sm:text-sm font-bold transition flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">clear_all</span>
            <span>Clear Ack'd</span>
          </button>
          <button
            onClick={handleAcknowledgeSelected}
            disabled={selectedAlertIds.length === 0}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition ${
              selectedAlertIds.length > 0
                ? 'bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs border border-zinc-900/10 active:scale-[0.98] cursor-pointer font-medium'
                : 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-base">done_all</span>
            <span>Acknowledge ({selectedAlertIds.length})</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Total */}
        <div
          onClick={() => setActiveFilter('all')}
          className={`cursor-pointer p-4 sm:p-5 rounded-2xl border transition-all ${
            activeFilter === 'all'
              ? 'bg-neutral-100 text-neutral-900 border-neutral-400 ring-1 ring-neutral-300 shadow-2xs font-bold'
              : 'bg-white text-neutral-900 border-neutral-200 hover:border-neutral-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[11px] uppercase font-bold tracking-wider ${activeFilter === 'all' ? 'text-neutral-700' : 'text-neutral-500'}`}>
              Total Active
            </span>
            <span className="material-symbols-outlined text-xl">notifications_active</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight">{alerts.length}</div>
          <div className={`text-xs mt-1 font-medium ${activeFilter === 'all' ? 'text-neutral-700' : 'text-neutral-500'}`}>
            Across all rover nodes
          </div>
        </div>

        {/* Critical */}
        <div
          onClick={() => setActiveFilter('critical')}
          className={`cursor-pointer p-4 sm:p-5 rounded-2xl border transition-all ${
            activeFilter === 'critical'
              ? 'bg-red-50 border-red-400 ring-1 ring-red-400 shadow-xs'
              : 'bg-white border-neutral-200 hover:border-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between text-red-600 mb-1.5">
            <span className="text-[11px] uppercase font-bold tracking-wider">Critical</span>
            <span className="material-symbols-outlined text-xl">error</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-red-600 tracking-tight">{criticalCount}</div>
          <div className="text-xs text-red-600/80 mt-1 font-medium">Urgent suppression needed</div>
        </div>

        {/* Warning */}
        <div
          onClick={() => setActiveFilter('warning')}
          className={`cursor-pointer p-4 sm:p-5 rounded-2xl border transition-all ${
            activeFilter === 'warning'
              ? 'bg-neutral-100 border-neutral-600 ring-1 ring-neutral-400 shadow-xs'
              : 'bg-white border-neutral-200 hover:border-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-900 mb-1.5">
            <span className="text-[11px] uppercase font-bold tracking-wider text-neutral-600">Warnings</span>
            <span className="material-symbols-outlined text-xl text-neutral-700">warning</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-neutral-900 tracking-tight">{warningCount}</div>
          <div className="text-xs text-neutral-500 mt-1 font-medium">Sensor trip threshold</div>
        </div>

        {/* Informational */}
        <div
          onClick={() => setActiveFilter('info')}
          className={`cursor-pointer p-4 sm:p-5 rounded-2xl border transition-all ${
            activeFilter === 'info'
              ? 'bg-neutral-100 border-neutral-400 ring-1 ring-neutral-300 shadow-xs'
              : 'bg-white border-neutral-200 hover:border-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-700 mb-1.5">
            <span className="text-[11px] uppercase font-bold tracking-wider text-neutral-500">Informational</span>
            <span className="material-symbols-outlined text-xl text-neutral-600">info</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-neutral-800 tracking-tight">{infoCount}</div>
          <div className="text-xs text-neutral-500 mt-1 font-medium">Patrol audit logs</div>
        </div>
      </div>

      {/* Main Alerts Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left 8 Cols: Alerts List */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Filter Bar */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="inline-flex bg-neutral-100 p-1 rounded-xl border border-neutral-200">
              {[
                { id: 'all', label: 'All Alerts' },
                { id: 'critical', label: 'Critical' },
                { id: 'warning', label: 'Warning' },
                { id: 'info', label: 'Info' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeFilter === tab.id
                      ? 'bg-white text-neutral-900 shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {selectedAlertIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 text-xs font-mono">{selectedAlertIds.length} selected</span>
                <button
                  onClick={handleAcknowledgeSelected}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl transition shadow-2xs border border-neutral-300 active:scale-[0.98]"
                >
                  Ack Selected
                </button>
              </div>
            )}
          </div>

          {/* Select all bar */}
          <div className="flex items-center justify-between px-2 text-neutral-500 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filteredAlerts.length > 0 && selectedAlertIds.length === filteredAlerts.length}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded text-blue-600 bg-neutral-100 border-neutral-300 focus:ring-0 cursor-pointer accent-blue-600"
              />
              <span className="font-semibold uppercase tracking-wider text-[11px] text-neutral-700">Select All in View</span>
            </label>
            <span className="font-mono text-[11px] text-neutral-500">{filteredAlerts.length} items</span>
          </div>

          {/* Alert Cards - Ultra clean uniform cards with NO ugly asymmetric borders */}
          <div className="space-y-3">
            {filteredAlerts.map(alert => {
              const isSelected = selectedAlertIds.includes(alert.id);

              return (
                <div
                  key={alert.id}
                  className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected
                      ? 'border-blue-500 ring-1 ring-blue-500/30 bg-blue-50/20'
                      : 'border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectAlert(alert.id)}
                      className="mt-1 w-4 h-4 rounded text-blue-600 bg-neutral-100 border-neutral-300 focus:ring-0 cursor-pointer accent-blue-600 shrink-0"
                    />

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {/* Status Chip */}
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-md inline-flex items-center gap-1.5 ${
                            alert.severity === 'critical'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : alert.severity === 'warning'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}
                        >
                          {alert.severity === 'critical' && <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span>}
                          {alert.severity}
                        </span>

                        <span className="font-mono text-xs font-semibold text-neutral-500">{alert.id}</span>
                        <span className="text-neutral-300">&middot;</span>
                        <span className="font-mono text-xs text-neutral-500">{alert.node}</span>
                        <span className="text-neutral-300">&middot;</span>
                        <span className="text-xs text-neutral-400 font-medium">{alert.timeAgo}</span>
                      </div>

                      <h4 className="font-bold text-neutral-900 text-sm sm:text-base leading-snug">{alert.title}</h4>
                      <p className="text-neutral-600 text-xs sm:text-sm mt-0.5 leading-relaxed">{alert.desc}</p>

                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        {alert.code && (
                          <div className="font-mono text-[11px] bg-slate-50 px-2.5 py-0.5 rounded-md text-slate-700 border border-slate-200 font-medium">
                            {alert.code}
                          </div>
                        )}
                        {alert.metric && (
                          <div className="font-mono text-[11px] bg-amber-50/60 px-2.5 py-0.5 rounded-md text-amber-900 border border-amber-200/70 font-medium">
                            {alert.metric}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      onClick={() => setInspectedAlert(alert)}
                      className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      Inspect
                    </button>

                    {alert.acknowledged ? (
                      <span className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-neutral-100 text-neutral-500 text-xs font-bold rounded-xl flex items-center gap-1 border border-neutral-200">
                        <span className="material-symbols-outlined text-[16px] text-neutral-900">check</span>
                        Ack'd
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAcknowledgeSingle(alert.id)}
                        className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs border border-emerald-200 active:scale-[0.98] cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">done</span>
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredAlerts.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200">
                <span className="material-symbols-outlined text-4xl sm:text-5xl text-neutral-400 mb-2">task_alt</span>
                <h3 className="font-bold text-neutral-900 text-base">All clear in this filter category</h3>
                <p className="text-xs text-neutral-500 mt-1">No pending unacknowledged alerts currently reported.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Alert Settings & Escalation Matrix */}
        <div className="lg:col-span-4 space-y-5">
          {/* Hardware Watchdog Dispatch Panel */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-6 shadow-xs">
            <h3 className="font-bold text-neutral-900 text-base mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-neutral-800">settings_alert</span>
              Watchdog Dispatch
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center border border-neutral-200">
                    <span className="material-symbols-outlined text-xl">sync_alt</span>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-neutral-900">Auto-Ack Heartbeats</p>
                    <p className="text-[11px] text-neutral-500">Auto resolve QoS 1 checks</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoAcknowledge}
                  onChange={e => {
                    setAutoAcknowledge(e.target.checked);
                    showToast(e.target.checked ? 'Auto-acknowledge enabled' : 'Auto-acknowledge disabled');
                  }}
                  className="w-4 h-4 rounded text-blue-600 bg-neutral-100 border-neutral-300 focus:ring-0 cursor-pointer accent-blue-600"
                />
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center border border-neutral-200">
                    <span className="material-symbols-outlined text-xl">volume_up</span>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-neutral-900">Audio Alarm (Buzzer)</p>
                    <p className="text-[11px] text-neutral-500">Chirp on Critical Flame spike</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={audioAlarms}
                  onChange={e => {
                    setAudioAlarms(e.target.checked);
                    showToast(e.target.checked ? 'Audio alarms unmuted' : 'Audio alarms muted');
                  }}
                  className="w-4 h-4 rounded text-blue-600 bg-neutral-100 border-neutral-300 focus:ring-0 cursor-pointer accent-blue-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center border border-neutral-200">
                    <span className="material-symbols-outlined text-xl">campaign</span>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-neutral-900">Vehicle Acoustic Siren</p>
                    <p className="text-[11px] text-neutral-500">GPIO 26 Piezo (85 dB)</p>
                  </div>
                </div>
                <span className="font-mono text-[11px] bg-neutral-100 text-neutral-900 border border-neutral-300 px-2 py-0.5 rounded-full font-bold">
                  ARMED
                </span>
              </div>
            </div>
          </div>

          {/* Escalation Matrix - Uniform Clean Cards */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-6 shadow-xs">
            <h3 className="font-bold text-neutral-900 text-base mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-neutral-800">shield</span>
              Escalation Matrix
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60 hover:bg-neutral-50 transition">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-red-600"></span>
                  <p className="font-bold text-xs text-red-600 uppercase tracking-wider">Priority 1 (Critical)</p>
                </div>
                <p className="text-neutral-600 text-[11px] leading-relaxed">
                  ADC &gt; 2800 or Hardware E-Stop. Immediate audio buzzer, push notification, and automated spray.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60 hover:bg-neutral-50 transition">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <p className="font-bold text-xs text-amber-700 uppercase tracking-wider">Priority 2 (Warning)</p>
                </div>
                <p className="text-neutral-600 text-[11px] leading-relaxed">
                  Reservoir &lt; 20%, Wi-Fi RSSI &lt; -75 dBm, or battery &lt; 25%. Dispatched to operator queue.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60 hover:bg-neutral-50 transition">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  <p className="font-bold text-xs text-sky-700 uppercase tracking-wider">Priority 3 (Informational)</p>
                </div>
                <p className="text-neutral-600 text-[11px] leading-relaxed">
                  Patrol sweep completion, sensor calibration routines, and daily system heartbeat logs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
        {/* Alert Inspection Modal */}
      {inspectedAlert && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-neutral-200 animate-slideUp">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-800">
                  {inspectedAlert.id}
                </span>
                <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${
                  inspectedAlert.severity === 'critical' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-neutral-100 text-neutral-800 border border-neutral-200'
                }`}>
                  {inspectedAlert.severity}
                </span>
              </div>
              <button
                onClick={() => setInspectedAlert(null)}
                className="w-8 h-8 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 flex items-center justify-center transition"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <h3 className="font-extrabold text-neutral-900 text-lg leading-tight mb-2">
              {inspectedAlert.title}
            </h3>
            <p className="text-neutral-600 text-xs sm:text-sm leading-relaxed mb-4">
              {inspectedAlert.desc}
            </p>

            <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200 space-y-2 text-xs font-mono mb-5">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 font-sans">Hardware Node:</span>
                <span className="font-bold text-neutral-900">{inspectedAlert.node}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 font-sans">Reported Time:</span>
                <span className="text-neutral-700">{inspectedAlert.timestamp} ({inspectedAlert.timeAgo})</span>
              </div>
              {inspectedAlert.code && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-sans">Telemetry Trace:</span>
                  <span className="font-bold text-red-600">{inspectedAlert.code}</span>
                </div>
              )}
              {inspectedAlert.metric && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-sans">Metric Value:</span>
                  <span className="font-bold text-neutral-800">{inspectedAlert.metric}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => {
                  if (inspectedAlert.severity === 'critical') {
                    setCurrentPage('fire-detection');
                  } else if (inspectedAlert.desc.includes('Fluid')) {
                    setCurrentPage('dashboard');
                  } else {
                    setCurrentPage('live-monitoring');
                  }
                  setInspectedAlert(null);
                }}
                className="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-800 text-xs font-semibold transition"
              >
                Go to Subsystem
              </button>

              {!inspectedAlert.acknowledged && (
                <button
                  onClick={() => {
                    acknowledgeAlert(inspectedAlert.id);
                    setInspectedAlert(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-xs"
                >
                  Acknowledge Alert
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
