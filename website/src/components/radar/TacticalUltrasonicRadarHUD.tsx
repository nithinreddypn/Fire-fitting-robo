import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../../context/TelemetryContext';

interface TacticalUltrasonicRadarHUDProps {
  className?: string;
  showControls?: boolean;
}

export const TacticalUltrasonicRadarHUD: React.FC<TacticalUltrasonicRadarHUDProps> = ({
  className = '',
  showControls = true
}) => {
  const { obstacleDistance, safetyDistance } = useTelemetry();

  // Radar sweep animation angle (oscillates smoothly between 0° and 180°)
  const [sweepAngle, setSweepAngle] = useState<number>(45);
  const [sweepDirection, setSweepDirection] = useState<'up' | 'down'>('up');
  const [sweepSpeed, setSweepSpeed] = useState<'slow' | 'normal' | 'fast'>('slow');
  const [animeMode, setAnimeMode] = useState<boolean>(true);
  const [manualDistance, setManualDistance] = useState<number | null>(null);

  // Active distance is either manually tested or from real hardware telemetry
  const activeDistance = manualDistance !== null ? manualDistance : obstacleDistance;

  // Sweep step based on chosen speed
  // 'slow': 0.7° per tick (~8.5 seconds per sweep - calm, cinematic, smooth)
  // 'normal': 1.4° per tick (~4.2 seconds)
  // 'fast': 2.5° per tick (~2.4 seconds)
  const stepSize = sweepSpeed === 'slow' ? 0.7 : sweepSpeed === 'normal' ? 1.4 : 2.5;

  // Smooth, calm acoustic sweep line oscillation
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
        return sweepDirection === 'up' ? prev + stepSize : prev - stepSize;
      });
    }, 40);
    return () => clearInterval(sweepInterval);
  }, [sweepDirection, stepSize]);

  // Derived states
  const isEmergencyBrake = activeDistance <= 20;
  const isObstacleWarning = activeDistance <= (safetyDistance || 30);
  const isCaution = activeDistance > 30 && activeDistance <= 60;

  // Status colors & labels
  const statusColor = isEmergencyBrake
    ? 'text-red-600'
    : isObstacleWarning
    ? 'text-rose-600'
    : isCaution
    ? 'text-amber-600'
    : 'text-emerald-600';

  const statusBadgeClass = isEmergencyBrake
    ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
    : isObstacleWarning
    ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
    : isCaution
    ? 'bg-amber-50 text-amber-800 border-amber-200'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  const statusLabel = isEmergencyBrake
    ? 'BRAKE INTERLOCK'
    : isObstacleWarning
    ? 'TARGET LOCK: HAZARD'
    : isCaution
    ? 'PROXIMITY WARNING'
    : 'ALL CLEAR';

  // Sonar radar dimensions (SVG viewBox 0 0 400 230)
  const cx = 200;
  const cy = 210;
  const maxRadius = 170;

  // Clamped distance for target blip
  const clampedDist = Math.max(10, Math.min(200, activeDistance));
  const blipRadius = (clampedDist / 200) * maxRadius;
  const blipX = cx;
  const blipY = cy - blipRadius;

  // Sweep line end coordinates
  const sweepRad = (sweepAngle * Math.PI) / 180;
  const sweepX = cx - maxRadius * Math.cos(sweepRad);
  const sweepY = cy - maxRadius * Math.sin(sweepRad);

  // Sweep trail wedge (24° behind current sweep angle)
  const trailAngle = sweepDirection === 'up' ? Math.max(0, sweepAngle - 24) : Math.min(180, sweepAngle + 24);
  const trailRad = (trailAngle * Math.PI) / 180;
  const trailX = cx - maxRadius * Math.cos(trailRad);
  const trailY = cy - maxRadius * Math.sin(trailRad);

  return (
    <div className={`bg-white rounded-2xl border border-[#EAE4D9] shadow-xs overflow-hidden flex flex-col ${className}`}>
      {/* Clean Header with Anime Status Indicator */}
      <div className="px-5 py-4 border-b border-[#F4EFE6] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-xl bg-[#F4EFE6] text-stone-800 flex items-center justify-center border border-[#EAE4D9] shadow-2xs">
            <span className="material-symbols-outlined text-xl text-blue-600">sensors</span>
            {animeMode && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-stone-900 leading-tight">
                Ultrasonic Clearance Radar
              </h3>
              {animeMode && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  MECHA FX
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500">
              HC-SR04 Polar Sonar · 180° Acoustic Echo Sweep
            </p>
          </div>
        </div>

        {/* Status Alert Badge */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-mono border ${statusBadgeClass}`}>
            <span className={`w-2 h-2 rounded-full ${isObstacleWarning ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
            <span>{statusLabel}</span>
          </span>
          <span className={`text-base font-extrabold font-mono ml-1 ${statusColor}`}>
            {activeDistance} cm
          </span>
        </div>
      </div>

      {/* Main Radar Screen Viewport */}
      <div className="relative w-full aspect-[16/10] bg-[#FAF7F2] p-3 flex items-center justify-center select-none overflow-hidden">
        <svg viewBox="0 0 400 230" className="w-full h-full">
          <defs>
            {/* Subtle soft gradient for radar semi-circle matching warm cream palette */}
            <radialGradient id="light-radar-bg" cx="50%" cy="100%" r="95%">
              <stop offset="0%" stopColor="#F5EFE3" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#FAF7F2" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
            </radialGradient>

            {/* Anime Laser Sweep persistence gradient */}
            <radialGradient id="anime-sweep-gradient" cx="50%" cy="100%" r="100%">
              <stop offset="0%" stopColor={animeMode ? '#0284C7' : '#0EA5E9'} stopOpacity={animeMode ? 0.28 : 0.16} />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
            </radialGradient>

            {/* Anime Mecha Target Lock-on Glow */}
            <radialGradient id="anime-target-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isObstacleWarning ? '#EF4444' : '#10B981'} stopOpacity="0.6" />
              <stop offset="60%" stopColor={isObstacleWarning ? '#EF4444' : '#10B981'} stopOpacity="0.2" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Radar Semi-Circle Field */}
          <path d={`M ${cx - maxRadius} ${cy} A ${maxRadius} ${maxRadius} 0 0 1 ${cx + maxRadius} ${cy} Z`} fill="url(#light-radar-bg)" stroke="#E5DDD0" strokeWidth="1" />

          {/* Calibrated Range Arcs */}
          {/* 200 cm */}
          <path d={`M ${cx - maxRadius} ${cy} A ${maxRadius} ${maxRadius} 0 0 1 ${cx + maxRadius} ${cy}`} fill="none" stroke="#D8CEBD" strokeWidth="1.2" />
          {/* 150 cm */}
          <path d={`M ${cx - maxRadius * 0.75} ${cy} A ${maxRadius * 0.75} ${maxRadius * 0.75} 0 0 1 ${cx + maxRadius * 0.75} ${cy}`} fill="none" stroke="#D8CEBD" strokeWidth="1" strokeDasharray="4 3" />
          {/* 100 cm */}
          <path d={`M ${cx - maxRadius * 0.5} ${cy} A ${maxRadius * 0.5} ${maxRadius * 0.5} 0 0 1 ${cx + maxRadius * 0.5} ${cy}`} fill="none" stroke="#D8CEBD" strokeWidth="1" />
          {/* 50 cm */}
          <path d={`M ${cx - maxRadius * 0.25} ${cy} A ${maxRadius * 0.25} ${maxRadius * 0.25} 0 0 1 ${cx + maxRadius * 0.25} ${cy}`} fill="none" stroke="#D8CEBD" strokeWidth="1" strokeDasharray="3 3" />
          {/* 30 cm Hazard Cutoff */}
          <path d={`M ${cx - maxRadius * 0.15} ${cy} A ${maxRadius * 0.15} ${maxRadius * 0.15} 0 0 1 ${cx + maxRadius * 0.15} ${cy}`} fill="none" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="3 2" />

          {/* Radial Spokes */}
          {[-90, -45, 0, 45, 90].map(deg => {
            const rad = ((90 - deg) * Math.PI) / 180;
            const x2 = cx - maxRadius * Math.cos(rad);
            const y2 = cy - maxRadius * Math.sin(rad);
            return (
              <line
                key={deg}
                x1={cx}
                y1={cy}
                x2={x2}
                y2={y2}
                stroke="#E2E8F0"
                strokeWidth={deg === 0 ? 1.5 : 1}
              />
            );
          })}

          {/* Range Labels on vertical axis */}
          <text x={cx} y="48" fontSize="8" fill="#64748B" fontFamily="monospace" textAnchor="middle" fontWeight="bold">200cm</text>
          <text x={cx} y="92" fontSize="7.5" fill="#94A3B8" fontFamily="monospace" textAnchor="middle">150cm</text>
          <text x={cx} y="132" fontSize="7.5" fill="#94A3B8" fontFamily="monospace" textAnchor="middle">100cm</text>
          <text x={cx} y="174" fontSize="7" fill="#94A3B8" fontFamily="monospace" textAnchor="middle">50cm</text>
          <text x={cx} y="196" fontSize="7" fill="#EF4444" fontFamily="monospace" textAnchor="middle" fontWeight="bold">30cm</text>

          {/* Angle Peripheral Labels */}
          <text x="32" y={cy + 4} fontSize="8" fill="#94A3B8" fontFamily="monospace">-90°</text>
          <text x="74" y="98" fontSize="8" fill="#94A3B8" fontFamily="monospace">-45°</text>
          <text x={cx} y="32" fontSize="8.5" fill="#475569" fontFamily="monospace" fontWeight="bold" textAnchor="middle">0° FWD</text>
          <text x="326" y="98" fontSize="8" fill="#94A3B8" fontFamily="monospace">+45°</text>
          <text x="368" y={cy + 4} fontSize="8" fill="#94A3B8" fontFamily="monospace">+90°</text>

          {/* ANIME EFFECT 1: Expanding Acoustic Sonar Ripple Waves from Origin */}
          {animeMode && (
            <g>
              <circle cx={cx} cy={cy} r="35" fill="none" stroke="#0284C7" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3 2" className="animate-ping" />
              <circle cx={cx} cy={cy} r="65" fill="none" stroke="#0284C7" strokeWidth="1" strokeOpacity="0.25" strokeDasharray="4 3" />
            </g>
          )}

          {/* Soft Sweep Trailing Wedge */}
          <path
            d={`M ${cx} ${cy} L ${sweepX} ${sweepY} A ${maxRadius} ${maxRadius} 0 0 ${sweepDirection === 'up' ? 0 : 1} ${trailX} ${trailY} Z`}
            fill="url(#anime-sweep-gradient)"
          />

          {/* Clean Laser Sweep Line */}
          <line
            x1={cx}
            y1={cy}
            x2={sweepX}
            y2={sweepY}
            stroke="#0284C7"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Anime Laser Beam Tip Particle */}
          {animeMode && (
            <circle cx={sweepX} cy={sweepY} r="3.5" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.5" className="animate-pulse" />
          )}

          {/* ANIME EFFECT 2: Tracking Vector Line connecting chassis to obstacle */}
          {animeMode && (
            <line
              x1={cx}
              y1={cy}
              x2={blipX}
              y2={blipY}
              stroke={isObstacleWarning ? '#EF4444' : '#0284C7'}
              strokeWidth="1.5"
              strokeDasharray="4 3"
              strokeOpacity="0.6"
            />
          )}

          {/* ANIME EFFECT 3: Anime Mecha Target Lock-On Reticle */}
          <g transform={`translate(${blipX}, ${blipY})`}>
            {/* Soft Ambient Glow */}
            <circle
              cx="0"
              cy="0"
              r="22"
              fill="url(#anime-target-glow)"
              className={isObstacleWarning ? 'animate-ping' : ''}
            />

            {/* Anime Rotating Target Brackets */}
            {animeMode ? (
              <g className="animate-spin" style={{ transformOrigin: '0px 0px', animationDuration: '6s' }}>
                <path d="M -12 -7 L -12 -12 L -7 -12" fill="none" stroke={isObstacleWarning ? '#EF4444' : '#0284C7'} strokeWidth="1.5" />
                <path d="M 12 -7 L 12 -12 L 7 -12" fill="none" stroke={isObstacleWarning ? '#EF4444' : '#0284C7'} strokeWidth="1.5" />
                <path d="M -12 7 L -12 12 L -7 12" fill="none" stroke={isObstacleWarning ? '#EF4444' : '#0284C7'} strokeWidth="1.5" />
                <path d="M 12 7 L 12 12 L 7 12" fill="none" stroke={isObstacleWarning ? '#EF4444' : '#0284C7'} strokeWidth="1.5" />
              </g>
            ) : (
              <circle cx="0" cy="0" r="10" fill="none" stroke={isObstacleWarning ? '#EF4444' : '#10B981'} strokeWidth="1.5" />
            )}

            {/* Target Core Blip */}
            <circle
              cx="0"
              cy="0"
              r="5"
              fill={isObstacleWarning ? '#EF4444' : '#10B981'}
              stroke="#FFFFFF"
              strokeWidth="2"
            />

            {/* Target Distance Callout Pill */}
            <g transform="translate(16, -10)">
              <rect
                x="0"
                y="-6"
                width={animeMode ? "82" : "64"}
                height="22"
                rx="6"
                fill="#FFFFFF"
                stroke={isObstacleWarning ? '#EF4444' : '#CBD5E1'}
                strokeWidth="1.2"
                className="shadow-2xs"
              />
              <text
                x={animeMode ? "41" : "32"}
                y="5"
                fontSize="8"
                fontFamily="monospace"
                fontWeight="bold"
                fill={isObstacleWarning ? '#DC2626' : '#0F172A'}
                textAnchor="middle"
              >
                {animeMode ? `LOCK: ${activeDistance}cm` : `${activeDistance} cm`}
              </text>
              {animeMode && (
                <text
                  x="41"
                  y="12"
                  fontSize="6.5"
                  fontFamily="monospace"
                  fill="#64748B"
                  textAnchor="middle"
                >
                  {isObstacleWarning ? 'HAZARD' : 'TRACKED'}
                </text>
              )}
            </g>
          </g>

          {/* Anime Robot Turret Chassis at Base */}
          <circle cx={cx} cy={cy} r="15" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2.5" className="shadow-xs" />
          <circle cx={cx} cy={cy} r="5" fill="#0284C7" />
          {animeMode && (
            <circle cx={cx} cy={cy} r="10" fill="none" stroke="#38BDF8" strokeWidth="1" strokeDasharray="2 2" className="animate-spin" style={{ transformOrigin: `${cx}px ${cy}px`, animationDuration: '8s' }} />
          )}
        </svg>

        {/* Anime Framing Corner Marks */}
        {animeMode && (
          <>
            <div className="absolute top-2 left-2 text-[10px] text-neutral-400 font-mono select-none">「</div>
            <div className="absolute top-2 right-2 text-[10px] text-neutral-400 font-mono select-none">」</div>
            <div className="absolute bottom-2 left-2 text-[10px] text-neutral-400 font-mono select-none">└</div>
            <div className="absolute bottom-2 right-2 text-[10px] text-neutral-400 font-mono select-none">┘</div>
          </>
        )}
      </div>

      {/* Segmented LED Clearance Margin Meter */}
      <div className="px-5 py-3 border-t border-neutral-100 bg-white">
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className="text-neutral-500 font-sans font-bold uppercase text-[10px]">
            Clearance Margin
          </span>
          <span className={`font-bold text-xs ${statusColor}`}>
            {activeDistance} cm ({((activeDistance / 200) * 100).toFixed(0)}% Clear)
          </span>
        </div>

        {/* 10-Segment Clean LED Bar */}
        <div className="grid grid-cols-10 gap-1.5 h-2.5">
          {Array.from({ length: 10 }).map((_, i) => {
            const segmentCm = (i + 1) * 20;
            const isLit = activeDistance >= segmentCm;
            const isDanger = i < 2; // < 40cm
            const isWarning = i >= 2 && i < 4; // 40 - 80cm

            return (
              <div
                key={i}
                className={`rounded-sm transition-all duration-300 ${
                  isLit
                    ? isDanger
                      ? 'bg-red-500 shadow-2xs'
                      : isWarning
                      ? 'bg-amber-400'
                      : 'bg-emerald-500'
                    : 'bg-neutral-200'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Speed & Anime Mode Controls Ribbon */}
      {showControls && (
        <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs font-mono text-neutral-700">
          {/* Distance Test Slider */}
          <div className="flex items-center gap-2 flex-1">
            <span className="material-symbols-outlined text-base text-neutral-500">tune</span>
            <span className="text-neutral-500 text-xs font-sans shrink-0 font-medium">Distance:</span>
            <input
              type="range"
              min="10"
              max="200"
              value={activeDistance}
              onChange={e => setManualDistance(Number(e.target.value))}
              className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="font-bold text-neutral-900 shrink-0 min-w-[50px] text-right font-mono">
              {activeDistance} cm
            </span>
          </div>

          {/* Speed & Anime FX Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Speed Selector */}
            <div className="inline-flex rounded-lg border border-neutral-300 p-0.5 bg-white shadow-2xs">
              <button
                onClick={() => setSweepSpeed('slow')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition ${
                  sweepSpeed === 'slow' ? 'bg-blue-600 text-white' : 'text-neutral-600 hover:text-neutral-900'
                }`}
                title="Slow, smooth cinematic sweep"
              >
                Slow
              </button>
              <button
                onClick={() => setSweepSpeed('normal')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition ${
                  sweepSpeed === 'normal' ? 'bg-blue-600 text-white' : 'text-neutral-600 hover:text-neutral-900'
                }`}
                title="Normal sweep speed"
              >
                Med
              </button>
              <button
                onClick={() => setSweepSpeed('fast')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition ${
                  sweepSpeed === 'fast' ? 'bg-blue-600 text-white' : 'text-neutral-600 hover:text-neutral-900'
                }`}
                title="Fast sweep speed"
              >
                Fast
              </button>
            </div>

            {/* Anime Mecha Toggle Button */}
            <button
              onClick={() => setAnimeMode(!animeMode)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer shadow-2xs flex items-center gap-1 ${
                animeMode
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
              }`}
              title="Toggle Anime Mecha Reticles & Sonar Waves"
            >
              <span className="material-symbols-outlined text-xs">auto_awesome</span>
              <span>Anime: {animeMode ? 'ON' : 'OFF'}</span>
            </button>

            {manualDistance !== null && (
              <button
                onClick={() => setManualDistance(null)}
                className="px-2 py-1 rounded-lg bg-white hover:bg-neutral-100 text-neutral-600 border border-neutral-300 text-[10px] font-semibold transition cursor-pointer shadow-2xs"
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
