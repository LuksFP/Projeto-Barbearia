export interface Notification {
  id: string;
  type: 'appointment' | 'order' | 'info';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

let notifications: Notification[] = [];

export const notificationService = {
  async getAll(): Promise<Notification[]> {
    return notifications;
  },

  async add(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification> {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      read: false,
    };
    notifications = [newNotification, ...notifications];
    return newNotification;
  },

  async markAsRead(id: string): Promise<Notification | null> {
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index] = { ...notifications[index], read: true };
      return notifications[index];
    }
    return null;
  },

  async markAllAsRead(): Promise<void> {
    notifications = notifications.map(n => ({ ...n, read: true }));
  },

  async clear(): Promise<void> {
    notifications = [];
  },

  getUnreadCount(): number {
    return notifications.filter(n => !n.read).length;
  },

  async sendEmail(_to: string, _subject: string, _body: string): Promise<boolean> {
    return true;
  },

  async sendSMS(_to: string, _message: string): Promise<boolean> {
    return true;
  },
};
