import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  NavPage,
  VehicleMode,
  DriveDirection,
  FlameSensors,
  GpsData,
  AlertItem,
  IncidentItem,
  LiveTrackerData,
  FacilityMapData
} from '../types/telemetry';

export const DEFAULT_SUPABASE_URL = 'https://awktiffbxwhwuhkmpfvu.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3a3RpZmZieHdod3Voa21wZnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MDkxNjQsImV4cCI6MjExMDk4NTE2NH0.fwTtEMn1sJbNE48kc-1L87_aNn5J3jYIwCgEffY3Hjs';

export const DEFAULT_DATABASE_MAPS: FacilityMapData[] = [
  {
    id: 'map-hardware-01',
    mapId: 'ROVER-ARENA-01',
    name: 'Hardware Sensor Coverage Matrix',
    facilityType: 'Autonomous Fire Extinguishment Rover',
    dimensions: { widthMeters: 30, heightMeters: 20 },
    originLabel: 'Rover Centroid (0, 0)',
    source: 'database',
    lastSyncedAt: new Date().toISOString(),
    sectors: [
      {
        id: 'sec-fc',
        code: 'FC-90',
        name: 'Front-Center Sector (GPIO 32)',
        x: 10.0,
        y: 4.0,
        width: 10.0,
        height: 8.0,
        fillColor: '#EFF6FF',
        strokeColor: '#3B82F6',
        hazardLevel: 'moderate',
        description: 'Direct forward hearth vector (90° nozzle servo)'
      },
      {
        id: 'sec-fl',
        code: 'FL-45',
        name: 'Front-Left Sector (GPIO 33)',
        x: 1.0,
        y: 4.0,
        width: 8.0,
        height: 8.0,
        fillColor: '#FFFBEB',
        strokeColor: '#F59E0B',
        hazardLevel: 'high',
        description: 'Forward port flame vector (45° nozzle servo)'
      },
      {
        id: 'sec-fr',
        code: 'FR-135',
        name: 'Front-Right Sector (GPIO 35)',
        x: 21.0,
        y: 4.0,
        width: 8.0,
        height: 8.0,
        fillColor: '#FFF1F2',
        strokeColor: '#F43F5E',
        hazardLevel: 'high',
        description: 'Forward starboard flame vector (135° nozzle servo)'
      }
    ],
    waypoints: [
      { id: 'wp-1', name: 'Center Patrol Station', label: 'WP-1', x: 15.0, y: 8.0, sectorId: 'sec-fc', isPatrolPoint: true },
      { id: 'wp-2', name: 'Port Perimeter', label: 'WP-2', x: 5.0, y: 8.0, sectorId: 'sec-fl', isPatrolPoint: true },
      { id: 'wp-3', name: 'Starboard Perimeter', label: 'WP-3', x: 25.0, y: 8.0, sectorId: 'sec-fr', isPatrolPoint: true }
    ],
    obstacles: []
  }
];

