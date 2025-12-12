// Service exports - Central point for all services
// These services are ready for backend integration

export { appointmentService } from './appointmentService';
export { orderService } from './orderService';
export { userService } from './userService';
export { subscriptionService } from './subscriptionService';
export { loyaltyService } from './loyaltyService';
export { notificationService } from './notificationService';
export { cartService } from './cartService';

// Re-export types for convenience
export type { User, UserRole, UserCredentials } from './userService';
export type { Subscription } from './subscriptionService';
export type { Notification } from './notificationService';
