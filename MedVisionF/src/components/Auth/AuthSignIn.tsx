import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HeartbeatIcon } from '../Icons';
import styles from './AuthSignIn.module.css';

const AuthSignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success =await login(email, password);
    if (success) {
      navigate('/');
    } else {
      setError(true);
      setTimeout(() => setError(false), 500); // Remove shake class after animation
    }
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${error ? styles.shake : ''}`}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <HeartbeatIcon size={32} color="var(--accent)" />
          </div>
          <h2 className={styles.title}>Welcome to MedVision</h2>
          <p className={styles.subtitle}>Sign in to access your portal</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorMessage}>Invalid credentials</div>}
          
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
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className={styles.submitBtn}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthSignIn;
