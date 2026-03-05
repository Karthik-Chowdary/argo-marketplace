import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../middleware/logger';
import { WSMessage, ArgoApplication, DeployProgress } from '../types';

interface WSClient {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  isAlive: boolean;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  initialize(server: HTTPServer): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      perMessageDeflate: false,
    });

    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = uuidv4();
      const client: WSClient = {
        id: clientId,
        ws,
        subscriptions: new Set(['apps']), // Default subscription
        isAlive: true,
      };

      this.clients.set(clientId, client);
      logger.info(`WebSocket client connected: ${clientId} (total: ${this.clients.size})`);

      // Send connection acknowledgment
      this.sendToClient(client, {
        type: 'connection_ack',
        payload: { clientId, message: 'Connected to ArgoCD Marketplace' },
        timestamp: new Date().toISOString(),
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as WSMessage;
          this.handleMessage(client, message);
        } catch (error) {
          logger.warn('Invalid WebSocket message', { clientId, error });
        }
      });

      ws.on('pong', () => {
        client.isAlive = true;
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        logger.info(`WebSocket client disconnected: ${clientId} (total: ${this.clients.size})`);
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${clientId}`, { error });
        this.clients.delete(clientId);
      });
    });

    // Heartbeat ping every 30s
    this.pingInterval = setInterval(() => {
      this.clients.forEach((client, id) => {
        if (!client.isAlive) {
          logger.debug(`Terminating inactive WebSocket client: ${id}`);
          client.ws.terminate();
          this.clients.delete(id);
          return;
        }
        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
      }
    });

    logger.info('WebSocket server initialized on /ws');
  }

  private handleMessage(client: WSClient, message: WSMessage): void {
    switch (message.type) {
      case 'subscribe': {
        const topic = (message.payload as { topic: string }).topic;
        if (topic) {
          client.subscriptions.add(topic);
          logger.debug(`Client ${client.id} subscribed to: ${topic}`);
        }
        break;
      }
      case 'unsubscribe': {
        const topic = (message.payload as { topic: string }).topic;
        if (topic) {
          client.subscriptions.delete(topic);
          logger.debug(`Client ${client.id} unsubscribed from: ${topic}`);
        }
        break;
      }
      case 'ping': {
        this.sendToClient(client, {
          type: 'pong',
          payload: {},
          timestamp: new Date().toISOString(),
        });
        break;
      }
      default:
        logger.debug(`Unknown message type from ${client.id}: ${message.type}`);
    }
  }

  private sendToClient(client: WSClient, message: WSMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error(`Failed to send to client ${client.id}`, { error });
      }
    }
  }

  broadcastAppUpdate(app: ArgoApplication): void {
    const message: WSMessage = {
      type: 'app_update',
      payload: { app },
      timestamp: new Date().toISOString(),
    };
    this.broadcast('apps', message);
  }

  broadcastAppAdded(app: ArgoApplication): void {
    const message: WSMessage = {
      type: 'app_added',
      payload: { app },
      timestamp: new Date().toISOString(),
    };
    this.broadcast('apps', message);
  }

  broadcastAppDeleted(appName: string): void {
    const message: WSMessage = {
      type: 'app_deleted',
      payload: { name: appName },
      timestamp: new Date().toISOString(),
    };
    this.broadcast('apps', message);
  }

  broadcastDeployProgress(progress: DeployProgress): void {
    const message: WSMessage = {
      type: 'deploy_progress',
      payload: progress,
      timestamp: new Date().toISOString(),
    };
    // Send to clients subscribed to this specific deploy
    this.broadcast(`deploy:${progress.deployId}`, message);
    // Also send to general deploy watchers
    this.broadcast('deploys', message);
  }

  private broadcast(topic: string, message: WSMessage): void {
    this.clients.forEach((client) => {
      if (client.subscriptions.has(topic) || client.subscriptions.has('*')) {
        this.sendToClient(client, message);
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();
export default wsManager;
