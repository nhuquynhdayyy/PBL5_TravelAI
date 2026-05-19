import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { HubConnection } from '@microsoft/signalr';
import axiosClient from '../api/axiosClient';
import { createNotificationConnection, notificationEventNames } from '../services/notificationService';

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  bookingId?: number;
  metadata?: Record<string, unknown> | null;
}

interface NotificationToast {
  id: string;
  message: string;
  type: string;
}

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  latestToast: NotificationToast | null;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  latestToast: null,
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearNotifications: () => {},
  dismissToast: () => {}
});

const maxStoredNotifications = 50;

const getUser = () => {
  try {
    const value = localStorage.getItem('user');
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const getRole = () => String(getUser()?.roleName ?? '').toLowerCase();

const getUserStorageKey = () => {
  const user = getUser();
  const userId = user?.userId ?? user?.id ?? user?.email ?? 'anonymous';
  return `travelai_notifications_${userId}`;
};

const readCachedNotifications = (): NotificationItem[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(getUserStorageKey()) || '[]') as NotificationItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeApiNotification = (value: any): NotificationItem => ({
  id: String(value.id ?? value.notificationId),
  type: String(value.type ?? 'notification'),
  message: String(value.message ?? 'Ban co thong bao moi.'),
  createdAt: new Date(value.createdAt ?? Date.now()).toISOString(),
  isRead: Boolean(value.isRead),
  bookingId: Number.isFinite(Number(value.metadata?.bookingId ?? value.bookingId))
    ? Number(value.metadata?.bookingId ?? value.bookingId)
    : undefined,
  metadata: value.metadata ?? null
});

const getPayloadMessage = (type: string, payload: any) => {
  if (typeof payload === 'string') return payload;
  if (payload?.message) return String(payload.message);
  if (type === notificationEventNames.partnerBookingConfirmed) return 'Co don hang moi da thanh toan.';
  if (type === notificationEventNames.userBookingConfirmed) return 'Don hang cua ban da duoc xac nhan thanh toan.';
  return 'Ban co thong bao moi.';
};

const normalizeRealtimeNotification = (type: string, payload: any): NotificationItem => ({
  id: payload?.id ? String(payload.id) : `${type}-${payload?.bookingId ?? 'event'}-${Date.now()}`,
  type,
  message: getPayloadMessage(type, payload),
  createdAt: new Date(payload?.createdAt ?? Date.now()).toISOString(),
  isRead: Boolean(payload?.isRead),
  bookingId: Number.isFinite(Number(payload?.bookingId)) ? Number(payload.bookingId) : undefined,
  metadata: payload && typeof payload === 'object' ? payload : null
});

const mergeNotifications = (incoming: NotificationItem[], current: NotificationItem[]) => {
  const byId = new Map<string, NotificationItem>();

  [...incoming, ...current].forEach((notification) => {
    const existing = byId.get(notification.id);
    byId.set(notification.id, existing ? { ...existing, ...notification } : notification);
  });

  return Array.from(byId.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, maxStoredNotifications);
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => readCachedNotifications());
  const [latestToast, setLatestToast] = useState<NotificationToast | null>(null);

  useEffect(() => {
    localStorage.setItem(getUserStorageKey(), JSON.stringify(notifications.slice(0, maxStoredNotifications)));
  }, [notifications]);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setNotifications([]);
      return;
    }

    try {
      const res = await axiosClient.get('/notifications', {
        params: { page: 0, pageSize: maxStoredNotifications }
      });
      const history = (Array.isArray(res.data) ? res.data : []).map(normalizeApiNotification);
      setNotifications((current) => mergeNotifications(history, current));
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  const pushNotification = useCallback((type: string, payload: any) => {
    const role = getRole();
    if (type === notificationEventNames.partnerBookingConfirmed && role !== 'partner') return;
    if (type === notificationEventNames.userBookingConfirmed && role === 'partner') return;

    const notification = normalizeRealtimeNotification(type, payload);
    setNotifications((current) => mergeNotifications([notification], current));
    setLatestToast({
      id: notification.id,
      message: notification.message,
      type: notification.type
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = getRole();
    if (!token || !role) {
      setNotifications([]);
      return;
    }

    let connection: HubConnection | null = createNotificationConnection(token);

    const registerHandlers = (activeConnection: HubConnection) => {
      activeConnection.on(notificationEventNames.userBookingConfirmed, (payload) => {
        pushNotification(notificationEventNames.userBookingConfirmed, payload);
      });
      activeConnection.on(notificationEventNames.partnerBookingConfirmed, (payload) => {
        pushNotification(notificationEventNames.partnerBookingConfirmed, payload);
      });
      activeConnection.on(notificationEventNames.legacyReceive, (type: string, payload: any) => {
        pushNotification(type, payload);
      });
      activeConnection.on(notificationEventNames.legacyEnvelope, (envelope: any) => {
        pushNotification(envelope?.type ?? 'notification', envelope?.payload ?? envelope);
      });
    };

    registerHandlers(connection);
    connection.onreconnected(() => {
      fetchNotifications();
    });
    connection.start().catch((error) => {
      console.error('SignalR notification connection failed:', error);
    });

    fetchNotifications();

    return () => {
      if (connection) {
        connection.stop().catch(() => undefined);
        connection = null;
      }
    };
  }, [fetchNotifications, pushNotification]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );

    axiosClient.post(`/notifications/${id}/mark-read`).catch((err) => {
      console.error('Failed to mark notification as read:', err);
      fetchNotifications();
    });
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(() => {
    setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));

    axiosClient.post('/notifications/mark-all-read').catch((err) => {
      console.error('Failed to mark notifications as read:', err);
      fetchNotifications();
    });
  }, [fetchNotifications]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setLatestToast((current) => (current?.id === id ? null : current));
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      latestToast,
      markAsRead,
      markAllAsRead,
      clearNotifications,
      dismissToast
    }),
    [clearNotifications, dismissToast, latestToast, markAllAsRead, markAsRead, notifications, unreadCount]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => useContext(NotificationContext);
