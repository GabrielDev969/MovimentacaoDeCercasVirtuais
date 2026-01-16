export interface DeviceMessage {
  device_id: string;
  identifier: string;
  latitude: number;
  longitude: number;
  plate?: string;
  code?: string;
}

export interface GeoJSONFeature {
  type: 'Feature';
  id?: string;
  properties: {
    identifier: string;
    area_name: string;
    [key: string]: unknown;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface GeoResult {
  isInside: boolean;
  areaName: string | null;
  error: string | null;
}

export interface Area {
  name: string;
  polygon: number[][];
}

export type TransitionType = 'ENTRADA' | 'SAIDA' | 'PRIMEIRO_REGISTRO' | null;

export interface Transition {
  hasTransition: boolean;
  previousState: boolean | null;
  duration: number | null;
  transitionType: TransitionType;
}

export interface DeviceState {
  isInside: boolean;
  lastStateChange: Date;
  indentifier: string;
  plate: string;
}

export interface TransitionData {
  deviceId: string;
  plate: string;
  identifier: string;
  areaName: string;
  transitionType: TransitionType;
  durationMs: number;
  durationFormatted: string;
  latitude: number;
  longitude: number;
}

export interface KafkaConfig {
  topic: string;
  groupId: string;
}

export interface DeviceInfo {
  indentifier: string;
  plate: string;
}
