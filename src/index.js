import 'dotenv/config';
import { createKafkaClient, getKafkaConfig } from './config/kafka.js';
import { geoService } from './services/geoService.js';
import { csvWriter } from './services/csvWriter.js';
import { DeviceConsumer } from './consumers/deviceConsumer.js';

async function main() {
  console.log('🚀 Iniciando sistema de rastreamento de dispositivos...\n');

  try {
    console.log('📂 Carregando configuração de áreas...');
    geoService.loadAreas('config/config_areas.geojson');

    console.log('📝 Inicializando arquivo CSV...');
    csvWriter.initialize();

    console.log('🔗 Conectando ao Kafka...');
    const kafka = createKafkaClient();
    const kafkaConfig = getKafkaConfig();

    if (!kafkaConfig.topic) {
      throw new Error('KAFKA_TOPIC não configurado no .env');
    }

    const consumer = new DeviceConsumer(kafka, kafkaConfig);
    await consumer.connect();

    const shutdown = async (signal) => {
      console.log(`\n⚠️ Recebido ${signal}, encerrando...`);
      await consumer.disconnect();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    await consumer.start();

  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();