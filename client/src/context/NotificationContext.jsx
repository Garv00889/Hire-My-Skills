import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead, markBatchNotificationsRead } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  const formatRelativeTime = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    const diffWeek = Math.floor(diffDay / 7);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    if (diffWeek < 4) return `${diffWeek}w ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const buildFormatted = (raw) => {
    let category = 'system';
    let title = 'Notification';
    let actionText = 'View';
    let actionType = 'explore';

    if (raw.type === 'application_received') {
      category = 'applications';
      title = 'New Application Received';
      actionText = 'Review Application';
      actionType = 'application';
    } else if (raw.type === 'application_approved') {
      category = 'applications';
      title = 'Application Selected!';
      actionText = 'Open Team Chat';
      actionType = 'chat';
    } else if (raw.type === 'application_rejected') {
      category = 'applications';
      title = 'Application Update';
      actionText = 'Explore Projects';
      actionType = 'explore';
    } else if (raw.type === 'new_message') {
      category = 'chat';
      title = 'New Chat Message';
      actionText = 'Open Chat';
      actionType = 'chat';
    }

    const nameWords = raw.sender?.name?.split(' ') || [];
    const avatar = nameWords.length >= 2
      ? (nameWords[0][0] + nameWords[1][0]).toUpperCase()
      : (raw.sender?.name?.[0]?.toUpperCase() || '??');

    return {
      id: raw._id,
      _id: raw._id,
      category,
      title,
      message: raw.message,
      user: raw.sender?.name || 'HireMySkills',
      avatar,
      senderPicture: raw.sender?.profilePicture || null,
      projectId: raw.relatedProject?._id || raw.relatedProject,
      relatedApplication: raw.relatedApplication?._id || raw.relatedApplication,
      read: raw.isRead,
      actionText,
      actionType,
      time: formatRelativeTime(raw.createdAt),
      createdAt: raw.createdAt,
    };
  };

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const res = await getNotifications();
      const raw = Array.isArray(res.data) ? res.data : [];
      const formatted = raw.map(buildFormatted);
      setNotifications(formatted);
      setUnreadCount(formatted.filter(n => !n.read).length);
    } catch (err) {
      // Don't crash on network errors during background polls
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  // Initial load & polling every 30 seconds
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    fetchNotifications();
    intervalRef.current = setInterval(() => fetchNotifications(true), 30000);
    return () => clearInterval(intervalRef.current);
  }, [user, fetchNotifications]);

  const markRead = useCallback(async (id) => {
    // Optimistically update UI
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await markNotificationRead(id);
    } catch (err) {
      // Silently ignore – will correct on next poll
    }
  }, []);

  const markBatchRead = useCallback(async (ids) => {
    if (!ids || ids.length === 0) return;
    const unreadIds = notifications.filter(n => ids.includes(n.id) && !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    // Optimistic update
    setNotifications(prev =>
      prev.map(n => unreadIds.includes(n.id) ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - unreadIds.length));

    try {
      await markBatchNotificationsRead(unreadIds);
    } catch (err) {
      // Silently ignore
    }
  }, [notifications]);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch (err) {
      // Silently ignore
    }
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => {
      const removed = prev.find(n => n.id === id);
      if (removed && !removed.read) setUnreadCount(c => Math.max(0, c - 1));
      return prev.filter(n => n.id !== id);
    });
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      markRead,
      markBatchRead,
      markAllRead,
      removeNotification,
      formatRelativeTime,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
