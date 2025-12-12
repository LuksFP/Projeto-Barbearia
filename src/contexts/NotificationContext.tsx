import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { notificationService, Notification } from '@/services/notificationService';

export type { Notification } from '@/services/notificationService';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Load notifications on mount
    const loadNotifications = async () => {
      try {
        const data = await notificationService.getAll();
        setNotifications(data);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = async (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    try {
      const newNotification = await notificationService.add(notification);
      setNotifications(prev => [newNotification, ...prev]);
    } catch (error) {
      console.error('Failed to add notification:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const clearNotifications = async () => {
    try {
      await notificationService.clear();
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
