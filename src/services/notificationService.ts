// Notification Service - Ready for backend integration
// TODO: Replace mock implementations with actual API calls

export interface Notification {
  id: string;
  type: 'appointment' | 'order' | 'info';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

// Mock data store - will be replaced by database
let notifications: Notification[] = [];

export const notificationService = {
  // Get all notifications for current user
  async getAll(): Promise<Notification[]> {
    // TODO: Replace with API call
    // return await api.get('/notifications');
    return notifications;
  },

  // Add a new notification
  async add(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification> {
    // TODO: Replace with API call
    // return await api.post('/notifications', notification);
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      read: false,
    };
    notifications = [newNotification, ...notifications];
    return newNotification;
  },

  // Mark notification as read
  async markAsRead(id: string): Promise<Notification | null> {
    // TODO: Replace with API call
    // return await api.patch(`/notifications/${id}/read`);
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index] = { ...notifications[index], read: true };
      return notifications[index];
    }
    return null;
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    // TODO: Replace with API call
    // return await api.patch('/notifications/read-all');
    notifications = notifications.map(n => ({ ...n, read: true }));
  },

  // Clear all notifications
  async clear(): Promise<void> {
    // TODO: Replace with API call
    // return await api.delete('/notifications');
    notifications = [];
  },

  // Get unread count
  getUnreadCount(): number {
    return notifications.filter(n => !n.read).length;
  },

  // Send email notification (for appointments, orders, etc.)
  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    // TODO: Replace with API call
    // return await api.post('/notifications/email', { to, subject, body });
    console.log(`📧 Email sent to ${to}: ${subject}`);
    return true;
  },

  // Send SMS notification
  async sendSMS(to: string, message: string): Promise<boolean> {
    // TODO: Replace with API call
    // return await api.post('/notifications/sms', { to, message });
    console.log(`📱 SMS sent to ${to}: ${message}`);
    return true;
  },
};
