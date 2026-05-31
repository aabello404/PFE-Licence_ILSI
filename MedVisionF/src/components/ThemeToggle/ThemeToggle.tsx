import { useThemeStore } from '../../store/useThemeStore';
import { SunIcon, MoonIcon } from '../Icons';
import styles from './ThemeToggle.module.css';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button 
      className={styles.toggleBtn} 
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className={`${styles.iconContainer} ${theme === 'dark' ? styles.dark : styles.light}`}>
        <SunIcon className={styles.sun} size={20} />
        <MoonIcon className={styles.moon} size={20} />
      </div>
    </button>
  );
};

export default ThemeToggle;
