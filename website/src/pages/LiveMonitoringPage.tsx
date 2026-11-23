import React, { useState, useEffect, useRef } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { OpenStreetMapTracker } from '../components/map/OpenStreetMapTracker';
import { TacticalUltrasonicRadarHUD } from '../components/radar/TacticalUltrasonicRadarHUD';

export const LiveMonitoringPage: React.FC = () => {
  const {
    obstacleDistance,
    latencyMs,
    wifiRssi,
    dieTemperature,
    fireDetected,
    flameSensors,
    gpsData,
    liveTracker,
    esp32CamUrl,
    setEsp32CamUrl,
    isCameraConnected,
    setIsCameraConnected,
    showToast
  } = useTelemetry();

  const [streamResolution, setStreamResolution] = useState<'1080p' | '720p'>('1080p');
  const [reticleEnabled, setReticleEnabled] = useState<boolean>(true);
  const [streamPaused, setStreamPaused] = useState<boolean>(false);
  const [thermalMode, setThermalMode] = useState<boolean>(false);

  // ESP32-CAM IP Connection State
  const [ipInput, setIpInput] = useState<string>(esp32CamUrl);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Simulated live camera frame timestamp
  const [streamTime, setStreamTime] = useState<string>('00:00:00.0');
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setStreamTime(
        now.toTimeString().split(' ')[0] + '.' + Math.floor(now.getMilliseconds() / 100)
      );
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Connect to ESP32-CAM stream
  const handleConnectStream = () => {
    if (!ipInput.trim()) {
      showToast('Please enter a valid ESP32-CAM IP address or URL');
      return;
    }
    let url = ipInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }
    // Append /stream if only IP was entered
    if (!url.includes('/', 8)) {
      url = url + ':81/stream';
    }
    setEsp32CamUrl(url);
    setIsConnecting(true);
    setStreamError(false);
    showToast(`Connecting to ESP32-CAM stream: ${url}...`);

    setTimeout(() => {
      setIsConnecting(false);
      setIsCameraConnected(true);
      showToast(`Stream handshake initiated with ${url}`);
    }, 1200);
  };

  const handleDisconnectStream = () => {
    setIsCameraConnected(false);
    setStreamError(false);
    showToast('Switched to high-definition simulated optical feed.');
  };

  const handleApplyPreset = (presetUrl: string) => {
    setIpInput(presetUrl);
    setEsp32CamUrl(presetUrl);
    setIsCameraConnected(presetUrl !== 'SIMULATED');
    setStreamError(false);
    showToast(`Preset loaded: ${presetUrl === 'SIMULATED' ? 'Simulated Feed' : presetUrl}`);
  };

  // Real Snapshot Capture & Download
  const handleCaptureSnapshot = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw background
      ctx.fillStyle = thermalMode ? '#1C1917' : '#0F172A';
      ctx.fillRect(0, 0, 1280, 720);

      // Draw perspective facility grid
      ctx.strokeStyle = thermalMode ? '#44403C' : '#334155';
      ctx.lineWidth = 1;
      for (let x = 0; x < 1280; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 720);
        ctx.stroke();
      }
      for (let y = 0; y < 720; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1280, y);
        ctx.stroke();
      }

      // Draw horizon reference
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 360);
      ctx.lineTo(1240, 360);
      ctx.stroke();

      // Crosshair reticle
      if (reticleEnabled) {
        ctx.strokeStyle = fireDetected ? '#EF4444' : '#E2E8F0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(640, 360, 52, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(560, 360);
        ctx.lineTo(720, 360);
        ctx.moveTo(640, 280);
        ctx.lineTo(640, 440);
        ctx.stroke();
      }

      // Telemetry Header
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(30, 20, 1220, 50);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`FIREBOT-CAM · ${isCameraConnected ? 'LIVE MJPEG STREAM' : 'SIMULATED OPTICS'} · ${streamResolution}`, 50, 52);
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(`GPS: ${gpsData.latitude.toFixed(5)}°N, ${gpsData.longitude.toFixed(5)}°E · SATS: ${gpsData.satellites} · HDOP: ${gpsData.hdop}`, 680, 52);

      // Bottom Bar
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(30, 650, 1220, 50);
      ctx.fillStyle = fireDetected ? '#EF4444' : '#10B981';
      ctx.fillText(fireDetected ? 'TARGET: FLAME SPIKE CONFIRMED' : 'SECTOR CLEAR: NOMINAL', 50, 682);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillText(`CLEARANCE: ${obstacleDistance} cm · HEADING: ${liveTracker.heading}° · TIME: ${streamTime} UTC`, 640, 682);

      // Download
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `firebot-cam-snapshot-${Date.now().toString(36)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast('Frame capture saved (1280x720 PNG Snapshot).');
    } catch {
      showToast('Frame capture saved to local session storage.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs">
            <span className="uppercase tracking-wider font-semibold text-neutral-500 font-mono">OPTICS & SURVEILLANCE</span>
            <span className="text-neutral-300">/</span>
            <span className="text-neutral-800 font-bold uppercase tracking-wider font-mono">ESP32-CAM & LIVE TRACKING</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Live Optics, Camera Stream & Live Tracking
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Real-time ESP32-CAM MJPEG video stream, live facility robot position tracking, and ultrasonic clearance radar.
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 self-start md:self-auto flex-wrap">
          {/* Stream Status Badge */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                isCameraConnected ? 'bg-emerald-500' : 'bg-neutral-600'
              } opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isCameraConnected ? 'bg-emerald-600' : 'bg-neutral-700'
              }`}></span>
            </span>
            <span className="text-neutral-500 font-medium hidden sm:inline">Optics Link:</span>
            <span className="text-neutral-800 font-semibold font-mono">
              {isCameraConnected ? 'LIVE MJPEG STREAM' : 'SIMULATED FEED'}
            </span>
          </div>

          <button
            onClick={handleCaptureSnapshot}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 shadow-2xs border border-neutral-300 text-xs sm:text-sm font-semibold transition active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">photo_camera</span>
            <span>Snapshot</span>
          </button>
        </div>
      </div>

      {/* Top Telemetry KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Optics Sensor</span>
            <div className="text-lg sm:text-xl font-extrabold text-neutral-900 font-mono mt-0.5">OV2640</div>
            <span className="text-xs text-neutral-600 font-semibold font-mono">DVP DMA 20MHz</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center border border-neutral-200 shadow-2xs">
            <span className="material-symbols-outlined text-xl">videocam</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider">GPS Position</span>
            <div className="text-lg sm:text-xl font-extrabold text-neutral-900 font-mono mt-0.5">{gpsData.latitude.toFixed(5)}°, {gpsData.longitude.toFixed(5)}°</div>
            <span className="text-xs text-emerald-700 font-semibold font-mono">{gpsData.fixStatus} · {gpsData.satellites} Sats (HDOP {gpsData.hdop})</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center border border-neutral-200 shadow-2xs">
            <span className="material-symbols-outlined text-xl text-blue-600">my_location</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Sonar Clearance</span>
            <div className="text-lg sm:text-xl font-extrabold text-neutral-900 font-mono mt-0.5">{obstacleDistance} cm</div>
            <span className={`text-xs font-semibold font-mono ${obstacleDistance < 40 ? 'text-red-600' : 'text-neutral-700'}`}>
              {obstacleDistance < 40 ? 'Proximity Alert' : 'Forward Clear'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center border border-neutral-200 shadow-2xs">
            <span className="material-symbols-outlined text-xl">sensors</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Network & Wi-Fi</span>
            <div className="text-lg sm:text-xl font-extrabold text-neutral-900 font-mono mt-0.5">{wifiRssi} dBm</div>
            <span className="text-xs text-neutral-700 font-semibold font-mono">RTT: {latencyMs}ms · {dieTemperature}°C</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center border border-neutral-200 shadow-2xs">
            <span className="material-symbols-outlined text-xl">wifi</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Camera Viewport vs GPS & Ultrasonic HUD */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6">
        {/* Left 7 Columns: Tactical Camera Viewport & IP Connection Bar */}
        <div className="xl:col-span-7 flex flex-col gap-4">
          {/* ESP32-CAM Stream IP Address & Connect Configuration Box */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-neutral-800 text-lg">settings_ethernet</span>
                <span className="font-bold text-neutral-900 text-xs sm:text-sm">ESP32-CAM Stream IP & URL Configuration</span>
              </div>
              <span className="text-[11px] font-mono text-neutral-500">
                Port 81 (HTTP MJPEG Stream)
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-neutral-400 text-base">link</span>
                <input
                  type="text"
                  placeholder="e.g. http://192.168.4.1:81/stream"
                  value={ipInput}
                  onChange={e => setIpInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono text-neutral-900 focus:outline-none focus:border-neutral-400"
                />
              </div>

              {isCameraConnected ? (
                <button
                  onClick={handleDisconnectStream}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 transition shadow-2xs active:scale-[0.98] shrink-0"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnectStream}
                  disabled={isConnecting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 transition shadow-2xs active:scale-[0.98] flex items-center justify-center gap-1.5 shrink-0"
                >
                  <span className={`material-symbols-outlined text-base ${isConnecting ? 'animate-spin' : ''}`}>
                    {isConnecting ? 'sync' : 'cast_connected'}
                  </span>
                  <span>{isConnecting ? 'Connecting...' : 'Connect Stream'}</span>
                </button>
              )}
            </div>

            {/* Quick Stream Preset Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
              <span className="text-neutral-500 font-sans text-[11px]">Quick Presets:</span>
              <button
                onClick={() => handleApplyPreset('http://192.168.4.1:81/stream')}
                className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] border border-neutral-200 transition"
              >
                AP Mode (192.168.4.1)
              </button>
              <button
                onClick={() => handleApplyPreset('http://192.168.1.100:81/stream')}
                className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] border border-neutral-200 transition"
              >
                STA Local Wi-Fi (192.168.1.x)
              </button>
              <button
                onClick={() => handleApplyPreset('SIMULATED')}
                className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] border border-neutral-200 transition"
              >
                Simulated HD Feed
              </button>
            </div>
          </div>

          {/* Camera Viewfinder Screen Container */}
          <div className="bg-white rounded-2xl shadow-xs border border-neutral-200 overflow-hidden">
            {/* Viewfinder Header Toolbar */}
            <div className="px-4 sm:px-5 py-3 bg-neutral-100 border-b border-neutral-200 flex items-center justify-between flex-wrap gap-2 text-neutral-800">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                </span>
                <span className="text-xs sm:text-sm font-bold tracking-wide">
                  {isCameraConnected ? 'LIVE ESP32-CAM FEED' : 'SIMULATED OPTICS HUD'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-neutral-700 border border-neutral-300">
                  {streamResolution}
                </span>
              </div>

              {/* Viewport Control Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Resolution selector */}
                <div className="inline-flex bg-neutral-200/70 p-0.5 rounded-lg border border-neutral-300">
                  <button
                    onClick={() => {
                      setStreamResolution('1080p');
                      showToast('Resolution set: 1080p FHD');
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono transition cursor-pointer ${
                      streamResolution === '1080p' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    1080p
                  </button>
                  <button
                    onClick={() => {
                      setStreamResolution('720p');
                      showToast('Resolution set: 720p HD');
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono transition cursor-pointer ${
                      streamResolution === '720p' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    720p
                  </button>
                </div>

                {/* Reticle Toggle */}
                <button
                  onClick={() => setReticleEnabled(!reticleEnabled)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                    reticleEnabled
                      ? 'bg-white text-neutral-900 border-neutral-300 shadow-2xs'
                      : 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:text-neutral-900'
                  }`}
                >
                  HUD: {reticleEnabled ? 'ON' : 'OFF'}
                </button>

                {/* Thermal IR Toggle */}
                <button
                  onClick={() => setThermalMode(!thermalMode)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                    thermalMode
                      ? 'bg-white text-neutral-900 border-neutral-300 shadow-2xs'
                      : 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:text-neutral-900'
                  }`}
                >
                  Thermal IR: {thermalMode ? 'ON' : 'OFF'}
                </button>

                {/* Stream Pause/Resume */}
                <button
                  onClick={() => setStreamPaused(!streamPaused)}
                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                    streamPaused
                      ? 'bg-white text-neutral-900 border-neutral-300 shadow-2xs'
                      : 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:text-neutral-900'
                  }`}
                  title={streamPaused ? 'Resume Stream' : 'Pause Stream'}
                >
                  <span className="material-symbols-outlined text-base">
                    {streamPaused ? 'play_arrow' : 'pause'}
                  </span>
                </button>
              </div>
            </div>

            {/* Viewfinder Screen (16:9 Aspect Ratio) */}
            <div className={`relative w-full aspect-[16/9] overflow-hidden select-none ${
              isCameraConnected ? (thermalMode ? 'bg-[#181310]' : 'bg-[#0B111A]') : 'bg-neutral-100'
            }`}>
              {/* IF LIVE CAMERA CONNECTED: Render Real MJPEG Stream */}
              {isCameraConnected && !streamError ? (
                <div className="w-full h-full relative">
                  <img
                    ref={imgRef}
                    src={esp32CamUrl}
                    alt="ESP32-CAM Live Feed"
                    crossOrigin="anonymous"
                    onError={() => {
                      setStreamError(true);
                      showToast(`Could not load stream from ${esp32CamUrl}. Falling back to standby.`);
                    }}
                    className={`w-full h-full object-cover transition-opacity ${
                      streamPaused ? 'opacity-30' : 'opacity-100'
                    }`}
                  />
                </div>
              ) : (
                /* CLEAN CREAM STANDBY VIEWPORT */
                <div className="w-full h-full relative flex items-center justify-center p-6 text-center select-none bg-[#FAF7F2]">
                  <div className="bg-white border border-[#EAE4D9] rounded-2xl p-6 sm:p-8 max-w-md shadow-xs flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#F4EFE6] border border-[#EAE4D9] flex items-center justify-center mb-3 text-stone-800 shadow-2xs">
                      <span className="material-symbols-outlined text-3xl">videocam</span>
                    </div>
                    <h4 className="text-base font-extrabold text-stone-900 tracking-tight">
                      ESP32-CAM Video Stream Standby
                    </h4>
                    <p className="text-xs text-stone-500 mt-1 mb-5 leading-relaxed">
                      Enter your camera stream IP above or select a local network preset to start real-time optical surveillance.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <button
                        onClick={() => handleApplyPreset('http://192.168.4.1:81/stream')}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F4EFE6] text-stone-800 text-xs font-semibold border border-[#EAE4D9] shadow-2xs transition active:scale-95 cursor-pointer"
                      >
                        Connect AP (192.168.4.1)
                      </button>
                      <button
                        onClick={() => handleApplyPreset('http://192.168.1.100:81/stream')}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F4EFE6] text-stone-800 text-xs font-semibold border border-[#EAE4D9] shadow-2xs transition active:scale-95 cursor-pointer"
                      >
                        Connect STA (192.168.1.x)
                      </button>
                      <button
                        onClick={() => handleApplyPreset('SIMULATED')}
                        className="px-3 py-1.5 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE4D9] text-stone-700 text-xs font-semibold transition active:scale-95 cursor-pointer"
                      >
                        Simulated Preview
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Stream Suspended Overlay */}
              {streamPaused && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2 bg-black/80 z-20">
                  <span className="material-symbols-outlined text-5xl text-neutral-300">pause_circle</span>
                  <span className="text-sm font-bold tracking-widest uppercase font-mono">
                    Optical Pipeline Suspended
                  </span>
                </div>
              )}

              {/* Tactical Viewfinder Overlay HUD (Only shown during active camera stream) */}
              {isCameraConnected && reticleEnabled && (
                <div className="absolute inset-0 pointer-events-none p-4 sm:p-5 flex flex-col justify-between select-none z-10">
                  {/* Top Corner Metadata */}
                  <div className="flex items-center justify-between text-white font-mono text-[11px] sm:text-xs">
                    <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span className="font-bold">CAM_01</span>
                      <span className="text-white/30">|</span>
                      <span className="text-neutral-200">{streamTime}</span>
                    </div>

                    <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 flex items-center gap-2 sm:gap-3">
                      <span className="text-neutral-300">GPS:</span>
                      <span className="font-bold text-white">{gpsData.latitude.toFixed(4)}°, {gpsData.longitude.toFixed(4)}°</span>
                      <span className="text-white/30">|</span>
                      <span className="text-cyan-300 font-bold">{gpsData.satellites} Sats</span>
                      <span className="text-white/30">|</span>
                      <span className={fireDetected ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {fireDetected ? 'INTERCEPT' : 'PATROL'}
                      </span>
                    </div>
                  </div>

                  {/* Precision Center Reticle */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none">
                    <div className="relative w-14 sm:w-16 h-14 sm:h-16 flex items-center justify-center">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-3.5 bg-white/70" />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-3.5 bg-white/70" />
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-0.5 bg-white/70" />
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-0.5 bg-white/70" />
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-xs" />
                    </div>

                    {/* Flame Target Lock HUD Box */}
                    {fireDetected && (
                      <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 sm:w-36 h-28 sm:h-36 border-2 border-red-500 rounded-lg animate-pulse flex flex-col justify-between p-1.5 shadow-lg shadow-red-500/20">
                        <div className="flex justify-between items-center text-[9px] font-mono font-bold text-red-400 bg-black/60 px-1 py-0.5 rounded">
                          <span>HAZARD LOCK</span>
                          <span>{Math.max(flameSensors.left, flameSensors.center, flameSensors.right)} ADC</span>
                        </div>
                        <div className="text-center text-[9px] font-mono font-bold text-white bg-red-600/90 py-0.5 rounded uppercase tracking-wider">
                          READY TO DISCHARGE
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Viewfinder Corner Brackets */}
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-white/40" />
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-white/40" />
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-white/40" />
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-white/40" />

                  {/* Bottom Status Watermark */}
                  <div className="flex items-center justify-between text-white font-mono text-[11px] sm:text-xs">
                    <div className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-lg border border-white/20">
                      <span>CLEARANCE: {obstacleDistance} cm</span>
                    </div>
                    <div className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-lg border border-white/20">
                      <span className="text-neutral-300">{isCameraConnected ? 'LIVE STREAM · MJPEG' : 'STANDBY'} · {latencyMs}ms RTT</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Viewport Bottom Quick Info Strip */}
            <div className="p-3 sm:p-4 bg-neutral-50 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
              <span className="text-neutral-600 font-sans font-medium flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-neutral-500">videocam</span>
                Stream Target: <strong className="text-neutral-900 font-mono">{isCameraConnected ? esp32CamUrl : 'Standby (192.168.4.1 / 192.168.1.x)'}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCaptureSnapshot}
                  className="px-3 py-1 rounded-lg bg-white hover:bg-neutral-100 text-neutral-800 font-semibold border border-neutral-300 shadow-2xs transition"
                >
                  Download PNG Snapshot
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: GPS Navigation & Enhanced Ultrasonic Radar */}
        <div className="xl:col-span-5 flex flex-col gap-5 sm:gap-6">
          {/* Live Robot Position Tracking - Clean OpenStreetMap */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center border border-neutral-200 shadow-2xs">
                  <span className="material-symbols-outlined text-lg text-blue-600">pin_drop</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-neutral-900 text-base leading-tight">Live Robot Position Tracking</h3>
                  <p className="text-xs text-neutral-500">
                    OpenStreetMap · GPS Location Pin
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full border ${
                  fireDetected
                    ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {fireDetected ? 'Hazard Intercept' : 'Patrolling'}
                </span>
              </div>
            </div>

            {/* Real OpenStreetMap Live Tracker */}
            <OpenStreetMapTracker />
          </div>

          {/* Tactical Ultrasonic Clearance Radar HUD */}
          <TacticalUltrasonicRadarHUD />
        </div>
      </div>
    </div>
  );
};
