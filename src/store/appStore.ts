import { create } from 'zustand';
import type { User } from '@@/shared/types';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
}

interface AppState {
  currentUser: User | null;
  sidebarCollapsed: boolean;
  notifications: Notification[];
  activeNav: string;
  setCurrentUser: (user: User | null) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  setActiveNav: (nav: string) => void;
}

const useAppStore = create<AppState>((set) => ({
  currentUser: {
    id: '1',
    username: '张农学家',
    role: 'agronomist',
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  sidebarCollapsed: false,
  notifications: [],
  activeNav: '/',
  setCurrentUser: (user) => set({ currentUser: user }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          ...notification,
          id: Date.now().toString(),
          timestamp: Date.now(),
        },
      ],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),
  setActiveNav: (nav) => set({ activeNav: nav }),
}));

export default useAppStore;
