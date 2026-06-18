import { useState, useEffect } from "react";
import { useAppointmentStore } from "../store/useAppointmentStore";
import AppointmentCard from "../components/Appointments/AppointmentCard";
import AppointmentForm from "../components/Appointments/AppointmentForm";
import { CalendarIcon } from "../components/Icons";
import styles from "./AppointmentsPage.module.css";

const AppointmentsPage = () => {
  const {
    appointments,
    setAppointments,
    addAppointment,
    updateAppointmentStatus,
  } = useAppointmentStore();
  const [filter, setFilter] = useState<
    "All" | "Upcoming" | "Completed" | "Cancelled"
  >("All");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch appointments on mount
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await fetch("http://localhost:3000/appointments/my", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("medvision_token")}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch appointments");
        const data = await response.json();
        const mapped = data.map((appt: any) => ({
          id: appt.id.toString(),
          patientId: appt.patientId.toString(),
          patientName:
            `${appt.patient?.firstName} ${appt.patient?.lastName}` || "Unknown",
          doctorId: appt.doctorId.toString(),
          doctorName:
            `Dr. ${appt.doctor?.user?.firstName} ${appt.doctor?.user?.lastName}` ||
            "Unknown",
          date: appt.date,
          time: appt.time,
          reason: appt.reason,
          status: appt.status.toLowerCase() as any,
        }));
        setAppointments(mapped);
      } catch (error) {
        console.error("Error fetching appointments:", error);
      }
    };
    fetchAppointments();
  }, []);

  // Filter appointments for current patient
  const userAppointments = appointments;

  const getFilteredAppointments = () => {
    switch (filter) {
      case "Upcoming":
        return userAppointments.filter(
          (app) => app.status === "pending" || app.status === "confirmed",
        );
      case "Completed":
        return []; // In a real app, logic to check past dates + confirmed status
      case "Cancelled":
        return userAppointments.filter((app) => app.status === "cancelled");
      default:
        return userAppointments;
    }
  };

  const filteredAppointments = getFilteredAppointments().sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const handleCancel = async (id: string) => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      try {
        const response = await fetch(
          `http://localhost:3000/appointments/${id}/cancel`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("medvision_token")}`,
            },
            body: JSON.stringify({ reason: "Cancelled by patient" }),
          },
        );
        if (!response.ok) throw new Error("Failed to cancel appointment");
        updateAppointmentStatus(id, "cancelled");
        showToast("Appointment cancelled successfully");
      } catch {
        showToast("Error cancelling appointment. Please try again.");
      }
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleNewAppointment = async (data: any) => {
    try {
      const response = await fetch(
        "http://localhost:3000/appointments/new-appointment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("medvision_token")}`,
          },
          body: JSON.stringify(data),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to create appointment");
      }
      const newAppointment = await response.json();
      addAppointment(newAppointment);
      setIsFormOpen(false);
      showToast("Appointment request sent successfully!");
    } catch {
      showToast("Error booking appointment. Please try again.");
    }
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>My Appointments</h1>
          <p className={styles.subtitle}>
            Manage your upcoming visits and history
          </p>
        </div>
        <button className={styles.bookBtn} onClick={() => setIsFormOpen(true)}>
          <CalendarIcon size={20} />
          <span>Book New Appointment</span>
        </button>
      </header>

      <div className={styles.tabs}>
        {["All", "Upcoming", "Completed", "Cancelled"].map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${filter === tab ? styles.activeTab : ""}`}
            onClick={() => setFilter(tab as any)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {filteredAppointments.length > 0 ? (
          <div className={styles.grid}>
            {filteredAppointments.map((app) => (
              <AppointmentCard
                key={app.id}
                appointment={app}
                onCancel={handleCancel}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <CalendarIcon
              size={64}
              color="var(--text-muted)"
              className={styles.emptyIcon}
            />
            <h3>No appointments found</h3>
            <p>
              You don't have any {filter.toLowerCase()} appointments at the
              moment.
            </p>
          </div>
        )}
      </div>

      {isFormOpen && (
        <AppointmentForm
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleNewAppointment}
        />
      )}

      {/* Custom Toast */}
      {toastMessage && <div className={styles.toast}>{toastMessage}</div>}
    </div>
  );
};

export default AppointmentsPage;
