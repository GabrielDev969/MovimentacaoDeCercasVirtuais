import 'dotenv/config';
import { createKafkaClient, getKafkaConfig } from './config/kafka.js';
import { geoService } from './services/geoService.js';
import { csvWriter } from './services/csvWriter.js';
import { DeviceConsumer } from './consumers/deviceConsumer.js';

async function main(): Promise<void> {
  console.log('🚀 Iniciando sistema de rastreamento de dispositivos...\n');

  try {
    console.log('📂 Carregando configuração de áreas...');
    geoService.loadAreas('config/config_areas.geojson');

    console.log('📝 Inicializando arquivo CSV...');
    await csvWriter.initialize();

    console.log('🔗 Conectando ao Kafka...');
    const kafka = createKafkaClient();
    const kafkaConfig = getKafkaConfig();

    const consumer = new DeviceConsumer(kafka, kafkaConfig);
    await consumer.connect();

    const shutdown = async (signal: string): Promise<void> => {
      console.log(`\n⚠️ Recebido ${signal}, encerrando...`);
      await consumer.disconnect();
      process.exit(0);
    };

    process.on('SIGINT', () => {
      void shutdown('SIGINT');
    });
    process.on('SIGTERM', () => {
      void shutdown('SIGTERM');
    });

    await consumer.start();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro fatal:', errorMessage);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

void main();
