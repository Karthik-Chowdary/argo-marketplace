import { useEffect, useRef, useCallback } from 'react';
import { useAppStore, useDeployStore } from '../store';
import type { WSMessage, ArgoApplication, DeployProgress } from '../types';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const { updateApplication, addApplication, removeApplication } = useAppStore();
  const { setActiveDeployment } = useDeployStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected');
      // Subscribe to all events
      ws.send(JSON.stringify({ type: 'subscribe', payload: { topic: 'apps' } }));
      ws.send(JSON.stringify({ type: 'subscribe', payload: { topic: 'deploys' } }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.warn('[WS] Invalid message', error);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected, reconnecting...');
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error('[WS] Error', error);
      ws.close();
    };
  }, [updateApplication, addApplication, removeApplication, setActiveDeployment]);

  const handleMessage = useCallback(
    (message: WSMessage) => {
      switch (message.type) {
        case 'app_update': {
          const { app } = message.payload as { app: ArgoApplication };
          updateApplication(app);
          break;
        }
        case 'app_added': {
          const { app } = message.payload as { app: ArgoApplication };
          addApplication(app);
          break;
        }
        case 'app_deleted': {
          const { name } = message.payload as { name: string };
          removeApplication(name);
          break;
        }
        case 'deploy_progress': {
          const progress = message.payload as DeployProgress;
          setActiveDeployment(progress.deployId, progress);
          break;
        }
        case 'connection_ack':
          console.log('[WS] Connection acknowledged');
          break;
        case 'pong':
          break;
      }
    },
    [updateApplication, addApplication, removeApplication, setActiveDeployment]
  );

  const subscribe = useCallback((topic: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', payload: { topic } }));
    }
  }, []);

  const unsubscribe = useCallback((topic: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', payload: { topic } }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { subscribe, unsubscribe };
}
