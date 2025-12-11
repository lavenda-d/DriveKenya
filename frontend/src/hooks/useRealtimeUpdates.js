import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const useRealtimeUpdates = (userId, onUpdate) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    // Initialize socket connection - use Vite env variable
    const socketUrl = import.meta.env?.VITE_SOCKET_URL || 'http://localhost:5000';
    socketRef.current = io(socketUrl, {
      auth: {
        token: localStorage.getItem('token')
      },
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    // Join user room for personalized updates
    socket.emit('join_user_room', userId);

    // Listen for various real-time events
    socket.on('booking_update', (data) => {
      onUpdate('booking', data);
    });

    socket.on('earnings_update', (data) => {
      onUpdate('earnings', data);
    });

    socket.on('maintenance_alert', (data) => {
      onUpdate('maintenance', data);
    });

    socket.on('pricing_change', (data) => {
      onUpdate('pricing', data);
    });

    socket.on('car_status_change', (data) => {
      onUpdate('car_status', data);
    });

    socket.on('admin_notification', (data) => {
      onUpdate('admin', data);
    });

    socket.on('new_user_registration', (data) => {
      onUpdate('new_user', data);
    });

    socket.on('car_approval_request', (data) => {
      onUpdate('car_approval', data);
    });

    // Handle connection events
    socket.on('connect', () => {
      console.log('🔌 Connected to real-time updates');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from real-time updates');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [userId, onUpdate]);

  // Function to emit events
  const emit = (event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  return { emit };
};

export default useRealtimeUpdates;