import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';

export interface SessionUpdate {
  id: string;
  userId: string;
  machineId: string;
  duration: number;
  cost: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  paymentMethod: 'balance' | 'pix';
}

export interface SessionNotification {
  type: 'session_started' | 'session_ending' | 'session_completed' | 'session_failed';
  message: string;
  sessionId: string;
  timestamp: string;
}

export const useRealtimeSession = (sessionId?: string) => {
  const { socket, isConnected, joinSessionMonitoring } = useWebSocket();
  const [sessionData, setSessionData] = useState<SessionUpdate | null>(null);
  const [notifications, setNotifications] = useState<SessionNotification[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Join session monitoring room when connected and sessionId is provided
  useEffect(() => {
    if (isConnected && sessionId) {
      joinSessionMonitoring(sessionId);
    }
  }, [isConnected, sessionId, joinSessionMonitoring]);

  // Set up event listeners
  useEffect(() => {
    if (!socket || !sessionId) return;

    // Session updates
    const handleSessionUpdate = (data: { data: SessionUpdate; timestamp: string }) => {
      if (data.data.id === sessionId) {
        setSessionData(data.data);
        
        // Calculate time remaining for active sessions
        if (data.data.status === 'active' && data.data.startTime) {
          const startTime = new Date(data.data.startTime);
          const endTime = new Date(startTime.getTime() + data.data.duration * 60 * 1000);
          const now = new Date();
          const remaining = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
          setTimeRemaining(remaining);
        } else {
          setTimeRemaining(null);
        }
      }
    };

    // Session-specific notifications
    const handleSessionNotification = (data: { data: SessionNotification; timestamp: string }) => {
      if (data.data.sessionId === sessionId) {
        setNotifications(prev => {
          const updated = [data.data, ...prev];
          return updated.slice(0, 10); // Keep last 10 notifications
        });
      }
    };

    // Register event listeners
    socket.on('session-update', handleSessionUpdate);
    socket.on('session-notification', handleSessionNotification);

    // Cleanup
    return () => {
      socket.off('session-update', handleSessionUpdate);
      socket.off('session-notification', handleSessionNotification);
    };
  }, [socket, sessionId]);

  // Update time remaining every second for active sessions
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  // Format time remaining as MM:SS
  const formatTimeRemaining = useCallback(() => {
    if (timeRemaining === null) return null;
    
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timeRemaining]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Get session progress percentage
  const getProgress = useCallback(() => {
    if (!sessionData || !sessionData.startTime || sessionData.status !== 'active') {
      return 0;
    }

    const startTime = new Date(sessionData.startTime);
    const totalDuration = sessionData.duration * 60; // Convert to seconds
    const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
    
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  }, [sessionData]);

  return {
    sessionData,
    notifications,
    timeRemaining,
    formattedTimeRemaining: formatTimeRemaining(),
    progress: getProgress(),
    isConnected,
    clearNotifications
  };
};