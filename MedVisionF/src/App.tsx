import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@context/AuthContext";
import ProtectedRoute from "@components/ProtectedRoute/ProtectedRoute";
import Navbar from "@components/Navbar/Navbar";

// Pages
import HomePage from "@pages/HomePage";
import ChatPage from "@pages/ChatPage";
import AppointmentsPage from "@pages/AppointmentsPage";
import DoctorDashboardPage from "@pages/DoctorDashboardPage";

function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:sessionId" element={<ChatPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
        </Route>

        <Route
          element={<ProtectedRoute requiredRole={["DOCTOR", "RECEPTIONIST"]} />}
        >
          <Route path="/doctor" element={<DoctorDashboardPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
