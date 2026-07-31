import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      whileHover={{ scale: 1.1, rotate: 15 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggleTheme}
      className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200"
      style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-color)' }}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={16} style={{ color: 'var(--warning)' }} />
      ) : (
        <Moon size={16} style={{ color: 'var(--accent)' }} />
      )}
    </motion.button>
  );
};

export default ThemeToggle;
