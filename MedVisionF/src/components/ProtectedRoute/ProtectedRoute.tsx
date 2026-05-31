import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAuthStore } from "../../store/useAuthStore";
import { UserRole } from "../../types";
import NotificationPopup from "../NotificationPopup/NotificationPopup";

interface ProtectedRouteProps {
  requiredRole?: UserRole | UserRole[];
}

const ProtectedRoute = ({ requiredRole }: ProtectedRouteProps) => {
  const { isAuthenticated, currentUser, isAuthReady } = useAuth();
  const { openAuthModal } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthReady && !isAuthenticated) {
      openAuthModal("signin");
    }
  }, [isAuthReady, isAuthenticated, openAuthModal]);

  if (!isAuthReady) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text, #111)",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <NotificationPopup
        title="Protected Access"
        message="Please connect to your account to view this page."
        actionLabel="Connect"
        onAction={() => openAuthModal("signin")}
      />
    );
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(currentUser?.role as UserRole)) {
      return (
        <NotificationPopup
          title="Access Denied"
          message="You do not have permission to access this page."
          actionLabel="Go to Home"
          onAction={() => navigate("/")}
        />
      );
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
