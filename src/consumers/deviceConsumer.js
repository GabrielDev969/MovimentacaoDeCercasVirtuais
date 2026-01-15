import { geoService } from '../services/geoService.js';
import { stateManager } from '../services/stateManager.js';
import { csvWriter } from '../services/csvWriter.js';

class DeviceConsumer {
  constructor(kafka, config) {
    this.consumer = kafka.consumer({ groupId: config.groupId });
    this.topic = config.topic;
    this.isRunning = false;
  }

  async connect() {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: this.topic,
        fromBegginning: false,
      });
      console.log(`Consumidor conectado ao tópico ${this.topic}`);
    } catch (error) {
      console.error(`Erro ao conectar ao consumidor: ${error.message}`);
      throw error;
    }
  }

  async start() {
    this.isRunning = true;

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        try {
          await this.processMessage(message);
        } catch (error) {
          console.error(`Erro ao processar mensagem: ${error.message}`);
        }
      },
    });

    console.log(`Consumidor iniciado para o tópico ${this.topic}`);
  }

  async processMessage(message) {
    const rawValue = message.value?.toString();

    if (!rawValue) {
      console.warn(`Mensagem vazia ou não string: ${message.value}`);
      return;
    }

    let data;

    try {
      data = JSON.parse(rawValue);
    } catch (error) {
      console.error(`Erro ao parsear JSON: ${error.message}`);
      return;
    }

    const requiredFields = ['device_id', 'identifier', 'latitude', 'longitude'];
    const missingFields = requiredFields.filter((f) => data[f] === undefined);

    if (missingFields.length > 0) {
      console.warn(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
      return;
    }

    const { device_id, identifier, latitude, longitude, plate, code } = data;

    const geoResult = geoService.checkDeviceInArea(
      identifier,
      latitude,
      longitude
    );

    if (geoResult.error) {
      console.warn(`Erro ao verificar dispositivo na área: ${geoResult.error}`);
      return;
    }

    const transition = stateManager.processTransition(
      device_id,
      geoResult.isInside,
      {
        identifier,
        plate: plate || code || 'N/A',
      }
    );

    const statusIcon = geoResult.isInside ? '🟢' : '🔴';
    const statusText = geoResult.isInside ? 'DENTRO' : 'FORA';

    console.log(
      `${statusIcon} [${new Date().toLocaleTimeString()}] Device ${device_id} | ${plate || 'N/A'} | ${geoResult.areaName} | ${statusText} | (${latitude}, ${longitude})`
    );

    if (transition.hasTransition) {
      const durationFormatted = stateManager.formatDuration(
        transition.duration
      );

      csvWriter.writeTransition({
        deviceId: device_id,
        plate: plate || code || 'N/A',
        identifier,
        areaName: geoResult.areaName,
        transitionType: transition.transitionType,
        durationMs: transition.duration,
        durationFormatted,
        latitude,
        longitude,
      });

      const emoji = transition.transitionType === 'ENTRADA' ? '🟢' : '🔴';
      const action =
        transition.transitionType === 'ENTRADA'
          ? 'ENTROU na área'
          : 'SAIU da área';
      const previousLocation =
        transition.transitionType === 'ENTRADA' ? 'fora' : 'dentro';

      console.log('═'.repeat(60));
      console.log(`${emoji} TRANSIÇÃO DETECTADA!`);
      console.log(`   Dispositivo: ${device_id} | Placa: ${plate || 'N/A'}`);
      console.log(`   Área: ${geoResult.areaName} (${identifier})`);
      console.log(`   Ação: ${action}`);
      console.log(`   Tempo ${previousLocation}: ${durationFormatted}`);
      console.log(`   Coordenadas: (${latitude}, ${longitude})`);
      console.log('═'.repeat(60));
    } else if (transition.transitionType === 'PRIMEIRO_REGISTRO') {
      console.log(
        `Primeiro registro do dispositivo ${device_id} | ${plate || 'N/A'}`
      );
    }
  }

  async disconnect() {
    this.isRunning = false;
    await this.consumer.disconnect();
    console.log('🔌 Consumidor desconectado');
  }
}

export { DeviceConsumer };
