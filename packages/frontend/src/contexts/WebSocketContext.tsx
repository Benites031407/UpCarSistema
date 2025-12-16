import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinAdminDashboard: () => void;
  joinMachineMonitoring: (machineId: string) => void;
  joinSessionMonitoring: (sessionId: string) => void;
  sendPing: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Only connect if user is authenticated
    const token = localStorage.getItem('accessToken');
    if (!user || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      auth: {
        token
      },
      transports: ['websocket', 'polling']
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('WebSocket connected:', newSocket.id);
      setIsConnected(true);
      
      // Automatically join user room for payment notifications
      if (user?.id) {
        newSocket.emit('join-user-room', user.id);
        console.log('Joined user room:', user.id);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Ping/pong for connection health
    newSocket.on('pong', () => {
      console.log('WebSocket pong received');
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user]);

  const joinAdminDashboard = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('join-admin-dashboard');
      console.log('Joined admin dashboard room');
    }
  }, [socket, isConnected]);

  const joinMachineMonitoring = useCallback((machineId: string) => {
    if (socket && isConnected) {
      socket.emit('join-machine-monitoring', machineId);
      console.log(`Joined machine monitoring room: ${machineId}`);
    }
  }, [socket, isConnected]);

  const joinSessionMonitoring = useCallback((sessionId: string) => {
    if (socket && isConnected) {
      socket.emit('join-session-monitoring', sessionId);
      console.log(`Joined session monitoring room: ${sessionId}`);
    }
  }, [socket, isConnected]);

  const sendPing = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('ping');
    }
  }, [socket, isConnected]);

  const value: WebSocketContextType = {
    socket,
    isConnected,
    joinAdminDashboard,
    joinMachineMonitoring,
    joinSessionMonitoring,
    sendPing
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};