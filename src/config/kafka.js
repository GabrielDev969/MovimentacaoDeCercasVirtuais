import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Kafka } from 'kafkajs';

const _dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(_dirname, '../..');

function loadFile(relativePath) {
  const fullPath = path.resolve(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Arquivo ${relativePath} não encontrado`);
  }
  return fs.readFileSync(fullPath);
}

export function createKafkaClient() {
  const brokers = process.env.KAFKA_BROKERS?.split(',') || [];

  if (brokers.length === 0) {
    throw new Error('KAFKA_BROKERS não configurado no .env');
  }

  const sslConfig = {
    rejectUnauthorized: false,
    ca: loadFile(process.env.KAFKA_CA_CERTIFICATE_PATH),
    key: loadFile(process.env.KAFKA_KEY_CERTIFICATE_PATH),
    cert: loadFile(process.env.KAFKA_CERTIFICATE_PATH),
  };

  if (process.env.KAFKA_KEY_PASSWORD) {
    sslConfig.passphrase = process.env.KAFKA_KEY_PASSWORD;
  }

  const kafkaConfig = {
    clientId: process.env.KAFKA_CLIENT_ID || 'device-tracker',
    brokers,
    ssl: sslConfig,
    connectionsTimeout: 10000,
    retry: {
      initialRetryTime: 300,
      retries: 10,
    },
  };

  return new Kafka(kafkaConfig);
}

export function getKafkaConfig() {
  return {
    topic: process.env.KAFKA_TOPIC,
    groupId: process.env.KAFKA_GROUP_ID,
  };
}
