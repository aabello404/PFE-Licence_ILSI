import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { CloseIcon } from "../Icons";
import styles from "./AppointmentForm.module.css";

interface Props {
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const AppointmentForm = ({ onClose, onSubmit }: Props) => {
  const { currentUser } = useAuth();
 
  const backendDoctorId = 1;
  const allSlots = ["9:00", "14:00"];

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState("");

  useEffect(() => {
    if (!date) {
      setAvailableSlots([]);
      setSlotError("");
      setTime("");
      return;
    }
    let isActive = true;
    const fetchAvailability = async () => {
      setLoadingSlots(true);
      setSlotError("");

      try {
        const response = await fetch(
          "http://localhost:3000/appointments/checkallslots",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ doctorId: backendDoctorId, date }),
          },
        );

        if (!response.ok) {
          throw new Error("Unable to fetch available slots");
        }

        const available: string[] = await response.json();
        if (!isActive) return;

        setAvailableSlots(available);
        if (time && !available.includes(time)) {
          setTime("");
        }
      } catch (error) {
        if (!isActive) return;
        setAvailableSlots([]);
        setTime("");
        setSlotError(
          "Could not load time availability. Please try another date.",
        );
      } finally {
        if (isActive) {
          setLoadingSlots(false);
        }
      }
    };

    fetchAvailability();

    return () => {
      isActive = false;
    };
  }, [date]);

  const getMinDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // Next day minimum
    return today.toISOString().split("T")[0];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !reason || !currentUser) return;

    

    onSubmit({
      date,
      time,
      reason
    });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Book New Appointment</h3>
          <button onClick={onClose} className={styles.closeBtn}>
            <CloseIcon size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={getMinDate()}
                required
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Time</label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className={styles.input}
                disabled={!date || loadingSlots}
              >
                <option value="" disabled>
                  {date ? "Select time" : "Select date first"}
                </option>
                {allSlots.map((slot) => {
                  const isAvailable = availableSlots.includes(slot);
                  return (
                    <option key={slot} value={slot} disabled={!isAvailable}>
                      {slot}{" "}
                      {date ? (isAvailable ? "- Available" : "- Booked") : ""}
                    </option>
                  );
                })}
              </select>
              {loadingSlots && (
                <p className={styles.slotNote}>
                  Checking availability for {date}...
                </p>
              )}
              {slotError && <p className={styles.error}>{slotError}</p>}
              {!loadingSlots &&
                date &&
                !slotError &&
                availableSlots.length === 0 && (
                  <p className={styles.slotNote}>
                    No times are available for this date. Please choose another
                    day.
                  </p>
                )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Reason for Visit</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="Briefly describe your symptoms or reason for visit..."
              className={styles.textarea}
              rows={4}
            />
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelBtn}
            >
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              Book Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentForm;
