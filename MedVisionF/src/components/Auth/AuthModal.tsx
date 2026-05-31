import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useAuth } from '../../context/AuthContext';
import { HeartbeatIcon, CloseIcon } from '../Icons';
import styles from './AuthModal.module.css';

const EyeIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

const AuthModal = () => {
  const { isAuthModalOpen, authModalView, closeAuthModal, setAuthModalView } = useAuthStore();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authModalView === 'signin') {
      const success = await login(email, password);
      if (success) {
        closeAuthModal();
      } else {
        setError(true);
        setTimeout(() => setError(false), 500);
      }
    } else {
      // Mock signup success
      const success = await login('yassine@example.com', 'password123'); // Fallback to mock patient
      if (success) {
        closeAuthModal();
      }
    }
  };

  const handleToggleView = () => {
    setAuthModalView(authModalView === 'signin' ? 'signup' : 'signin');
    setError(false);
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
  };

  return (
    <div className={styles.overlay} onClick={closeAuthModal}>
      <div className={`${styles.card} ${error ? styles.shake : ''}`} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={closeAuthModal}>
          <CloseIcon size={24} />
        </button>

        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <HeartbeatIcon size={32} color="var(--accent)" />
          </div>
          <h2 className={styles.title}>
            {authModalView === 'signin' ? 'Welcome Back' : 'Create an Account'}
          </h2>
          <p className={styles.subtitle}>
            {authModalView === 'signin' ? 'Sign in to access your portal' : 'Join MedVision today'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorMessage}>Invalid credentials</div>}
          
          {authModalView === 'signup' && (
            <div className={styles.nameRow}>
              <div className={styles.inputGroup}>
                <label htmlFor="firstName" className={styles.label}>First Name</label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={styles.input}
                  placeholder="John"
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="lastName" className={styles.label}>Last Name</label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={styles.input}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="patient@example.com"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="••••••••"
                required
              />
              <button 
                type="button" 
                className={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn}>
            {authModalView === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className={styles.toggleFooter}>
          <p>
            {authModalView === 'signin' 
              ? "Don't have an account? " 
              : "Already have an account? "}
            <button type="button" onClick={handleToggleView} className={styles.toggleLink}>
              {authModalView === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
