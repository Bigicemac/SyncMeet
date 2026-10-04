import { useNotifications } from "../context/NotificationContext";

export default function NotificationToast() {
  const { toast, dismissToast } = useNotifications();

  if (!toast) return null;

  return (
    <div className="notif-toast-banner" onClick={dismissToast}>
      <div className="notif-toast-content">
        <div className="notif-toast-title">{toast.title}</div>
        <div className="notif-toast-msg">{toast.message}</div>
      </div>
      <button
        className="notif-toast-close"
        onClick={(e) => {
          e.stopPropagation();
          dismissToast();
        }}
      >
        &times;
      </button>
    </div>
  );
}
