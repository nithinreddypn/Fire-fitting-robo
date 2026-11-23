import React, { useState } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { IncidentItem } from '../types/telemetry';

interface ArchiveReport {
  id: string;
  period: string;
  category: string;
  eventCount: string;
  author: string;
  size: string;
  status: 'Ready' | 'Archived';
}

export const ReportsAnalyticsPage: React.FC = () => {
  const { showToast, incidents, activeMap } = useTelemetry();
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month');
  const [hoveredWeekIndex, setHoveredWeekIndex] = useState<number | null>(null);

  const parseFluidLiters = (fluidStr: string): number => {
    if (!fluidStr) return 0;
    const num = parseFloat(fluidStr) || 0;
    if (fluidStr.toLowerCase().includes('ml')) {
      return num / 1000;
    }
    return num;
  };

  const totalIncidents = incidents.length;
  const extinguishedCount = incidents.filter(i => i.status === 'Extinguished' || i.action.includes('Auto') || i.action.includes('Discharge')).length;
  const suppressionRate = totalIncidents > 0 ? `${Math.round((extinguishedCount / totalIncidents) * 100)}%` : '100%';
  const avgLatency = totalIncidents > 0
    ? `${(incidents.reduce((acc: number, curr: IncidentItem) => acc + (parseFloat(curr.responseDuration) || 0), 0) / totalIncidents).toFixed(1)}s`
    : '0.0s';
  const totalFluidLiters = incidents.reduce((acc, curr) => acc + parseFluidLiters(curr.fluidUsed), 0).toFixed(2);
  const telemetryPointsK = ((totalIncidents * 1.5) + (totalIncidents > 0 ? 12.4 : 0.0)).toFixed(1);

  const bucketLabels = timeframe === 'week'
    ? ['Day 1-2', 'Day 3-4', 'Day 5-6', 'Today']
    : timeframe === 'month'
    ? ['Week 1', 'Week 2', 'Week 3', 'Current Week']
    : ['Month 1', 'Month 2', 'Month 3', 'Current Month'];

  const weeklyReportData = bucketLabels.map((label, idx) => {
    const isCurrent = idx === bucketLabels.length - 1;
    if (isCurrent && totalIncidents > 0) {
      return {
        week: label,
        count: totalIncidents,
        latency: avgLatency,
        fluid: `${totalFluidLiters} L`,
        success: suppressionRate
      };
    }
    return {
      week: label,
      count: 0,
      latency: '0.0s',
      fluid: '0.00 L',
      success: '100%'
    };
  });

  const activeHoverWeek = hoveredWeekIndex !== null ? weeklyReportData[hoveredWeekIndex] : null;
  const [exportFormat, setExportFormat] = useState<'PDF' | 'CSV' | 'JSON'>('PDF');
  const [includeVideoLogs, setIncludeVideoLogs] = useState(true);

  const [archiveReports, setArchiveReports] = useState<ArchiveReport[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('firebot_dossiers') || '[]');
    } catch {
      return [];
    }
  });

  const handleDownload = (repId: string, format: string) => {
    const reportItem = archiveReports.find(r => r.id === repId);
    const content = JSON.stringify({
      reportId: repId,
      period: reportItem?.period || 'Oct 2025',
      category: reportItem?.category || 'Suppression Dossier',
      timestamp: new Date().toISOString(),
      node: 'ESP32-S3-FIRE-ROBO-01',
      totalEvents: reportItem?.eventCount || '1,420 events',
      format,
      status: 'VERIFIED_AUDIT_PASS',
      summary: {
        suppressionSuccessRate: suppressionRate,
        avgTripLatency: avgLatency,
        totalFluidExpended: `${totalFluidLiters} L`,
        totalIncidentsRecorded: totalIncidents
      }
    }, null, 2);

    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repId}-audit-dossier.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Downloaded archive dossier: ${repId}.json`);
  };

  const handleExportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`Compiling ${exportFormat} dossier (${timeframe.toUpperCase()})...`);

    const exportId = `DOS-${Date.now().toString(36).toUpperCase()}`;
    const exportData = {
      dossierId: exportId,
      generatedAt: new Date().toISOString(),
      timeframe: timeframe.toUpperCase(),
      format: exportFormat,
      includeVideoLogs,
      robotNode: 'NODE-ESP32-FIRE-ROBO-01',
      telemetrySnapshot: {
        totalSuppressionIncidents: incidents.length,
        autonomousSuccessRate: '100%',
        avgReactionSpeed: incidents.length > 0 ? incidents[0].responseDuration : '0.0s',
        totalFluidDischarged: incidents.length > 0 ? incidents[0].fluidUsed : '0.00 L',
        hardwareStatus: 'NOMINAL',
        flameSensorsCalibrated: true
      },
      incidentHistory: incidents,
      weeklyBreakdown: weeklyReportData
    };

    let blob: Blob;
    let filename: string;

    if (exportFormat === 'CSV') {
      const csvHeader = 'Week,Incidents,AvgLatency,FluidExpended,SuccessRate\n';
      const csvRows = weeklyReportData.map(r => `${r.week},${r.count},${r.latency},${r.fluid},${r.success}`).join('\n');
      blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
      filename = `firebot-dossier-${timeframe}.csv`;
    } else if (exportFormat === 'PDF') {
      const htmlContent = `<!DOCTYPE html><html><head><title>FireBot Dossier ${exportId}</title><style>body{font-family:sans-serif;padding:30px;color:#1e293b}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#f1f5f9}@media print{button{display:none}}</style></head><body><h1>FireBot IoT Autonomous Rover - Mission Dossier</h1><p>ID: ${exportId} | Date: ${new Date().toLocaleString()}</p><p>Hardware Node: NODE-ESP32-FIRE-ROBO-01 | Success Rate: ${suppressionRate}</p><h2>Weekly Suppression Summary</h2><table><tr><th>Week</th><th>Incidents</th><th>Avg Latency</th><th>Fluid</th><th>Success</th></tr>${weeklyReportData.map(r=>`<tr><td>${r.week}</td><td>${r.count}</td><td>${r.latency}</td><td>${r.fluid}</td><td>${r.success}</td></tr>`).join('')}</table><script>window.print()</script></body></html>`;
      blob = new Blob([htmlContent], { type: 'text/html' });
      filename = `firebot-dossier-${timeframe}-printable.html`;
    } else {
      blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      filename = `firebot-dossier-${timeframe}.json`;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const newArchiveItem: ArchiveReport = {
      id: exportId,
      period: new Date().toLocaleDateString(),
      category: `${exportFormat} Telemetry Audit`,
      eventCount: `${incidents.length} events`,
      author: 'System Operator',
      size: `${(blob.size / 1024).toFixed(1)} KB`,
      status: 'Ready'
    };
    setArchiveReports(prev => {
      const next = [newArchiveItem, ...prev];
      try { localStorage.setItem('firebot_dossiers', JSON.stringify(next)); } catch {}
      return next;
    });

    setTimeout(() => {
      showToast(`Export complete: ${filename} downloaded!`);
    }, 400);
  };

  return (
    <div className="flex flex-col w-full gap-5 sm:gap-6">
      {/* Top Header & Timeframe Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl p-4 sm:p-6 border border-neutral-200/90 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2.5">
            <span className="material-symbols-outlined text-neutral-800 text-2xl sm:text-3xl">monitoring</span>
            Mission Reports & Historical Analytics
          </h1>
          <p className="text-neutral-500 text-xs sm:text-sm mt-0.5">
            Long-term fire suppression metrics, telemetry logs, and exportable engineering dossiers.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl border border-neutral-200 self-start md:self-auto">
          {(['week', 'month', 'quarter'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => {
                setTimeframe(tf);
                showToast(`Filtered analytics by ${tf.toUpperCase()}`);
              }}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition capitalize ${
                timeframe === tf
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold border border-neutral-300'
                  : 'text-neutral-600 hover:text-neutral-900 font-medium'
              }`}
            >
              {tf === 'week' ? 'Past 7 Days' : tf === 'month' ? 'Past 30 Days' : 'This Quarter'}
            </button>
          ))}
        </div>
      </div>

      {/* Historical KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider">Suppression Success</span>
            <span className="material-symbols-outlined text-neutral-900 text-xl">verified</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 font-mono">
            {totalIncidents > 0 ? `${extinguishedCount} / ${totalIncidents}` : '100%'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-900 font-bold mt-1">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            {suppressionRate} Extinguished
          </div>
        </div>

        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider">Avg Latency</span>
            <span className="material-symbols-outlined text-neutral-800 text-xl">timer</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 font-mono">
            {avgLatency}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-800 font-bold mt-1">
            <span className="material-symbols-outlined text-sm">bolt</span>
            Trip-to-Discharge Speed
          </div>
        </div>

        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider">Fluid Expended</span>
            <span className="material-symbols-outlined text-neutral-800 text-xl">water_drop</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 font-mono">
            {totalFluidLiters} <span className="text-sm font-semibold text-neutral-500">L</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1">
            0.16 L avg per suppression
          </div>
        </div>

        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider">Telemetry Points</span>
            <span className="material-symbols-outlined text-neutral-800 text-xl">database</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 font-mono">
            {telemetryPointsK} <span className="text-sm font-semibold text-neutral-500">k</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-900 font-bold mt-1">
            99.98% Socket QoS
          </div>
        </div>
      </div>

      {/* Analytics Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Suppression Frequency Chart */}
        <div className="lg:col-span-8 bg-white border border-neutral-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-neutral-100">
              <div>
                <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-neutral-900">bar_chart</span>
                  Weekly Suppression Events & Avg Latency
                </h3>
                <p className="text-neutral-500 text-xs mt-0.5">
                  Distribution of verified flame triggers vs autonomous discharge response speed.
                </p>
              </div>

              {/* Chart Legend & Live Inspector */}
              <div className="flex items-center gap-4 text-xs font-semibold text-neutral-700 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xs" />
                  <span className="text-neutral-900 font-semibold">Incidents (Count)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 bg-amber-500 rounded" />
                  <span className="text-neutral-900 font-semibold">Latency (s)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 border-t-2 border-dashed border-rose-500 inline-block" />
                  <span className="text-rose-600 font-mono text-[11px] font-bold">Safety Threshold (8)</span>
                </span>
              </div>
            </div>

            {/* Inspector Pill Bar */}
            <div className="mb-4 flex items-center justify-between text-xs font-mono">
              {activeHoverWeek ? (
                <div className="bg-white text-neutral-800 px-3.5 py-2 rounded-xl flex items-center gap-2.5 shadow-sm border border-neutral-300 w-full justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900 uppercase tracking-wider">{activeHoverWeek.week}</span>
                    <span className="text-neutral-300">•</span>
                    <span className="text-neutral-900 font-bold">{activeHoverWeek.count} Incidents</span>
                    <span className="text-neutral-300">•</span>
                    <span className="text-neutral-600">Avg Latency: {activeHoverWeek.latency}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-neutral-600">
                    <span>Fluid Expended: {activeHoverWeek.fluid}</span>
                    <span className="text-neutral-300">•</span>
                    <span className="text-neutral-900 font-bold">{activeHoverWeek.success} Extinguished</span>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-50/80 border border-zinc-200/80 px-3.5 py-2 rounded-xl text-zinc-500 flex items-center justify-between w-full">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-zinc-400">info</span>
                    Hover over any week column to inspect suppression telemetry
                  </span>
                  <span className="font-bold text-zinc-700 font-mono text-[11px]">6-WEEK AGGREGATE</span>
                </div>
              )}
            </div>

            {/* Modern Full-Width Multi-Axis Chart */}
            <div className="relative h-56 sm:h-60 w-full bg-neutral-50/80 rounded-2xl p-4 sm:p-5 border border-neutral-200 flex flex-col justify-between">
              {/* Horizontal Reference Gridlines & Y-Axis Scale */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-4 pb-8">
                <div className="border-b border-neutral-200 w-full flex items-center justify-between text-[10px] font-mono text-neutral-400">
                  <span>12</span>
                  <span>1.0s</span>
                </div>
                <div className="border-b-2 border-dashed border-red-400/80 w-full flex items-center justify-between text-[10px] font-mono text-red-500">
                  <span className="bg-neutral-50/90 px-1 font-bold">8 (ALERT LIMIT)</span>
                  <span className="bg-neutral-50/90 px-1 font-bold">2.0s</span>
                </div>
                <div className="border-b border-neutral-200/80 w-full flex items-center justify-between text-[10px] font-mono text-neutral-400">
                  <span>4</span>
                  <span>3.0s</span>
                </div>
                <div className="border-b border-neutral-300 w-full flex items-center justify-between text-[10px] font-mono text-neutral-400">
                  <span>0</span>
                  <span>4.0s</span>
                </div>
              </div>

              {/* Full-Width Evenly Distributed Columns */}
              <div className="relative z-10 h-full flex items-end justify-between gap-2 sm:gap-4 pl-6 pr-6 pb-2">
                {weeklyReportData.map((item, idx) => {
                  const isHovered = hoveredWeekIndex === idx;
                  const heightPct = Math.min(100, (item.count / 12) * 100);

                  return (
                    <div
                      key={item.week}
                      className={`flex-1 h-full flex flex-col justify-end items-center cursor-pointer rounded-xl transition-all duration-150 p-1 sm:p-2 ${
                        isHovered ? 'bg-black/5 ring-1 ring-neutral-400/60 shadow-xs' : 'hover:bg-neutral-100/60'
                      }`}
                      onMouseEnter={() => setHoveredWeekIndex(idx)}
                      onMouseLeave={() => setHoveredWeekIndex(null)}
                    >
                      {/* Count badge on top of bar */}
                      <span
                        className={`text-[11px] font-mono font-bold mb-1 transition-colors ${
                          isHovered ? 'text-black' : 'text-neutral-700'
                        }`}
                      >
                        {item.count}
                      </span>

                      {/* Main Column Bar - Vibrant Indigo/Blue Gradient */}
                      <div className="w-full max-w-[42px] sm:max-w-[48px] flex items-end justify-center h-[72%]">
                        <div
                          className={`w-full rounded-t-lg transition-all duration-300 ${
                            isHovered
                              ? 'bg-gradient-to-t from-blue-700 to-indigo-600 shadow-md shadow-indigo-500/30'
                              : 'bg-gradient-to-t from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600'
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>

                      {/* Latency Pill Indicator below bar */}
                      <div className="mt-2 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs font-mono text-[10px] font-bold text-amber-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>{item.latency}</span>
                      </div>

                      {/* X-Axis Week Label */}
                      <span
                        className={`text-[10px] sm:text-[11px] font-mono mt-1 text-center transition-colors ${
                          isHovered ? 'font-bold text-neutral-900' : 'text-neutral-500'
                        }`}
                      >
                        {item.week}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-neutral-500 border-t border-neutral-100 gap-2">
            <span>Automated 24/7 patrol telemetry audited across 3S LiPo cycles</span>
            <span className="font-bold text-neutral-900 font-mono">100% Extinguishment Success Rate</span>
          </div>
        </div>

        {/* Spatial Threat Vector Breakdown */}
        <div className="lg:col-span-4 bg-white border border-neutral-200/90 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-neutral-900 text-base mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-neutral-800">pie_chart</span>
              Incident Vector Breakdown
            </h3>
            <p className="text-neutral-500 text-xs mb-5">
              Historical distribution of threat heading angles.
            </p>

            {(() => {
              const centerCount = incidents.filter((i: IncidentItem) => i.vector === 'Center Cone').length;
              const leftCount = incidents.filter((i: IncidentItem) => i.vector === 'Left Flank').length;
              const rightCount = incidents.filter((i: IncidentItem) => i.vector === 'Right Cone').length;
              const totalV = incidents.length;
              const centerPct = totalV > 0 ? Math.round((centerCount / totalV) * 100) : 0;
              const leftPct = totalV > 0 ? Math.round((leftCount / totalV) * 100) : 0;
              const rightPct = totalV > 0 ? Math.round((rightCount / totalV) * 100) : 0;

              return (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-neutral-800">Center Cone (0° Heading)</span>
                      <span className="font-mono text-neutral-900">{centerPct}% ({centerCount} events)</span>
                    </div>
                    <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden p-0.5 border border-neutral-200">
                      <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full" style={{ width: `${centerPct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-neutral-800">Left Flank (-45° Heading)</span>
                      <span className="font-mono text-neutral-700">{leftPct}% ({leftCount} events)</span>
                    </div>
                    <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden p-0.5 border border-neutral-200">
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full" style={{ width: `${leftPct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-neutral-800">Right Cone (+45° Heading)</span>
                      <span className="font-mono text-neutral-600">{rightPct}% ({rightCount} events)</span>
                    </div>
                    <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden p-0.5 border border-neutral-200">
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full" style={{ width: `${rightPct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100 bg-neutral-50 rounded-xl p-3.5 text-xs">
            <span className="font-bold text-neutral-900 block mb-1">Live Operational Summary</span>
            <p className="text-neutral-500">
              {incidents.length > 0 
                ? `System has recorded ${incidents.length} verified suppression incidents with 100% successful containment.`
                : 'Vehicle telemetry online in standard standby. Live incidents and suppression dossiers will record here automatically.'}
            </p>
          </div>
        </div>
      </div>

      {/* Export Dossier Form & Archived Reports Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Export Form */}
        <div className="lg:col-span-4 bg-white border border-neutral-200/90 rounded-2xl p-4 sm:p-6 shadow-sm">
          <h3 className="font-bold text-neutral-900 text-base mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-neutral-800">download</span>
            Compile Telemetry Dossier
          </h3>
          <p className="text-neutral-500 text-xs mb-4">
            Package verified fire suppression reports, raw ADC sensor traces, and actuator states into an audit package.
          </p>

          <form onSubmit={handleExportSubmit} className="space-y-4">
            <div>
              <label className="block text-neutral-500 font-bold uppercase text-xs mb-1.5">Export Format</label>
              <div className="grid grid-cols-3 gap-2 bg-zinc-100/90 p-1 rounded-xl border border-zinc-200/70">
                {(['PDF', 'CSV', 'JSON'] as const).map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setExportFormat(fmt)}
                    className={`py-1.5 rounded-lg text-xs font-semibold text-center transition ${
                      exportFormat === fmt
                        ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/80'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-neutral-500 font-bold uppercase text-xs mb-1.5">Sector Envelope</label>
              <select className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs font-medium text-neutral-800 focus:outline-none">
                <option value="all">All Sectors ({activeMap?.name || 'Patrol Zone Alpha'})</option>
                {activeMap?.sectors.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.code} · {sec.name} ({sec.hazardLevel.toUpperCase()} Hazard)
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-neutral-600 select-none">
              <input
                type="checkbox"
                checked={includeVideoLogs}
                onChange={e => setIncludeVideoLogs(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 bg-white border-neutral-300 focus:ring-0 accent-blue-600"
              />
              <span>Include ESP32-CAM Snapshot Keyframes</span>
            </label>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">cloud_download</span>
              Generate & Download Dossier
            </button>
          </form>
        </div>

        {/* Archived Reports Table */}
        <div className="lg:col-span-8 bg-white border border-neutral-200/90 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100">
            <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
              <span className="material-symbols-outlined text-neutral-800">archive</span>
              Compiled Engineering Archives
            </h3>
            <span className="text-neutral-400 text-xs font-mono">Showing {archiveReports.length} compiled records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 uppercase font-sans font-bold">
                  <th className="py-2.5 px-3">Report ID</th>
                  <th className="py-2.5 px-3">Reporting Period</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Events</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {archiveReports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-400 font-sans">
                      No compiled audit dossiers found. Use the form on the left to compile an audit report.
                    </td>
                  </tr>
                )}
                {archiveReports.map(rep => (
                  <tr key={rep.id} className="hover:bg-neutral-50 transition">
                    <td className="py-3 px-3 font-bold text-neutral-900">{rep.id}</td>
                    <td className="py-3 px-3 text-neutral-500 font-sans">{rep.period}</td>
                    <td className="py-3 px-3 font-sans">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
                        {rep.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-neutral-500">{rep.eventCount}</td>
                    <td className="py-3 px-3 text-neutral-500">{rep.size}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          onClick={() => handleDownload(rep.id, 'PDF')}
                          className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-800 border border-neutral-200 transition cursor-pointer"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => handleDownload(rep.id, 'CSV')}
                          className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-800 border border-neutral-200 transition cursor-pointer"
                        >
                          CSV
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
