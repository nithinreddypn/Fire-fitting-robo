export type NavPage =
  | 'dashboard'
  | 'live-monitoring'
  | 'fire-detection'
  | 'alerts'
  | 'reports-analytics'
  | 'device-information'
  | 'settings';

export type VehicleMode = 'auto' | 'manual';
export type DriveDirection = 'IDLE' | 'FORWARD' | 'BACKWARD' | 'LEFT' | 'RIGHT' | 'STOP';

export interface FlameSensors {
  left: number;
  center: number;
  right: number;
  frontLeft?: number;
  frontRight?: number;
}

export interface LiveTrackerPoint {
  x: number;
  y: number;
}

export interface LiveTrackerData {
  posX: number;
  posY: number;
  speed: number;
  heading: number;
  odometer: number;
  targetWaypoint: string;
  currentSector: string;
  trackingStatus: 'PATROLLING' | 'INTERCEPTING HAZARD' | 'MANUAL TELEOP' | 'HOLDING STATION';
  pathHistory: LiveTrackerPoint[];
  missionElapsedSeconds: number;
}

export interface GpsData {
  latitude: number;
  longitude: number;
  altitude: number;
  satellites: number;
  hdop: number;
  compassHeading: number;
  fixStatus: '3D Fix' | '2D Fix' | 'Acquiring';
  zone: string;
}

export interface AlertItem {
  id: string;
  title: string;
  desc: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  timeAgo: string;
  node: string;
  acknowledged: boolean;
  code?: string;
  metric?: string;
}

export interface IncidentItem {
  id: string;
  timestamp: string;
  vector: 'Center Cone' | 'Left Flank' | 'Right Cone';
  peakAdc: number;
  action: string;
  status: 'Extinguished' | 'Cleared' | 'Active';
  responseDuration: string;
  fluidUsed: string;
  sensorTriggered: string;
}

export interface FacilityMapSector {
  id: string;
  name: string;
  code: string;
  x: number; // in meters
  y: number;
  width: number;
  height: number;
  fillColor: string;
  strokeColor: string;
  hazardLevel: 'low' | 'moderate' | 'high' | 'critical';
  description?: string;
}

export interface FacilityWaypoint {
  id: string;
  name: string;
  label: string;
  x: number; // in meters
  y: number;
  sectorId: string;
  isPatrolPoint?: boolean;
}

export interface FacilityObstacle {
  id: string;
  type: 'wall' | 'pillar' | 'hazard_zone' | 'machinery';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
}

export interface FacilityMapData {
  id: string;
  mapId: string;
  name: string;
  facilityType: string;
  dimensions: {
    widthMeters: number;
    heightMeters: number;
  };
  sectors: FacilityMapSector[];
  waypoints: FacilityWaypoint[];
  obstacles: FacilityObstacle[];
  originLabel: string;
  lastSyncedAt?: string;
  source: 'database' | 'local_db' | 'custom_uploaded';
}