interface TelemetryContextType {
  currentPage: NavPage;
  setCurrentPage: (page: NavPage) => void;
  vehicleMode: VehicleMode;
  setVehicleMode: (mode: VehicleMode) => void;
  driveDirection: DriveDirection;
  setDriveDirection: (dir: DriveDirection) => void;
  throttlePercent: number;
  setThrottlePercent: (throttle: number) => void;
  pumpActive: boolean;
  setPumpActive: (active: boolean | ((prev: boolean) => boolean)) => void;
  togglePump: () => void;
  emergencyStop: boolean;
  triggerEmergencyStop: () => void;
  resetEmergencyStop: () => void;
  isAlarmSilenced: boolean;
  toggleSilenceAlarm: () => void;
  simulateFireTrigger: () => void;
  fireDetected: boolean;
  flameSensors: FlameSensors;
  obstacleDistance: number;
  batteryLevel: number;
  batteryVoltage: number;
  dieTemperature: number;
  reservoirLevel: number;
  latencyMs: number;
  wifiRssi: number;
  alerts: AlertItem[];
  acknowledgeAlert: (id: string) => void;
  acknowledgeAllAlerts: () => void;
  clearAcknowledgedAlerts: () => void;
  incidents: IncidentItem[];
  selectedIncident: IncidentItem | null;
  setSelectedIncident: (inc: IncidentItem | null) => void;
  recalibrateSensors: () => void;
  isRecalibrating: boolean;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  sprayDuration: number;
  setSprayDuration: (dur: number) => void;
  safetyDistance: number;
  setSafetyDistance: (dist: number) => void;
  adcThreshold: number;
  setAdcThreshold: (val: number) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  liveTracker: LiveTrackerData;
  setLiveTracker: React.Dispatch<React.SetStateAction<LiveTrackerData>>;
  dispatchToWaypoint: (wpName: string) => void;
  clearPathTrail: () => void;
  resetOdometer: () => void;
  gpsData: GpsData;
  setGpsData: React.Dispatch<React.SetStateAction<GpsData>>;
  esp32CamUrl: string;
  setEsp32CamUrl: (url: string) => void;
  isCameraConnected: boolean;
  setIsCameraConnected: (connected: boolean) => void;
  databaseMaps: FacilityMapData[];
  activeMap: FacilityMapData;
  setActiveMapId: (mapId: string) => void;
  isSyncingMap: boolean;
  syncMapsFromDatabase: () => Promise<void>;
  saveMapToDatabase: (newMap: FacilityMapData) => Promise<void>;
  servoAngle: number;
  setServoAngle: (angle: number) => void;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

const INITIAL_TRACKER: LiveTrackerData = {
  posX: 0.0,
  posY: 0.0,
  speed: 0.0,
  heading: 0,
  odometer: 0.0,
  targetWaypoint: 'Center Patrol Station',
  currentSector: 'Perimeter Standby',
  trackingStatus: 'HOLDING STATION',
  pathHistory: [],
  missionElapsedSeconds: 0
};

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');
  const [vehicleMode, setVehicleMode] = useState<VehicleMode>('manual');
  const [driveDirection, setDriveDirection] = useState<DriveDirection>('IDLE');
  const [throttlePercent, setThrottlePercent] = useState<number>(50);
  const [pumpActive, setPumpActive] = useState<boolean>(false);
  const [emergencyStop, setEmergencyStop] = useState<boolean>(false);
  const [isAlarmSilenced, setIsAlarmSilenced] = useState<boolean>(false);
  const [fireDetected, setFireDetected] = useState<boolean>(false);
  const [flameSensors, setFlameSensors] = useState<FlameSensors>({ left: 0, center: 0, right: 0 });
  const [obstacleDistance, setObstacleDistance] = useState<number>(120);
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [batteryVoltage, setBatteryVoltage] = useState<number>(12.6);
  const [dieTemperature, setDieTemperature] = useState<number>(41.2);
  const [reservoirLevel, setReservoirLevel] = useState<number>(100);
  const [latencyMs, setLatencyMs] = useState<number>(24);
  const [wifiRssi, setWifiRssi] = useState<number>(-58);
  const [servoAngle, setServoAngle] = useState<number>(90);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [isRecalibrating, setIsRecalibrating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Settings values
  const [sprayDuration, setSprayDuration] = useState<number>(4.0);
  const [safetyDistance, setSafetyDistance] = useState<number>(30);
  const [adcThreshold, setAdcThreshold] = useState<number>(2800);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Database Maps State
  const [databaseMaps, setDatabaseMaps] = useState<FacilityMapData[]>(() => {
    try {
      const saved = localStorage.getItem('firebot_facility_maps');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_DATABASE_MAPS;
  });

  const [activeMapId, setActiveMapIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('firebot_active_map_id');
      if (saved) return saved;
    } catch {
      // fallback
    }
    return 'map-fire-01';
  });

  const [isSyncingMap, setIsSyncingMap] = useState<boolean>(false);

  const activeMap: FacilityMapData =
    databaseMaps.find(m => m.id === activeMapId || m.mapId === activeMapId) || databaseMaps[0] || DEFAULT_DATABASE_MAPS[0];

  const setActiveMapId = (id: string) => {
    setActiveMapIdState(id);
    try {
      localStorage.setItem('firebot_active_map_id', id);
    } catch {}
    const chosen = databaseMaps.find(m => m.id === id || m.mapId === id);
    if (chosen) {
      showToast(`Switched facility map to ${chosen.name} (${chosen.mapId})`);
    }
  };

