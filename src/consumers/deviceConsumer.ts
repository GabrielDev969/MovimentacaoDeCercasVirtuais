import type { Consumer, Kafka, KafkaMessage } from 'kafkajs';
import { geoService } from '../services/geoService.js';
import { stateManager } from '../services/stateManager.js';
import { csvWriter } from '../services/csvWriter.js';
import type { DeviceMessage, KafkaConfig } from '../types/index.js';

export class DeviceConsumer {
    private readonly consumer: Consumer;
    private readonly topic: string;
    private isRunning = false;

    constructor(kafka: Kafka, config: KafkaConfig) {
        this.consumer = kafka.consumer({ groupId: config.groupId });
        this.topic = config.topic;
    }

    async connect(): Promise<void> {
        try {
            await this.consumer.connect();
            await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });
            console.log(`Consumidor conectado ao tópico ${this.topic}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error(`Erro ao conectar ao consumidor: ${errorMessage}`);
            throw error;
        }
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            throw new Error('Consumidor já está em execução');
        }
        this.isRunning = true;

        await this.consumer.run({
            eachMessage: async ({ message }) => {
                try {
                    await this.processMessage(message);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
                    console.error(`Erro ao processar mensagem: ${errorMessage}`);
                }
            },
        });
        
        console.log(`Consumidor iniciado para o tópico ${this.topic}`);
    }

    private async processMessage(message: KafkaMessage): Promise<void> {
        const rawValue = message.value?.toString();

        if(!rawValue) {
            console.warn(`Mensagem vazia ou não string: ${message.value}`);
            return;
        }

        let data: DeviceMessage;

        try{
            data = JSON.parse(rawValue) as DeviceMessage;
        }catch(error){
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error(`Erro ao parsear JSON: ${errorMessage}`);
            return;
        }

        const requiredFields: (keyof DeviceMessage)[] = ['device_id', 'identifier', 'latitude', 'longitude'];
        const missingFields = requiredFields.filter((field) => data[field] === undefined);

        if(missingFields.length > 0) {
            console.warn(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
            return;
        }

        const { device_id, identifier, latitude, longitude, plate, code } = data;
        
        const geoResult = geoService.checkDeviceInArea(identifier, latitude, longitude);

        if(geoResult.error) {
            console.warn(`Erro ao verificar dispositivo na área: ${geoResult.error}`);
            return;
        }

        const transition = stateManager.proccessTransition(
            device_id, 
            geoResult.isInside, 
            { indentifier: 
                identifier, plate: plate || code || 'N/A' 
            }
        );

        const statusIcon = geoResult.isInside ? '🟢' : '🔴';
        const statusText = geoResult.isInside ? 'DENTRO' : 'FORA';

        console.log(`${statusIcon} [${new Date().toLocaleTimeString()}] Device ${device_id} | ${plate || 'N/A'} | ${geoResult.areaName} | ${statusText} | (${latitude}, ${longitude})`);

        if(transition.hasTransition) {
            const durationFormatted = stateManager.formatDuration(transition.duration!);
            
            await csvWriter.writeTransition({
                deviceId: device_id,
                plate: plate || code || 'N/A',
                identifier,
                areaName: geoResult.areaName!,
                transitionType: transition.transitionType,
                durationMs: transition.duration!,
                durationFormatted,
                latitude,
                longitude,
            });

            const emoji = transition.transitionType === 'ENTRADA' ? '🟢' : '🔴';
            const action = transition.transitionType === 'ENTRADA' ? 'ENTROU na área' : 'SAIU da área';
            const previousLocation = transition.transitionType === 'ENTRADA' ? 'fora' : 'dentro';

            console.log('═'.repeat(60));
            console.log(`${emoji} TRANSIÇÃO DETECTADA!`);
            console.log(`   Dispositivo: ${device_id} | Placa: ${plate || 'N/A'}`);
            console.log(`   Área: ${geoResult.areaName} (${identifier})`);
            console.log(`   Ação: ${action}`);
            console.log(`   Tempo ${previousLocation}: ${durationFormatted}`);
            console.log(`   Coordenadas: (${latitude}, ${longitude})`);
            console.log('═'.repeat(60));
        }else if(transition.transitionType === 'PRIMEIRO_REGISTRO') {
            console.log(`Primeiro registro do dispositivo ${device_id} | ${plate || 'N/A'}`);
        }
    }

    async disconnect(): Promise<void> {
        if (!this.isRunning) {
            console.warn('Consumidor não está em execução');
            return;
        }
        this.isRunning = false;
        await this.consumer.disconnect();
        console.log('🔌 Consumidor desconectado');
    }
}