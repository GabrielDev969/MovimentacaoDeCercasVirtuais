import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class CSVWriter {
  constructor() {
    this.filePath = path.resolve(__dirname, '../..', 'movimentacoes.csv');
    this.headers = [
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
    ];
    this.initialized = false;
    this.initPromise = null;
  }

  async initialize() {
    if (this.initialized) return;

    if(this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = (async () => {
      try {
        await fs.access(this.filePath);
        console.log(`Arquivo ${this.filePath} já existe`);
      }catch{
        await fs.writeFile(this.filePath, this.headers.join(';') + '\n', 'utf-8');
        console.log(`Arquivo ${this.filePath} criado com sucesso`);
      }
      this.initialized = true;
    })();

    await this.initPromise;
  }

  escapeValue(value) {
    if (value === null || value === undefined) {
      return '';
    }

    const str = String(value);

    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  writeTransition(data) {
    this.initialize();

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
      fs.appendFileSync(this.filePath, line, 'utf-8');
      return true;
    } catch (error) {
      console.error(
        `Erro ao escrever no arquivo ${this.filePath}: ${error.message}`
      );
      return false;
    }
  }
}

export const csvWriter = new CSVWriter();
