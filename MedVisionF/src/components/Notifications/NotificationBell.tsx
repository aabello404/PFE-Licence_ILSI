import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useAuth } from "../../context/AuthContext";
import { Notification } from "../../types";
import { BellIcon, CloseIcon } from "../Icons";
import styles from "./NotificationBell.module.css";

const NotificationBell = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("medvision_token");
      if (!token) return;
      const response = await fetch("http://localhost:3000/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      const data = await response.json();
      // Ensure it is sorted newest first using timestamp
      const sorted = (data as Notification[]).sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      setNotifications(sorted);
    } catch (err: any) {
      console.error("Error fetching notifications:", err);
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when role changes / user logs in
  useEffect(() => {
    if (currentUser && currentUser.role !== "ADMIN") {
      fetchNotifications();
    }
  }, [currentUser]);

  // Fetch when dropdown is opened to ensure fresh data
  useEffect(() => {
    if (open && currentUser && currentUser.role !== "ADMIN") {
      fetchNotifications();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  if (!currentUser || currentUser.role === "ADMIN") {
    return null;
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const displayCount = unreadCount > 9 ? "9+" : unreadCount.toString();

  const handleItemClick = async (notification: Notification) => {
    // 1. Mark as read on the backend if not already read
    if (!notification.isRead) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, isRead: true } : n,
        ),
      );

      try {
        const token = localStorage.getItem("medvision_token");
        await fetch(
          `http://localhost:3000/notifications/${notification.id}/read`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
        // We can re-fetch to synchronize state in case of failure
        fetchNotifications();
      }
    }

    // 2. Navigation logic
    if (
      (notification.type === "APPOINTMENT" ||
        notification.type === "BOOKING") &&
      (currentUser.role === "DOCTOR" || currentUser.role === "RECEPTIONIST")
    ) {
      navigate("/doctor");
      setOpen(false);
    } else if (notification.type === "APPOINTMENT") {
      navigate("/appointments");
      setOpen(false);
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      return formatDistanceToNow(parseISO(timeStr), { addSuffix: true });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className={styles.notificationWrapper} ref={panelRef}>
      <button
        type="button"
        className={styles.bellButton}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        <BellIcon size={22} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{displayCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h4>Notifications</h4>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setOpen(false)}
            >
              <CloseIcon size={14} />
            </button>
          </div>

          <div className={styles.list}>
            {loading && notifications.length === 0 ? (
              // Loading skeletons
              <>
                <div className={styles.skeletonItem}>
                  <div className={styles.skeletonTitle} />
                  <div className={styles.skeletonText} />
                  <div className={styles.skeletonTime} />
                </div>
                <div className={styles.skeletonItem}>
                  <div className={styles.skeletonTitle} />
                  <div className={styles.skeletonText} />
                  <div className={styles.skeletonTime} />
                </div>
              </>
            ) : error && notifications.length === 0 ? (
              <div className={styles.emptyState}>
                <p style={{ color: "var(--danger)" }}>{error}</p>
                <button
                  onClick={fetchNotifications}
                  style={{
                    border: "none",
                    background: "var(--accent)",
                    color: "white",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                  }}
                >
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No notifications yet.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleItemClick(notification)}
                  className={`${styles.item} ${!notification.isRead ? styles.unreadItem : ""}`}
                >
                  <div className={styles.itemHeader}>
                    <p className={styles.itemTitle}>
                      {notification.title}
                      {!notification.isRead && <span className={styles.dot} />}
                    </p>
                  </div>
                  <p className={styles.itemMessage}>{notification.message}</p>
                  <span className={styles.itemTime}>
                    {formatTime(notification.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
