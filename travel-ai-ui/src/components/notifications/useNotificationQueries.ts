import { useEffect } from 'react';
import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../../api/notifications';

const queryKeys = {
  notifications: ['notifications'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};

const getApiOrigin = () => {
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5134/api';
  return apiBaseUrl.replace(/\/api\/?$/, '');
};

export const useNotificationQueries = () => {
  const queryClient = useQueryClient();
  const hasToken = Boolean(localStorage.getItem('token'));

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: getNotifications,
    enabled: hasToken,
    refetchInterval: 30_000,
  });

  const unreadCountQuery = useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: getUnreadNotificationCount,
    enabled: hasToken,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (!hasToken) return;

    const connection = new HubConnectionBuilder()
      .withUrl(`${getApiOrigin()}/hubs/notifications`, {
        accessTokenFactory: () => localStorage.getItem('token') ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      void queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    };

    connection.on('notification_created', refresh);
    connection.on('booking_confirmed', refresh);
    connection.on('partner_booking_confirmed', refresh);

    connection.start().catch((error) => console.error('SignalR notification connection failed', error));

    return () => {
      if (connection.state !== HubConnectionState.Disconnected) {
        void connection.stop();
      }
    };
  }, [hasToken, queryClient]);

  const refreshNotifications = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    void queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
  };

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: refreshNotifications,
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: refreshNotifications,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: refreshNotifications,
  });

  return {
    notifications: notificationsQuery.data ?? [],
    unreadCount: unreadCountQuery.data ?? 0,
    isLoading: notificationsQuery.isLoading,
    markAsRead: markReadMutation.mutate,
    markAllAsRead: markAllReadMutation.mutate,
    deleteNotification: deleteMutation.mutate,
  };
};
