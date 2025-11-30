import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { MachineUpdate, SessionUpdate, NotificationUpdate, MachineHeartbeat } from './useRealtimeDashboard';

export const useRealtimeMachine = (machineId: string) => {
  const { socket, isConnected, joinMachineMonitoring } = useWebSocket();
  const [machineData, setMachineData] = useState<MachineUpdate | null>(null);
  const [activeSessions, setActiveSessions] = useState<SessionUpdate[]>([]);
  const [machineNotifications, setMachineNotifications] = useState<NotificationUpdate[]>([]);
  const [heartbeat, setHeartbeat] = useState<MachineHeartbeat | null>(null);

  // Join machine monitoring room when connected
  useEffect(() => {
    if (isConnected && machineId) {
      joinMachineMonitoring(machineId);
    }
  }, [isConnected, machineId, joinMachineMonitoring]);

  // Set up event listeners
  useEffect(() => {
    if (!socket || !machineId) return;

    // Machine updates
    const handleMachineUpdate = (data: { data: MachineUpdate; timestamp: string }) => {
      if (data.data.id === machineId) {
        setMachineData(data.data);
      }
    };

    // Session updates for this machine
    const handleSessionUpdate = (data: { data: SessionUpdate; timestamp: string }) => {
      if (data.data.machineId === machineId) {
        setActiveSessions(prev => {
          const filtered = prev.filter(s => s.id !== data.data.id);
          if (data.data.status === 'active') {
            return [data.data, ...filtered];
          }
          return filtered;
        });
      }
    };

    // Notifications for this machine
    const handleNotification = (data: { data: NotificationUpdate; timestamp: string }) => {
      if (data.data.machineId === machineId) {
        setMachineNotifications(prev => {
          const updated = [data.data, ...prev];
          return updated.slice(0, 20); // Keep last 20 notifications
        });
      }
    };

    // Heartbeat updates for this machine
    const handleMachineHeartbeat = (data: { data: MachineHeartbeat; timestamp: string }) => {
      if (data.data.machineId === machineId) {
        setHeartbeat(data.data);
      }
    };

    // Register event listeners
    socket.on('machine-update', handleMachineUpdate);
    socket.on('session-update', handleSessionUpdate);
    socket.on('notification', handleNotification);
    socket.on('machine-heartbeat', handleMachineHeartbeat);

    // Cleanup
    return () => {
      socket.off('machine-update', handleMachineUpdate);
      socket.off('session-update', handleSessionUpdate);
      socket.off('notification', handleNotification);
      socket.off('machine-heartbeat', handleMachineHeartbeat);
    };
  }, [socket, machineId]);

  // Get connection status for this machine
  const getConnectionStatus = useCallback(() => {
    if (!heartbeat) return 'unknown';
    
    const now = new Date();
    const heartbeatTime = new Date(heartbeat.timestamp);
    const timeDiff = now.getTime() - heartbeatTime.getTime();
    
    // Consider offline if no heartbeat for more than 5 minutes
    if (timeDiff > 5 * 60 * 1000) {
      return 'offline';
    }
    
    // Consider warning if no heartbeat for more than 2 minutes
    if (timeDiff > 2 * 60 * 1000) {
      return 'warning';
    }
    
    return 'online';
  }, [heartbeat]);

  return {
    machineData,
    activeSessions,
    machineNotifications,
    heartbeat,
    connectionStatus: getConnectionStatus(),
    isConnected
  };
};