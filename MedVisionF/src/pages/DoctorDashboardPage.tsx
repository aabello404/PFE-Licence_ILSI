import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useAppointmentStore } from "../store/useAppointmentStore";
import CalendarView from "../components/Calendar/CalendarView";
import {
  CalendarIcon,
  ClockIcon,
  CheckIcon,
  CloseIcon,
} from "../components/Icons";
import styles from "./DoctorDashboardPage.module.css";

const DoctorDashboardPage = () => {
  const { currentUser } = useAuth();
  const { appointments, setAppointments, updateAppointmentStatus } =
    useAppointmentStore();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "confirmed" | "cancelled"
  >("all");
  const [modifyModalOpen, setModifyModalOpen] = useState(false);
  const [modifyReason, setModifyReason] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [modifyAction, setModifyAction] = useState<"confirm" | "cancel" | null>(
    null,
  );

  // Fetch doctor appointments on mount
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const endpoint =
          currentUser?.role === "RECEPTIONIST"
            ? "http://localhost:3000/appointments/all"
            : "http://localhost:3000/appointments/doctor/1";
        const response = await fetch(endpoint, {
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
            `${appt.patient?.firstName} ${appt.patient?.lastName}` ||
            "Unknown",
          doctorId: appt.doctorId.toString(),
          doctorName:
            `Dr. ${appt.doctor?.user?.firstName} ${appt.doctor?.user?.lastName}` ||
            "Unknown",
          date: appt.date,
          time: appt.time,
          reason: appt.reason,
          status: appt.status.toLowerCase() as any,
        }));
        console.log(mapped);
        
        setAppointments(mapped);
      } catch (error) {
        console.error("Error fetching appointments:", error);
      }
    };
    fetchAppointments();
  }, [currentUser?.role]);

  // Filter appointments for current doctor or all for receptionist
  const relevantAppointments = appointments;

  const filteredAppointments =
    statusFilter === "all"
      ? relevantAppointments
      : relevantAppointments.filter((app) => app.status === statusFilter);

  // Stats
  const today = new Date().toISOString().split("T")[0];
  const todayApps = relevantAppointments.filter((app) =>
    app.date.startsWith(today),
  );
  const pendingApps = relevantAppointments.filter(
    (app) => app.status === "pending",
  );
  const confirmedApps = relevantAppointments.filter(
    (app) => app.status === "confirmed",
  );
  const cancelledApps = relevantAppointments.filter(
    (app) => app.status === "cancelled",
  );

  const handleConfirm = (id: string) => {
    setSelectedAppointmentId(id);
    setModifyAction("confirm");
    setModifyModalOpen(true);
  };

  const handleCancel = (id: string) => {
    setSelectedAppointmentId(id);
    setModifyAction("cancel");
    setModifyModalOpen(true);
  };

  const submitModification = async () => {
    if (!selectedAppointmentId || !modifyAction) return;
    try {
      const endpoint =
        modifyAction === "confirm"
          ? `http://localhost:3000/appointments/${selectedAppointmentId}/confirm`
          : `http://localhost:3000/appointments/${selectedAppointmentId}/cancel`;
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("medvision_token")}`,
        },
        body: JSON.stringify({ reason: modifyReason || "No reason provided" }),
      });
      if (!response.ok)
        throw new Error(`Failed to ${modifyAction} appointment`);
      updateAppointmentStatus(
        selectedAppointmentId,
        modifyAction === "confirm" ? "confirmed" : "cancelled",
      );
      setModifyModalOpen(false);
      setModifyReason("");
      setSelectedAppointmentId(null);
    } catch (error) {
      console.error("Error modifying appointment:", error);
      alert("Failed to modify appointment. Please try again.");
    }
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          {currentUser?.role === "RECEPTIONIST"
            ? "Reception Dashboard"
            : "Doctor Dashboard"}
        </h1>
        <p className={styles.subtitle}>
          Welcome back, {currentUser?.firstName}
        </p>
      </header>

      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <div
            className={styles.statIconWrapper}
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--accent) 15%, transparent)",
              color: "var(--accent)",
            }}
          >
            <CalendarIcon size={24} />
          </div>
          <div>
            <h3>{todayApps.length}</h3>
            <p>Today</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div
            className={styles.statIconWrapper}
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--warning) 15%, transparent)",
              color: "var(--warning)",
            }}
          >
            <ClockIcon size={24} />
          </div>
          <div>
            <h3>{pendingApps.length}</h3>
            <p>Pending</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div
            className={styles.statIconWrapper}
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--success) 15%, transparent)",
              color: "var(--success)",
            }}
          >
            <CheckIcon size={24} />
          </div>
          <div>
            <h3>{confirmedApps.length}</h3>
            <p>Confirmed</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div
            className={styles.statIconWrapper}
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--danger) 15%, transparent)",
              color: "var(--danger)",
            }}
          >
            <CloseIcon size={24} />
          </div>
          <div>
            <h3>{cancelledApps.length}</h3>
            <p>Cancelled</p>
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleBtn} ${view === "list" ? styles.active : ""}`}
            onClick={() => setView("list")}
          >
            List View
          </button>
          <button
            className={`${styles.toggleBtn} ${view === "calendar" ? styles.active : ""}`}
            onClick={() => setView("calendar")}
          >
            Calendar View
          </button>
        </div>

        <div className={styles.statusFilter}>
          {["all", "pending", "confirmed", "cancelled"].map((status) => (
            <button
              key={status}
              className={`${styles.statusButton} ${statusFilter === status ? styles.activeStatus : ""}`}
              onClick={() => setStatusFilter(status as any)}
            >
              {status === "all"
                ? "All"
                : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.content}>
        {view === "list" ? (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map((app) => (
                    <tr key={app.id}>
                      <td className={styles.patientName}>{app.patientName}</td>
                      <td>{app.date}</td>
                      <td>{app.time}</td>
                      <td className={styles.reasonCell}>
                        <span title={app.reason}>{app.reason}</span>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${styles[app.status]}`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td>
                        {app.status === "pending" && (
                          <div className={styles.actions}>
                            <button
                              onClick={() => handleConfirm(app.id)}
                              className={styles.confirmBtn}
                              title="Confirm"
                            >
                              <CheckIcon size={16} />
                            </button>
                            <button
                              onClick={() => handleCancel(app.id)}
                              className={styles.cancelBtn}
                              title="Cancel"
                            >
                              <CloseIcon size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className={styles.emptyTable}>
                      No appointments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <CalendarView
            appointments={filteredAppointments}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        )}
      </div>

      {/* Modification Modal */}
      {modifyModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h3>
              {modifyAction === "confirm"
                ? "Confirm Appointment"
                : "Cancel Appointment"}
            </h3>
            <div style={{ marginTop: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                {modifyAction === "confirm"
                  ? "Confirmation Notes"
                  : "Cancellation Reason"}
              </label>
              <textarea
                value={modifyReason}
                onChange={(e) => setModifyReason(e.target.value)}
                placeholder={
                  modifyAction === "confirm"
                    ? "Add any notes..."
                    : "Reason for cancellation..."
                }
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border)",
                  fontFamily: "inherit",
                  minHeight: "80px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div
              style={{
                marginTop: "1.5rem",
                display: "flex",
                gap: "0.5rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => {
                  setModifyModalOpen(false);
                  setModifyReason("");
                  setSelectedAppointmentId(null);
                }}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitModification}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "4px",
                  border: "none",
                  background:
                    modifyAction === "confirm"
                      ? "var(--success)"
                      : "var(--danger)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                {modifyAction === "confirm" ? "Confirm" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboardPage;

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  padding: "2rem",
  maxWidth: "500px",
  width: "90%",
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
};
