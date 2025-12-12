// User Service - Ready for backend integration
// TODO: Replace mock implementations with actual API calls

export type UserRole = 'client' | 'admin' | 'subscription';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export interface UserCredentials {
  email: string;
  password: string;
}

// Mock data store - will be replaced by database
let users: (User & { password: string })[] = [];
let currentUser: User | null = null;

export const userService = {
  // Get current authenticated user
  async getCurrentUser(): Promise<User | null> {
    // TODO: Replace with API call / auth check
    // return await api.get('/auth/me');
    return currentUser;
  },

  // Login
  async login(credentials: UserCredentials): Promise<User | null> {
    // TODO: Replace with API call
    // return await api.post('/auth/login', credentials);
    const user = users.find(
      u => u.email === credentials.email && u.password === credentials.password
    );
    if (user) {
      const { password, ...userData } = user;
      currentUser = userData;
      return userData;
    }
    return null;
  },

  // Signup
  async signup(name: string, email: string, password: string, role: UserRole = 'client'): Promise<User | null> {
    // TODO: Replace with API call
    // return await api.post('/auth/signup', { name, email, password, role });
    if (users.find(u => u.email === email)) {
      return null; // User already exists
    }

    const isFirstUser = users.length === 0;
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password,
      role: isFirstUser ? 'admin' as UserRole : role,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    const { password: _, ...userData } = newUser;
    currentUser = userData;
    return userData;
  },

  // Logout
  async logout(): Promise<void> {
    // TODO: Replace with API call
    // return await api.post('/auth/logout');
    currentUser = null;
  },

  // Get all users (admin only)
  async getAll(): Promise<User[]> {
    // TODO: Replace with API call
    // return await api.get('/users');
    return users.map(({ password, ...user }) => user);
  },

  // Update user role (admin only)
  async updateRole(userId: string, role: UserRole): Promise<User | null> {
    // TODO: Replace with API call
    // return await api.patch(`/users/${userId}/role`, { role });
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], role };
      const { password, ...userData } = users[index];
      
      // Update current user if it's the same user
      if (currentUser?.id === userId) {
        currentUser = userData;
      }
      
      return userData;
    }
    return null;
  },

  // Get user by ID
  async getById(id: string): Promise<User | null> {
    // TODO: Replace with API call
    // return await api.get(`/users/${id}`);
    const user = users.find(u => u.id === id);
    if (user) {
      const { password, ...userData } = user;
      return userData;
    }
    return null;
  },
};
