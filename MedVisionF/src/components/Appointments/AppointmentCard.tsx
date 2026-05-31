import { Appointment } from '../../types';
import { CalendarIcon, ClockIcon, UserIcon, StethoscopeIcon } from '../Icons';
import styles from './AppointmentCard.module.css';

interface Props {
  appointment: Appointment;
  isDoctorView?: boolean;
  onCancel?: (id: string) => void;
  onConfirm?: (id: string) => void;
}

const AppointmentCard = ({ appointment, isDoctorView, onCancel, onConfirm }: Props) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'var(--success)';
      case 'cancelled': return 'var(--danger)';
      case 'pending': return 'var(--warning)';
      default: return 'var(--text-muted)';
    }
  };

  const formattedDate = new Date(appointment.date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.personInfo}>
          {isDoctorView ? (
            <>
              <div className={styles.iconWrapper}><UserIcon size={20} color="var(--accent)" /></div>
              <div>
                <h4>{appointment.patientName}</h4>
                <span className={styles.subtext}>Patient</span>
              </div>
            </>
          ) : (
            <>
              <div className={styles.iconWrapper}><StethoscopeIcon size={20} color="var(--accent)" /></div>
              <div>
                <h4>{appointment.doctorName}</h4>
                <span className={styles.subtext}>Doctor</span>
              </div>
            </>
          )}
        </div>
        <div 
          className={`${styles.statusBadge} ${styles[appointment.status]}`}
          style={{ '--status-color': getStatusColor(appointment.status) } as React.CSSProperties}
        >
          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.timeInfo}>
          <div className={styles.timeItem}>
            <CalendarIcon size={16} color="var(--text-muted)" />
            <span>{formattedDate}</span>
          </div>
          <div className={styles.timeItem}>
            <ClockIcon size={16} color="var(--text-muted)" />
            <span>{appointment.time}</span>
          </div>
        </div>
        <div className={styles.reason}>
          <p>{appointment.reason}</p>
        </div>
      </div>

      {(onCancel || onConfirm) && appointment.status === 'pending' && (
        <div className={styles.footer}>
          {onCancel && (
            <button className={styles.cancelBtn} onClick={() => onCancel(appointment.id)}>
              Cancel
            </button>
          )}
          {onConfirm && isDoctorView && (
            <button className={styles.confirmBtn} onClick={() => onConfirm(appointment.id)}>
              Confirm
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AppointmentCard;
