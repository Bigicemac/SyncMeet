import { createContext, useContext, useState, useEffect } from "react";

const NotificationContext = createContext(null);

const STORAGE_KEY = "syncmeet-notifications";

const getInitialNotifications = () => [
  {
    id: "welcome-1",
    title: "Welcome to SyncMeet",
    message:
      "Create or join instant video meetings, schedule sessions, and record calls in real-time.",
    type: "info",
    timestamp: new Date(Date.now() - 300000).toISOString(),
    read: false,
  },
];

const readStoredNotifications = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : getInitialNotifications();
  } catch {
    return getInitialNotifications();
  }
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(readStoredNotifications);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {
      // ignore storage errors
    }
  }, [notifications]);

  const addNotification = ({ title, message, type = "info", link = null }) => {
    const newNotif = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      title,
      message,
      type, // 'info', 'meeting', 'recording', 'share', 'user'
      link,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]);
    setToast(newNotif);

    setTimeout(() => {
      setToast((curr) => (curr?.id === newNotif.id ? null : curr));
    }, 4500);

    return newNotif;
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toast,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        dismissToast: () => setToast(null),
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
