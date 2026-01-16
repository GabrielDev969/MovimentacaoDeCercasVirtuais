import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Kafka, type KafkaConfig as KafkaJSConfig } from 'kafkajs';
import { KafkaConfig } from '../types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

function loadFile(relativePath: string): Buffer {
  const fullPath = path.resolve(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Arquivo ${relativePath} não encontrado`);
  }

  return fs.readFileSync(fullPath);
}

export function createKafkaClient(): Kafka {
  const brokers = process.env.KAFKA_BROKERS?.split(',') || [];

  if (brokers.length === 0) {
    throw new Error('KAFKA_BROKERS não configurado no .env');
  }

  const sslConfig: {
    rejectUnauthorized: boolean;
    ca: Buffer;
    key: Buffer;
    cert: Buffer;
    passphrase?: string;
  } = {
    rejectUnauthorized: false,
    ca: loadFile(process.env.KAFKA_CA_CERTIFICATE_PATH!),
    key: loadFile(process.env.KAFKA_KEY_CERTIFICATE_PATH!),
    cert: loadFile(process.env.KAFKA_CERTIFICATE_PATH!),
  };

  if (process.env.KAFKA_KEY_PASSWORD) {
    sslConfig.passphrase = process.env.KAFKA_KEY_PASSWORD;
  }

  const kafkaConfig: KafkaJSConfig = {
    clientId: process.env.KAFKA_CLIENT_ID || 'device-tracker',
    brokers,
    ssl: sslConfig,
    connectionTimeout: 10000,
    retry: {
      initialRetryTime: 300,
      retries: 10,
    },
  };

  return new Kafka(kafkaConfig);
}

export function getKafkaConfig(): KafkaConfig {
  const topic = process.env.KAFKA_TOPIC;
  const groupId = process.env.KAFKA_GROUP_ID;

  if (!topic || !groupId) {
    throw new Error('KAFKA_TOPIC ou KAFKA_GROUP_ID não configurado no .env');
  }

  return {
    topic,
    groupId,
  };
}
