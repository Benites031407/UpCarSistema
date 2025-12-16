import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';

export interface DashboardMetrics {
  machines: {
    total: number;
    online: number;
    offline: number;
    maintenance: number;
    inUse: number;
  };
  sessions: {
    total: number;
    active: number;
    completed: number;
    pending: number;
    failed: number;
  };
  revenue: {
    today: number;
    thisMonth: number;
    total: number;
  };
  notifications: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
  };
}

export interface MachineUpdate {
  id: string;
  code: string;
  location: string;
  status: 'online' | 'offline' | 'maintenance' | 'in_use';
  temperature?: number;
  lastHeartbeat?: string;
  currentOperatingHours: number;
  maintenanceInterval: number;
}

export interface SessionUpdate {
  id: string;
  userId: string;
  machineId: string;
  duration: number;
  cost: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
}

export interface NotificationUpdate {
  id: string;
  type: 'maintenance_required' | 'machine_offline' | 'system_error';
  machineId?: string;
  message: string;
  whatsappStatus: 'pending' | 'sent' | 'failed';
  createdAt: string;
}

export interface SystemAlert {
  type: 'error' | 'warning' | 'info';
  message: string;
  details?: any;
}

export interface MachineHeartbeat {
  machineId: string;
  temperature?: number;
  timestamp: string;
}

export const useRealtimeDashboard = () => {
  const { socket, isConnected, joinAdminDashboard } = useWebSocket();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentMachineUpdates, setRecentMachineUpdates] = useState<MachineUpdate[]>([]);
  const [recentSessionUpdates, setRecentSessionUpdates] = useState<SessionUpdate[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<NotificationUpdate[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [machineHeartbeats, setMachineHeartbeats] = useState<Map<string, MachineHeartbeat>>(new Map());

  // Join admin dashboard room when connected
  useEffect(() => {
    if (isConnected) {
      joinAdminDashboard();
    }
  }, [isConnected, joinAdminDashboard]);

  // Set up event listeners
  useEffect(() => {
    if (!socket) return;

    // Dashboard metrics updates
    const handleDashboardMetrics = (data: { data: DashboardMetrics; timestamp: string }) => {
      setMetrics(data.data);
    };

    // Machine updates
    const handleMachineUpdate = (data: { data: MachineUpdate; timestamp: string }) => {
      setRecentMachineUpdates(prev => {
        const updated = [data.data, ...prev.filter(m => m.id !== data.data.id)];
        return updated.slice(0, 50); // Keep last 50 updates
      });
    };

    // Session updates
    const handleSessionUpdate = (data: { data: SessionUpdate; timestamp: string }) => {
      setRecentSessionUpdates(prev => {
        const updated = [data.data, ...prev.filter(s => s.id !== data.data.id)];
        return updated.slice(0, 50); // Keep last 50 updates
      });
    };

    // Notification updates
    const handleNotification = (data: { data: NotificationUpdate; timestamp: string }) => {
      setRecentNotifications(prev => {
        const updated = [data.data, ...prev];
        return updated.slice(0, 100); // Keep last 100 notifications
      });
    };

    // System alerts
    const handleSystemAlert = (data: { data: SystemAlert; timestamp: string }) => {
      setSystemAlerts(prev => {
        const updated = [data.data, ...prev];
        return updated.slice(0, 20); // Keep last 20 alerts
      });
    };

    // Machine heartbeats
    const handleMachineHeartbeat = (data: { data: MachineHeartbeat; timestamp: string }) => {
      setMachineHeartbeats(prev => {
        const updated = new Map(prev);
        updated.set(data.data.machineId, data.data);
        return updated;
      });
    };

    // Register event listeners
    socket.on('dashboard-metrics', handleDashboardMetrics);
    socket.on('machine-update', handleMachineUpdate);
    socket.on('session-update', handleSessionUpdate);
    socket.on('notification', handleNotification);
    socket.on('system-alert', handleSystemAlert);
    socket.on('machine-heartbeat', handleMachineHeartbeat);

    // Cleanup
    return () => {
      socket.off('dashboard-metrics', handleDashboardMetrics);
      socket.off('machine-update', handleMachineUpdate);
      socket.off('session-update', handleSessionUpdate);
      socket.off('notification', handleNotification);
      socket.off('system-alert', handleSystemAlert);
      socket.off('machine-heartbeat', handleMachineHeartbeat);
    };
  }, [socket]);

  // Clear alerts
  const clearAlert = useCallback((index: number) => {
    setSystemAlerts(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Clear all alerts
  const clearAllAlerts = useCallback(() => {
    setSystemAlerts([]);
  }, []);

  return {
    metrics,
    recentMachineUpdates,
    recentSessionUpdates,
    recentNotifications,
    systemAlerts,
    machineHeartbeats: Array.from(machineHeartbeats.values()),
    isConnected,
    clearAlert,
    clearAllAlerts
  };
};