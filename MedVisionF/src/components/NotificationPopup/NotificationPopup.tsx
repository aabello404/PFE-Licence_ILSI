import styles from "./NotificationPopup.module.css";

interface NotificationPopupProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const NotificationPopup = ({
  title,
  message,
  actionLabel,
  onAction,
}: NotificationPopupProps) => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.topBar} />
        <div className={styles.content}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.message}>{message}</p>
          {actionLabel && onAction && (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={onAction}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPopup;
