import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../../context/TelemetryContext';

interface SpatialThreatRadarHUDProps {
  className?: string;
  showControls?: boolean;
}

export const SpatialThreatRadarHUD: React.FC<SpatialThreatRadarHUDProps> = ({
  className = '',
  showControls = true
}) => {
  const {
    fireDetected,
    flameSensors,
    adcThreshold,
    servoAngle,
    setServoAngle,
    pumpActive,
    togglePump,
    showToast
  } = useTelemetry();

  // Radar beam sweep animation (0° to 180°)
  const [sweepAngle, setSweepAngle] = useState<number>(45);
  const [sweepDirection, setSweepDirection] = useState<'up' | 'down'>('up');

  // Simulated 5-channel readings for test mode
  const [activeChannelOverride, setActiveChannelOverride] = useState<number | null>(null);

  // Smooth sweep line
  useEffect(() => {
    const sweepInterval = setInterval(() => {
      setSweepAngle(prev => {
        if (prev >= 175) {
          setSweepDirection('down');
          return 174;
        } else if (prev <= 5) {
          setSweepDirection('up');
          return 6;
        }
        return sweepDirection === 'up' ? prev + 3 : prev - 3;
      });
    }, 40);
    return () => clearInterval(sweepInterval);
  }, [sweepDirection]);

  // 5 Hardware sensor channels from fireauto.ino
  const channels = [
    {
      id: 'L',
      name: 'Left Flank',
      angle: 0,
      servoTarget: 0,
      gpio: 'GPIO 34',
      value: activeChannelOverride === 0 ? 3620 : flameSensors.left || 420
    },
    {
      id: 'FL',
      name: 'Front-Left',
      angle: 45,
      servoTarget: 45,
      gpio: 'GPIO 33',
      value: activeChannelOverride === 1 ? 3850 : flameSensors.frontLeft || 390
    },
    {
      id: 'FC',
      name: 'Front-Center',
      angle: 90,
      servoTarget: 90,
      gpio: 'GPIO 32',
      value: activeChannelOverride === 2 ? 3980 : flameSensors.center || 412
    },
    {
      id: 'FR',
      name: 'Front-Right',
      angle: 135,
      servoTarget: 135,
      gpio: 'GPIO 35',
      value: activeChannelOverride === 3 ? 3740 : flameSensors.frontRight || 405
    },
    {
      id: 'R',
      name: 'Right Flank',
      angle: 180,
      servoTarget: 180,
      gpio: 'GPIO 39',
      value: activeChannelOverride === 4 ? 3590 : flameSensors.right || 435
    }
  ];

  const maxChannel = channels.reduce((prev, curr) => (curr.value > prev.value ? curr : prev), channels[0]);
  const isThreatDetected = fireDetected || activeChannelOverride !== null || maxChannel.value > (adcThreshold || 2800);

  // Automatically update servo targeting if threat detected
  useEffect(() => {
    if (isThreatDetected && maxChannel.value > 2000) {
      setServoAngle(maxChannel.servoTarget);
    }
  }, [isThreatDetected, maxChannel.servoTarget, maxChannel.value, setServoAngle]);

  const handleTriggerChannel = (index: number) => {
    setActiveChannelOverride(index);
    const ch = channels[index];
    setServoAngle(ch.servoTarget);
    showToast(`Simulation: Flame locked on ${ch.name} (${ch.angle}°, ${ch.gpio}). Nozzle servo slewed to ${ch.servoTarget}°.`);
  };

  const handleClearOverride = () => {
    setActiveChannelOverride(null);
    setServoAngle(90);
    showToast('Simulation cleared. Extinguisher servo returned to 90° center.');
  };

  // SVG Geometry
  const cx = 210;
  const cy = 215;
  const maxRadius = 175;

  const sweepRad = (sweepAngle * Math.PI) / 180;
  const sweepX = cx - maxRadius * Math.cos(sweepRad);
  const sweepY = cy - maxRadius * Math.sin(sweepRad);

  const trailAngle = sweepDirection === 'up' ? Math.max(0, sweepAngle - 20) : Math.min(180, sweepAngle + 20);
  const trailRad = (trailAngle * Math.PI) / 180;
  const trailX = cx - maxRadius * Math.cos(trailRad);
  const trailY = cy - maxRadius * Math.sin(trailRad);

  const servoRad = (servoAngle * Math.PI) / 180;
  const servoArmLength = 105;
  const servoTipX = cx - servoArmLength * Math.cos(servoRad);
  const servoTipY = cy - servoArmLength * Math.sin(servoRad);

  const sprayLength = 160;
  const sprayRad1 = ((servoAngle - 12) * Math.PI) / 180;
  const sprayRad2 = ((servoAngle + 12) * Math.PI) / 180;
  const sprayX1 = cx - sprayLength * Math.cos(sprayRad1);
  const sprayY1 = cy - sprayLength * Math.sin(sprayRad1);
  const sprayX2 = cx - sprayLength * Math.cos(sprayRad2);
  const sprayY2 = cy - sprayLength * Math.sin(sprayRad2);

  return (
    <div className={`bg-white rounded-2xl border border-[#EAE4D9] shadow-xs overflow-hidden flex flex-col ${className}`}>
      {/* Clean White Card Header */}
      <div className="px-5 py-4 border-b border-[#F4EFE6] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-2xs ${
            isThreatDetected ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-[#F4EFE6] text-stone-800 border-[#EAE4D9]'
          }`}>
            <span className="material-symbols-outlined text-xl">
              {isThreatDetected ? 'local_fire_department' : 'radar'}
            </span>
          </div>
          <div>
            <h3 className="font-extrabold text-base text-stone-900 leading-tight">
              180° Spatial Threat Radar
            </h3>
            <p className="text-xs text-stone-500">
              5-Channel IR Photodiodes · Nozzle Servo (GPIO 13)
            </p>
          </div>
        </div>

        {/* Threat Badge */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-mono border ${
            isThreatDetected ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isThreatDetected ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
            <span>{isThreatDetected ? `Hazard: ${maxChannel.name}` : 'Sector Clear'}</span>
          </span>
          <span className="text-xs font-mono font-bold text-stone-600 hidden sm:inline">
            Servo: {servoAngle}°
          </span>
        </div>
      </div>

      {/* Main Radar Screen Viewport - Clean Warm Cream Palette */}
      <div className="relative w-full aspect-[16/10] bg-[#FAF7F2] p-3 flex items-center justify-center select-none overflow-hidden">
        <svg viewBox="0 0 420 235" className="w-full h-full">
          <defs>
            <radialGradient id="threat-light-bg" cx="50%" cy="100%" r="95%">
              <stop offset="0%" stopColor="#F5EFE3" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#FAF7F2" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
            </radialGradient>

            <radialGradient id="threat-sweep-cone" cx="50%" cy="100%" r="100%">
              <stop offset="0%" stopColor="#F97316" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#F97316" stopOpacity="0.0" />
            </radialGradient>

            <linearGradient id="threat-water-spray" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Semi-Circle Field */}
          <path d={`M ${cx - maxRadius} ${cy} A ${maxRadius} ${maxRadius} 0 0 1 ${cx + maxRadius} ${cy} Z`} fill="url(#threat-light-bg)" stroke="#E5DDD0" strokeWidth="1" />

          {/* Range Arcs */}
          {/* 4000 ADC */}
          <path d={`M ${cx - maxRadius} ${cy} A ${maxRadius} ${maxRadius} 0 0 1 ${cx + maxRadius} ${cy}`} fill="none" stroke="#D8CEBD" strokeWidth="1.2" />
          {/* 3000 ADC */}
          <path d={`M ${cx - maxRadius * 0.75} ${cy} A ${maxRadius * 0.75} ${maxRadius * 0.75} 0 0 1 ${cx + maxRadius * 0.75} ${cy}`} fill="none" stroke="#D8CEBD" strokeWidth="1" strokeDasharray="4 3" />
          {/* 2000 ADC */}
          <path d={`M ${cx - maxRadius * 0.5} ${cy} A ${maxRadius * 0.5} ${maxRadius * 0.5} 0 0 1 ${cx + maxRadius * 0.5} ${cy}`} fill="none" stroke="#D8CEBD" strokeWidth="1" />
          {/* 1000 ADC */}
          <path d={`M ${cx - maxRadius * 0.25} ${cy} A ${maxRadius * 0.25} ${maxRadius * 0.25} 0 0 1 ${cx + maxRadius * 0.25} ${cy}`} fill="none" stroke="#D8CEBD" strokeWidth="1" strokeDasharray="3 3" />

          {/* Range Labels */}
          <text x={cx} y="52" fontSize="7.5" fill="#64748B" fontFamily="monospace" textAnchor="middle" fontWeight="bold">4000 ADC (2.0m)</text>
          <text x={cx} y="96" fontSize="7.5" fill="#94A3B8" fontFamily="monospace" textAnchor="middle">3000 ADC</text>
          <text x={cx} y="138" fontSize="7.5" fill="#94A3B8" fontFamily="monospace" textAnchor="middle">2000 ADC</text>
          <text x={cx} y="180" fontSize="7" fill="#94A3B8" fontFamily="monospace" textAnchor="middle">1000 ADC</text>

          {/* Spoke lines for 5 sensors */}
          {channels.map(ch => {
            const rad = (ch.angle * Math.PI) / 180;
            const x2 = cx - maxRadius * Math.cos(rad);
            const y2 = cy - maxRadius * Math.sin(rad);
            const isTarget = isThreatDetected && ch.id === maxChannel.id;

            return (
              <g key={ch.id}>
                <line
                  x1={cx}
                  y1={cy}
                  x2={x2}
                  y2={y2}
                  stroke={isTarget ? '#EF4444' : '#E2E8F0'}
                  strokeWidth={isTarget ? 2 : 1}
                />
                <text
                  x={cx - (maxRadius + 14) * Math.cos(rad)}
                  y={cy - (maxRadius + 14) * Math.sin(rad) + 4}
                  fontSize="8"
                  fontFamily="monospace"
                  fill={isTarget ? '#EF4444' : '#64748B'}
                  fontWeight={isTarget ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {ch.angle}° ({ch.id})
                </text>
              </g>
            );
          })}

          {/* Sweeping Cone */}
          <path
            d={`M ${cx} ${cy} L ${sweepX} ${sweepY} A ${maxRadius} ${maxRadius} 0 0 ${sweepDirection === 'up' ? 0 : 1} ${trailX} ${trailY} Z`}
            fill="url(#threat-sweep-cone)"
          />

          {/* Sweeping Line */}
          <line
            x1={cx}
            y1={cy}
            x2={sweepX}
            y2={sweepY}
            stroke="#F97316"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Water spray cone (when pump active) */}
          {pumpActive && (
            <path
              d={`M ${servoTipX} ${servoTipY} L ${sprayX1} ${sprayY1} A ${sprayLength} ${sprayLength} 0 0 1 ${sprayX2} ${sprayY2} Z`}
              fill="url(#threat-water-spray)"
              className="animate-pulse"
            />
          )}

          {/* Sensor Nodes */}
          {channels.map(ch => {
            const rad = (ch.angle * Math.PI) / 180;
            const normalized = Math.min(1, Math.max(0.18, ch.value / 4095));
            const nodeR = 35 + normalized * (maxRadius - 40);
            const nx = cx - nodeR * Math.cos(rad);
            const ny = cy - nodeR * Math.sin(rad);
            const isAlert = ch.value > (adcThreshold || 2800);

            return (
              <g key={ch.id} transform={`translate(${nx}, ${ny})`}>
                {isAlert ? (
                  <>
                    <circle cx="0" cy="0" r="14" fill="#EF4444" fillOpacity="0.25" className="animate-ping" />
                    <circle cx="0" cy="0" r="6" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
                    <g transform="translate(10, -8)">
                      <rect x="0" y="-5" width="70" height="18" rx="4" fill="#FFFFFF" stroke="#EF4444" strokeWidth="1" className="shadow-2xs" />
                      <text x="35" y="7" fontSize="8" fontFamily="monospace" fontWeight="bold" fill="#DC2626" textAnchor="middle">
                        {ch.value} ADC
                      </text>
                    </g>
                  </>
                ) : (
                  <>
                    <circle cx="0" cy="0" r="4.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
                    <circle cx="0" cy="0" r="2" fill="#94A3B8" />
                  </>
                )}
              </g>
            );
          })}

          {/* Physical Extinguisher Servo Nozzle Arm (GPIO 13) */}
          <line
            x1={cx}
            y1={cy}
            x2={servoTipX}
            y2={servoTipY}
            stroke={pumpActive ? '#0284C7' : '#D97706'}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx={servoTipX} cy={servoTipY} r="4.5" fill={pumpActive ? '#0284C7' : '#D97706'} stroke="#FFFFFF" strokeWidth="1.5" />

          {/* Base Mount */}
          <circle cx={cx} cy={cy} r="14" fill="#FFFFFF" stroke="#D97706" strokeWidth="2.5" className="shadow-xs" />
          <circle cx={cx} cy={cy} r="5" fill="#D97706" />
        </svg>
      </div>

      {/* 5-Channel SAR ADC Matrix Ribbon - Clean White Design */}
      <div className="px-5 py-3 border-t border-neutral-100 bg-white">
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className="text-neutral-500 font-sans font-bold uppercase text-[10px]">
            Photodiode Readings
          </span>
          <span className="text-neutral-500 text-[11px]">
            Peak: <strong className="text-neutral-900 font-mono">{maxChannel.value} ADC</strong> on {maxChannel.name}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
          {channels.map(ch => {
            const isAlert = ch.value > (adcThreshold || 2800);
            return (
              <div
                key={ch.id}
                className={`p-2.5 rounded-xl border transition-all ${
                  isAlert
                    ? 'bg-red-50 border-red-300 shadow-2xs'
                    : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <div className="flex justify-between items-center text-[10px] text-neutral-500 mb-1">
                  <span className="font-bold text-neutral-700">{ch.angle}° {ch.name}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className={`text-base font-extrabold ${isAlert ? 'text-red-600' : 'text-neutral-900'}`}>
                    {ch.value}
                  </span>
                  <span className="text-[9px] text-neutral-400">/ 4095</span>
                </div>
                <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div
                    className={`h-full ${isAlert ? 'bg-red-500' : 'bg-neutral-400'}`}
                    style={{ width: `${Math.min(100, (ch.value / 4095) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clean Interactive Controls */}
      {showControls && (
        <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50/70 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-neutral-700">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-neutral-500 text-xs font-sans font-medium">Test Channel:</span>
            {channels.map((ch, i) => (
              <button
                key={ch.id}
                onClick={() => handleTriggerChannel(i)}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                  activeChannelOverride === i
                    ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                    : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-300 shadow-2xs'
                }`}
              >
                {ch.angle}° ({ch.id})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={togglePump}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                pumpActive
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white hover:bg-neutral-100 text-neutral-800 border-neutral-300'
              }`}
            >
              <span className="material-symbols-outlined text-sm">water_drop</span>
              <span>{pumpActive ? 'Discharging...' : 'Manual Spray'}</span>
            </button>

            {activeChannelOverride !== null && (
              <button
                onClick={handleClearOverride}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-100 text-neutral-600 border border-neutral-300 text-[11px] font-semibold transition cursor-pointer shadow-2xs"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
