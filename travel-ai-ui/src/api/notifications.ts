import axiosClient from './axiosClient';

export type NotificationItem = {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export const getNotifications = async () => {
  const { data } = await axiosClient.get<NotificationItem[]>('/notifications');
  return data;
};

export const getUnreadNotificationCount = async () => {
  const { data } = await axiosClient.get<{ count: number }>('/notifications/unread-count');
  return data.count;
};

export const markNotificationAsRead = async (id: number) => {
  await axiosClient.patch(`/notifications/${id}/read`);
};

export const markAllNotificationsAsRead = async () => {
  await axiosClient.patch('/notifications/read-all');
};

export const deleteNotification = async (id: number) => {
  await axiosClient.delete(`/notifications/${id}`);
};
