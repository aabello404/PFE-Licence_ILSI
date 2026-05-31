import { useState } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays,
  parseISO
} from 'date-fns';
import { Appointment } from '../../types';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, CalendarIcon } from '../Icons';
import AppointmentCard from '../Appointments/AppointmentCard';
import styles from './CalendarView.module.css';

interface Props {
  appointments: Appointment[];
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
}

const CalendarView = ({ appointments, onConfirm, onCancel }: Props) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const today = new Date();

  // Find appointments for a specific day
  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(app => isSameDay(parseISO(app.date), day));
  };

  const selectedDayAppointments = selectedDate ? getAppointmentsForDay(selectedDate) : [];

  const renderHeader = () => {
    return (
      <div className={styles.header}>
        <button onClick={prevMonth} className={styles.navBtn}>
          <ChevronLeftIcon size={24} />
        </button>
        <h3 className={styles.monthLabel}>
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        <button onClick={nextMonth} className={styles.navBtn}>
          <ChevronRightIcon size={24} />
        </button>
      </div>
    );
  };

  const renderDaysOfWeek = () => {
    const days = [];
    const startDate = startOfWeek(currentDate);

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className={styles.dayOfWeek}>
          {format(addDays(startDate, i), 'EEE')}
        </div>
      );
    }
    return <div className={styles.daysRow}>{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        const dayAppointments = getAppointmentsForDay(cloneDay);
        
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, today);
        const isSelected = selectedDate && isSameDay(day, selectedDate);

        days.push(
          <div
            key={day.toISOString()}
            className={`${styles.cell} ${!isCurrentMonth ? styles.disabled : ''} ${
              isToday ? styles.today : ''
            } ${isSelected ? styles.selected : ''}`}
            onClick={() => setSelectedDate(cloneDay)}
          >
            <span className={styles.dateNum}>{formattedDate}</span>
            <div className={styles.dots}>
              {dayAppointments.map((app, idx) => {
                if (idx > 2) return null; // Show max 3 dots
                return (
                  <span 
                    key={app.id} 
                    className={`${styles.dot} ${styles[app.status]}`} 
                  />
                );
              })}
              {dayAppointments.length > 3 && <span className={styles.moreDots}>+</span>}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className={styles.row} key={day.toISOString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className={styles.body}>{rows}</div>;
  };

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.calendar}>
        {renderHeader()}
        {renderDaysOfWeek()}
        {renderCells()}
      </div>

      {/* Side Panel for Selected Day */}
      <div className={`${styles.sidePanel} ${selectedDate ? styles.panelOpen : ''}`}>
        {selectedDate && (
          <>
            <div className={styles.panelHeader}>
              <h3>{format(selectedDate, 'EEEE, MMM d, yyyy')}</h3>
              <button onClick={() => setSelectedDate(null)} className={styles.closeBtn}>
                <CloseIcon size={20} />
              </button>
            </div>
            <div className={styles.panelBody}>
              {selectedDayAppointments.length > 0 ? (
                <div className={styles.appointmentList}>
                  {selectedDayAppointments.map(app => (
                    <AppointmentCard 
                      key={app.id} 
                      appointment={app} 
                      isDoctorView={true}
                      onConfirm={onConfirm}
                      onCancel={onCancel}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <CalendarIcon size={48} color="var(--text-muted)" />
                  <p>No appointments for this day.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CalendarView;