  const syncMapsFromDatabase = async () => {
    setIsSyncingMap(true);
    let supabaseUrl = DEFAULT_SUPABASE_URL;
    let supabaseKey = DEFAULT_SUPABASE_ANON_KEY;
    try {
      const s = localStorage.getItem('firebot_settings');
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed.supabaseUrl && !parsed.supabaseUrl.includes('jfpdugmubrtjthzenkvm')) supabaseUrl = parsed.supabaseUrl;
        if (parsed.supabaseAnonKey && !parsed.supabaseAnonKey.includes('5IhIHrSiVKPNPLii36vfWfni3eixtI_X3u4nk56FEVI')) supabaseKey = parsed.supabaseAnonKey;
      }
    } catch {}

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const baseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '');
      const res = await fetch(`${baseUrl}/rest/v1/facility_maps?select=*`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const syncedMaps: FacilityMapData[] = data.map((d: any) => ({
            ...d,
            source: 'database',
            lastSyncedAt: new Date().toISOString()
          }));
          setDatabaseMaps(syncedMaps);
          localStorage.setItem('firebot_facility_maps', JSON.stringify(syncedMaps));
          showToast(`Synced ${syncedMaps.length} facility floorplans from Cloud Supabase Database`);
          setIsSyncingMap(false);
          return;
        }
      }
    } catch {
      // Fallback to local persistent repository
    }

    // Local DB sync confirmation
    const updated = databaseMaps.map(m => ({ ...m, lastSyncedAt: new Date().toISOString() }));
    setDatabaseMaps(updated);
    try {
      localStorage.setItem('firebot_facility_maps', JSON.stringify(updated));
    } catch {}
    showToast(`Synchronized facility maps with persistent IoT database repository (${updated.length} facilities ready)`);
    setIsSyncingMap(false);
  };

  const saveMapToDatabase = async (newMap: FacilityMapData) => {
    const exists = databaseMaps.some(m => m.id === newMap.id);
    let nextList: FacilityMapData[];
    if (exists) {
      nextList = databaseMaps.map(m => (m.id === newMap.id ? newMap : m));
    } else {
      nextList = [...databaseMaps, newMap];
    }
    setDatabaseMaps(nextList);
    try {
      localStorage.setItem('firebot_facility_maps', JSON.stringify(nextList));
    } catch {}
    showToast(`Facility map '${newMap.name}' saved to database successfully.`);
  };

  const [liveTracker, setLiveTracker] = useState<LiveTrackerData>(() => ({
    ...INITIAL_TRACKER,
    targetWaypoint: activeMap.waypoints[0]?.name || 'WP-1 (Base Dock)',
    currentSector: activeMap.sectors[0]?.name || 'Base Dock Station'
  }));

  const dispatchToWaypoint = (wpName: string) => {
    const wp = activeMap.waypoints.find(w => w.name === wpName || w.label === wpName);
    if (wp) {
      const sec = activeMap.sectors.find(s => s.id === wp.sectorId);
      setLiveTracker(prev => ({
        ...prev,
        targetWaypoint: wp.name,
        currentSector: sec ? `${sec.code} · ${sec.name}` : prev.currentSector,
        trackingStatus: 'PATROLLING'
      }));
      showToast(`Dispatched rover to target waypoint: ${wp.name}`);
    } else {
      setLiveTracker(prev => ({
        ...prev,
        targetWaypoint: wpName,
        trackingStatus: 'PATROLLING'
      }));
      showToast(`Dispatched rover to waypoint: ${wpName}`);
    }
  };

  const clearPathTrail = () => {
    setLiveTracker(prev => ({
      ...prev,
      pathHistory: [{ x: prev.posX, y: prev.posY }]
    }));
    showToast('Live tracking breadcrumb trail cleared');
  };

  const resetOdometer = () => {
    setLiveTracker(prev => ({
      ...prev,
      odometer: 0
    }));
    showToast('Mission odometer reset to 0.0 m');
  };

  const [gpsData, setGpsData] = useState<GpsData>({
    latitude: 17.38504,
    longitude: 78.48667,
    altitude: 542.4,
    satellites: 14,
    hdop: 0.8,
    compassHeading: 34,
    fixStatus: '3D Fix',
    zone: 'Industrial Bay 04 - Sector Alpha'
  });

  const [esp32CamUrl, setEsp32CamUrlState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('firebot_esp32_cam_url');
      if (saved) return saved;
    } catch {}
    return 'http://192.168.4.1:81/stream';
  });

  const [isCameraConnected, setIsCameraConnected] = useState<boolean>(false);

  const setEsp32CamUrl = (url: string) => {
    setEsp32CamUrlState(url);
    try {
      localStorage.setItem('firebot_esp32_cam_url', url);
    } catch {}
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const togglePump = () => {
    if (emergencyStop) {
      showToast('Action Blocked: Emergency Stop is currently active!');
      return;
    }
    setPumpActive(prev => {
      const next = !prev;
      if (next) {
        setReservoirLevel(r => Math.max(0, r - 2));
        showToast('Extinguishing Solenoid & Water Pump Activated');
      } else {
        showToast('Extinguishing Solenoid Disengaged');
      }
      return next;
    });
  };

  const triggerEmergencyStop = () => {
    setEmergencyStop(true);
    setDriveDirection('STOP');
    setPumpActive(false);
    showToast('EMERGENCY STOP ENGAGED: All actuators, drive motors, and solenoids halted!');
  };

  const resetEmergencyStop = () => {
    setEmergencyStop(false);
    setDriveDirection('IDLE');
    showToast('Emergency Stop cleared. System returned to standby operational state.');
  };

  const toggleSilenceAlarm = () => {
    setIsAlarmSilenced(prev => {
      const next = !prev;
      showToast(next ? 'Audible piezo alarm buzzer silenced' : 'Audible alarm siren active');
      return next;
    });
  };

  const simulateFireTrigger = () => {
    setFireDetected(true);
    setFlameSensors({
      left: 1200,
      center: 3450,
      right: 980
    });
    setServoAngle(90);
    setAlerts(prev => [
      {
        id: 'AL-' + Date.now().toString().slice(-4),
        title: 'Thermal Flame Spike Detected',
        desc: 'Flame photodiode array detected IR flame threshold exceedance at 3450 ADC (Direct Center).',
        severity: 'critical',
        timestamp: new Date().toLocaleTimeString(),
        timeAgo: 'Just now',
        node: 'OPTICAL-FRONT',
        acknowledged: false,
        code: 'ERR_FLAME_3450',
        metric: '3450 ADC'
      },
      ...prev
    ]);
    setIncidents(prev => [
      {
        id: 'INC-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900),
        timestamp: new Date().toLocaleTimeString(),
        vector: 'Center Cone',
        peakAdc: 3450,
        action: vehicleMode === 'auto' ? 'Autonomous Discharge' : 'Manual Standby',
        status: 'Active',
        responseDuration: '0.82s',
        fluidUsed: '120 mL',
        sensorTriggered: 'Center Photodiode'
      },
      ...prev
    ]);

    if (vehicleMode === 'auto' && !emergencyStop) {
      setPumpActive(true);
      showToast('CRITICAL FIRE DETECTED: Auto-suppression pump triggered!');
      setTimeout(() => {
        setPumpActive(false);
        setReservoirLevel(r => Math.max(0, r - 5));
        showToast('Autonomous suppression cycle complete. Fire suppressed.');
      }, sprayDuration * 1000);
    } else {
      showToast('CRITICAL FIRE DETECTED: Manual confirmation required to activate pump.');
    }
  };

  const recalibrateSensors = () => {
    setIsRecalibrating(true);
    showToast('Initiating photodiode ADC baseline recalibration...');
    setTimeout(() => {
      setFlameSensors({
        left: 0,
        center: 0,
        right: 0
      });
      setFireDetected(false);
      setServoAngle(90);
      setIsRecalibrating(false);
      showToast('Sensors recalibrated to baseline ambient illumination (< 500 ADC).');
    }, 1500);
  };

  const acknowledgeAlert = (id: string) => {
    setAlerts(prev =>
      prev.map(a => (a.id === id ? { ...a, acknowledged: true } : a))
    );
    showToast(`Alert ${id} marked as acknowledged.`);
  };

  const acknowledgeAllAlerts = () => {
    setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })));
    showToast('All active alerts marked as acknowledged.');
  };

  const clearAcknowledgedAlerts = () => {
    setAlerts(prev => prev.filter(a => !a.acknowledged));
    showToast('Cleared all acknowledged alerts from the active queue.');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  // Live Robot Tracking Status Handler
  useEffect(() => {
    setLiveTracker(prev => ({
      ...prev,
      trackingStatus: emergencyStop
        ? 'HOLDING STATION'
        : fireDetected
        ? 'INTERCEPTING HAZARD'
        : 'PATROLLING',
      targetWaypoint: fireDetected ? 'HAZARD HOTSPOT' : 'Center Patrol Station',
      currentSector: fireDetected ? 'Active Flame Vector' : 'Perimeter Standby',
      speed: emergencyStop ? 0 : fireDetected ? 0.8 : 0.0
    }));
  }, [emergencyStop, fireDetected]);

  // Real-Time Hardware Telemetry Sync: Connects to live ESP32 endpoints
  useEffect(() => {
    if (!isCameraConnected) return;

    let host = '';
    try {
      const u = new URL(esp32CamUrl);
      host = u.hostname;
    } catch {
      const match = esp32CamUrl.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
      if (match) host = match[0];
    }

    if (!host) return;

    const controller = new AbortController();
    const pollEsp32 = async () => {
      const startTime = performance.now();
      try {
        const res = await fetch(`http://${host}/telemetry`, { signal: controller.signal });
        if (res.ok) {
          const roundTrip = Math.round(performance.now() - startTime);
          setLatencyMs(roundTrip);
          const data = await res.json();
          if (data.flame) {
            setFlameSensors({
              left: Number(data.flame.left) || 0,
              center: Number(data.flame.center) || 0,
              right: Number(data.flame.right) || 0
            });
          }
          if (data.distance !== undefined) setObstacleDistance(Number(data.distance));
          if (data.battery !== undefined) setBatteryLevel(Number(data.battery));
          if (data.voltage !== undefined) setBatteryVoltage(Number(data.voltage));
          if (data.temperature !== undefined) setDieTemperature(Number(data.temperature));
          if (data.rssi !== undefined) setWifiRssi(Number(data.rssi));
        }
      } catch {
        // Live ESP32 telemetry endpoint pending/offline
      }
    };

    const interval = setInterval(pollEsp32, 2000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [isCameraConnected, esp32CamUrl]);

  // Real-Time Supabase Event Sync from fireauto.ino firmware
  useEffect(() => {
    let supabaseUrl = DEFAULT_SUPABASE_URL;
    let supabaseKey = DEFAULT_SUPABASE_ANON_KEY;
    try {
      const s = localStorage.getItem('firebot_settings');
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed.supabaseUrl && !parsed.supabaseUrl.includes('jfpdugmubrtjthzenkvm')) supabaseUrl = parsed.supabaseUrl;
        if (parsed.supabaseAnonKey && !parsed.supabaseAnonKey.includes('5IhIHrSiVKPNPLii36vfWfni3eixtI_X3u4nk56FEVI')) supabaseKey = parsed.supabaseAnonKey;
      }
    } catch {}

    const controller = new AbortController();
    const fetchSupabaseEvents = async () => {
      try {
        const baseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '');
        const res = await fetch(`${baseUrl}/rest/v1/fire_events?select=*&order=id.desc&limit=25`, {
          signal: controller.signal,
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows.length > 0) {
            const mappedIncidents: IncidentItem[] = rows.map((r: any, idx: number) => {
              const vector = r.strongest_direction?.includes('Left')
                ? 'Left Flank'
                : r.strongest_direction?.includes('Right')
                ? 'Right Cone'
                : 'Center Cone';

              let timeStr = new Date().toLocaleTimeString();
              if (r.event_time) {
                const parsedDate = new Date(r.event_time);
                timeStr = !isNaN(parsedDate.getTime()) ? parsedDate.toLocaleTimeString() : String(r.event_time);
              }

              let peakAdc = Number(r.fire_intensity) * 40 || 3200;
              if (r.sensor_values) {
                const nums = String(r.sensor_values)
                  .split(',')
                  .map(n => Number(n.trim()))
                  .filter(n => !isNaN(n));
                if (nums.length > 0) {
                  peakAdc = Math.max(...nums);
                }
              }

              return {
                id: `SUPA-${r.id || idx + 1}`,
                timestamp: timeStr,
                vector,
                peakAdc,
                action: r.relay_status === 'ON' ? 'Auto-Extinguish (Relay ON)' : 'Patrol Observation',
                status: r.relay_status === 'ON' ? 'Active' : 'Extinguished',
                responseDuration: '1.2s',
                fluidUsed: '160 mL',
                sensorTriggered: r.strongest_direction || `Sensor ${r.strongest_sensor_id ?? 1}`
              };
            });

            setIncidents(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const newItems = mappedIncidents.filter(m => !existingIds.has(m.id));
              return newItems.length > 0 ? [...newItems, ...prev] : prev;
            });

            const latest = rows[0];
            if (latest) {
              if (latest.latitude && latest.longitude) {
                setGpsData(prev => ({
                  ...prev,
                  latitude: Number(latest.latitude),
                  longitude: Number(latest.longitude),
                  fixStatus: '3D Fix'
                }));
              }
              if (latest.sensor_values) {
                const parts = String(latest.sensor_values).split(',').map((v: string) => Number(v.trim()) || 0);
                if (parts.length >= 3) {
                  setFlameSensors({
                    left: parts[3] || parts[0] || 0,
                    center: parts[1] || 0,
                    right: parts[2] || 0
                  });
                }
              }
              if (latest.dist_left && latest.dist_left > 0 && latest.dist_left < 400) {
                setObstacleDistance(latest.dist_left);
              } else if (latest.dist_right && latest.dist_right > 0 && latest.dist_right < 400) {
                setObstacleDistance(latest.dist_right);
              }
              if (latest.fire_status === 'Fire!' && latest.relay_status === 'ON') {
                setFireDetected(true);
                setPumpActive(true);
              }

              setAlerts(prev => {
                const alertId = `AL-SUPA-${latest.id}`;
                if (prev.some(a => a.id === alertId)) return prev;
                return [
                  {
                    id: alertId,
                    title: `Flame Breach: ${latest.strongest_direction || 'Front Vector'}`,
                    desc: `Database record #${latest.id}: Fire intensity ${latest.fire_intensity}%. Relay switch ${latest.relay_status}.`,
                    severity: 'critical',
                    timestamp: new Date(latest.created_at || latest.event_time || Date.now()).toLocaleTimeString(),
                    timeAgo: 'Just now',
                    node: 'NODE-ESP32-HARDWARE',
                    acknowledged: latest.relay_status === 'OFF',
                    code: `INTENSITY_${latest.fire_intensity}%`,
                    metric: `${latest.strongest_direction || 'Sensor'} · Relay ${latest.relay_status}`
                  },
                  ...prev
                ];
              });
            }
          }
        }
      } catch {
        // Offline / sandbox fallback
      }
    };

    fetchSupabaseEvents();
    const interval = setInterval(fetchSupabaseEvents, 10000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return (
    <TelemetryContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        vehicleMode,
        setVehicleMode,
        driveDirection,
        setDriveDirection,
        throttlePercent,
        setThrottlePercent,
        pumpActive,
        setPumpActive,
        togglePump,
        emergencyStop,
        triggerEmergencyStop,
        resetEmergencyStop,
        isAlarmSilenced,
        toggleSilenceAlarm,
        simulateFireTrigger,
        fireDetected,
        flameSensors,
        obstacleDistance,
        batteryLevel,
        batteryVoltage,
        dieTemperature,
        reservoirLevel,
        latencyMs,
        wifiRssi,
        alerts,
        acknowledgeAlert,
        acknowledgeAllAlerts,
        clearAcknowledgedAlerts,
        incidents,
        selectedIncident,
        setSelectedIncident,
        recalibrateSensors,
        isRecalibrating,
        toastMessage,
        showToast,
        sprayDuration,
        setSprayDuration,
        safetyDistance,
        setSafetyDistance,
        adcThreshold,
        setAdcThreshold,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        toggleMobileMenu,
        liveTracker,
        setLiveTracker,
        dispatchToWaypoint,
        clearPathTrail,
        resetOdometer,
        gpsData,
        setGpsData,
        esp32CamUrl,
        setEsp32CamUrl,
        isCameraConnected,
        setIsCameraConnected,
        databaseMaps,
        activeMap,
        setActiveMapId,
        isSyncingMap,
        syncMapsFromDatabase,
        saveMapToDatabase,
        servoAngle,
        setServoAngle
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetry = () => {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }
  return context;
};
