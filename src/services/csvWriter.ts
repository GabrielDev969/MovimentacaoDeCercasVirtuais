import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { TransitionData } from '../types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class CSVWriter {
  private readonly filePath: string;
  private readonly headers: readonly string[] = [
    'timestamp',
    'device_id',
    'plate',
    'identifier',
    'area_name',
    'transition_type',
    'duration_ms',
    'duration_formatted',
    'latitude',
    'longitude',
  ] as const;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.filePath = path.resolve(__dirname, '../..', 'movimentacoes.csv');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = (async () => {
      try {
        await fs.promises.access(this.filePath);
        console.log(`Arquivo ${this.filePath} já existe`);
      } catch {
        await fs.promises.writeFile(
          this.filePath,
          this.headers.join(';') + '\n',
          'utf-8'
        );
        console.log(`Arquivo ${this.filePath} criado com sucesso`);
      }
      this.initialized = true;
    })();

    await this.initPromise;
  }

  escapeValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    const str = String(value);

    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  async writeTransition(data: TransitionData): Promise<boolean> {
    await this.initialize();

    const row = [
      new Date().toISOString(),
      data.deviceId,
      data.plate,
      data.identifier,
      data.areaName,
      data.transitionType,
      data.durationMs,
      data.durationFormatted,
      data.latitude,
      data.longitude,
    ];

    const line = row.map((v) => this.escapeValue(v)).join(';') + '\n';

    try {
      await fs.promises.appendFile(this.filePath, line, 'utf-8');
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(
        `Erro ao escrever no arquivo ${this.filePath}: ${errorMessage}`
      );
      return false;
    }
  }
}

export const csvWriter = new CSVWriter();
