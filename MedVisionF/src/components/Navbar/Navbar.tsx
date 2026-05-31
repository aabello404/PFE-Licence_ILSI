import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAuthStore } from "../../store/useAuthStore";
import {
  HeartbeatIcon,
  BotIcon,
  LogoutIcon,
  MenuIcon,
  CloseIcon,
  UserIcon,
} from "../Icons";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import NotificationBell from "../Notifications/NotificationBell";
import AuthModal from "../Auth/AuthModal";
import styles from "./Navbar.module.css";

const Navbar = () => {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const { openAuthModal } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/signin");
    setMobileMenuOpen(false);
  };

  return (
    <nav className={styles.navbar}>
      <AuthModal />
      <div className={styles.navContainer}>
        <Link to="/" className={styles.brand}>
          <HeartbeatIcon
            size={28}
            className={styles.brandIcon}
            color="var(--accent)"
          />
          <span>MedVision</span>
        </Link>

        {/* Desktop Navigation */}
        <div className={styles.desktopNav}>
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            Home
          </NavLink>
          {isAuthenticated && (
            <NavLink
              to="/appointments"
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
              }
            >
              Appointments
            </NavLink>
          )}
          {isAuthenticated &&
            (currentUser?.role === "DOCTOR" ||
              currentUser?.role === "RECEPTIONIST") && (
              <NavLink
                to="/doctor"
                className={({ isActive }) =>
                  isActive
                    ? `${styles.navLink} ${styles.active}`
                    : styles.navLink
                }
              >
                Dashboard
              </NavLink>
            )}
        </div>

        {/* Right Section */}
        <div className={styles.rightSection}>
          <ThemeToggle />

          {isAuthenticated ? (
            <div className={styles.userActions}>
              {currentUser?.role !== "ADMIN" && <NotificationBell />}
              <button
                className={styles.medbotBtn}
                onClick={() => navigate("/chat")}
              >
                <BotIcon size={20} />
                <span>MedBot</span>
              </button>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{currentUser?.lastName}</span>
                <button
                  onClick={handleLogout}
                  className={styles.logoutBtn}
                  title="Logout"
                >
                  <LogoutIcon size={20} />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => openAuthModal("signin")}
              className={styles.signInBtn}
            >
              Connect
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className={styles.mobileMenuBtn}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className={styles.mobileMenu}>
          <NavLink
            to="/"
            className={styles.mobileNavLink}
            onClick={() => setMobileMenuOpen(false)}
          >
            Home
          </NavLink>
          {isAuthenticated && (
            <NavLink
              to="/appointments"
              className={styles.mobileNavLink}
              onClick={() => setMobileMenuOpen(false)}
            >
              Appointments
            </NavLink>
          )}
          {isAuthenticated &&
            (currentUser?.role === "DOCTOR" ||
              currentUser?.role === "RECEPTIONIST") && (
              <NavLink
                to="/doctor"
                className={styles.mobileNavLink}
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </NavLink>
            )}
          {isAuthenticated ? (
            <>
              <button
                className={styles.mobileMedbotBtn}
                onClick={() => {
                  navigate("/chat");
                  setMobileMenuOpen(false);
                }}
              >
                <BotIcon size={20} /> MedBot Chat
              </button>
              <button className={styles.mobileLogoutBtn} onClick={handleLogout}>
                <LogoutIcon size={20} /> Logout ({currentUser?.lastName})
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                openAuthModal("signin");
              }}
              className={styles.mobileSignInBtn}
            >
              <UserIcon size={20} />
              Connect
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
