import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";

function formatRelativeTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 30) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleItemClick = (notif) => {
    markAsRead(notif.id);
    if (notif.link) {
      setOpen(false);
      navigate(notif.link, { replace: true });
    }
  };

  return (
    <div className="notif-bell-container" ref={containerRef}>
      <button
        className={`notif-bell-btn ${open ? "active" : ""}`}
        onClick={() => setOpen(!open)}
        title="Notifications"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="notif-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          {/* Dropdown Header */}
          <div className="notif-header">
            <div className="notif-header-title">
              Notifications
              {unreadCount > 0 && (
                <span className="notif-unread-tag">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button className="notif-mark-read-btn" onClick={markAllAsRead}>
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications Scrollable List */}
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-title">No notifications</div>
                <div className="notif-empty-sub">
                  Updates about meetings and room activity will appear here.
                </div>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.read ? "unread" : ""}`}
                  onClick={() => handleItemClick(n)}
                >
                  <div className="notif-content">
                    <div className="notif-title-row">
                      <span className="notif-item-title">{n.title}</span>
                      <span className="notif-time">
                        {formatRelativeTime(n.timestamp)}
                      </span>
                    </div>
                    <p className="notif-item-msg">{n.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Dropdown Footer with Clear All Button */}
          {notifications.length > 0 && (
            <div className="notif-footer">
              <button className="notif-clear-btn" onClick={clearAll}>
                Clear all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
