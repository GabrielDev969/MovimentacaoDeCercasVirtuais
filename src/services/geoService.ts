import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import type { GeoJSONFeatureCollection, GeoResult, Area } from '../types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class GeoService {
  private areas: Map<string, Area> = new Map();

  loadAreas(configPath: string): number {
    const fullPath = path.resolve(__dirname, '../..', configPath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Arquivo de configuração ${configPath} não encontrado`);
    }

    const data: GeoJSONFeatureCollection = JSON.parse(
      fs.readFileSync(fullPath, 'utf8')
    );

    if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      throw new Error('Formato inválido do arquivo de áreas');
    }

    for (const feature of data.features) {
      const identifier = feature.properties?.identifier;
      if (!identifier) {
        console.warn(`Identificador não encontrado para a área: ${feature.id}`);
        continue;
      }

      if (feature.geometry.type !== 'Polygon') {
        console.warn(
          `Tipo de geometria não suportado: ${feature.geometry.type}`
        );
        continue;
      }

      this.areas.set(identifier, {
        name: feature.properties?.area_name || identifier,
        polygon: feature.geometry.coordinates[0],
      });
    }

    console.log(`Carregadas ${this.areas.size} áreas`);
    return this.areas.size;
  }

  private isPointInPolygon(
    lat: number,
    long: number,
    polygon: number[][]
  ): boolean {
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const [xi, yi] = polygon[i]!;
      const [xj, yj] = polygon[j]!;

      const intersect =
        yi > lat !== yj > lat &&
        long < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  checkDeviceInArea(
    identifier: string,
    latitude: number,
    longitude: number
  ): GeoResult {
    const area = this.areas.get(identifier);

    if (!area) {
      return {
        isInside: false,
        areaName: null,
        error: `Área ${identifier} não encontrada`,
      };
    }

    const isInside = this.isPointInPolygon(latitude, longitude, area.polygon);

    return {
      isInside,
      areaName: area.name,
      error: null,
    };
  }

  getAreaName(identifier: string): string | null {
    return this.areas.get(identifier)?.name || null;
  }
}

export const geoService = new GeoService();
