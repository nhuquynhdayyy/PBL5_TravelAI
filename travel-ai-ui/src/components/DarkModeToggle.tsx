import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';

interface DarkModeToggleProps {
  className?: string;
}

const DarkModeToggle: React.FC<DarkModeToggleProps> = ({ className = '' }) => {
  const { isDark, toggle } = useDarkMode();

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Chuyen sang che do sang' : 'Chuyen sang che do toi'}
      title={isDark ? 'Che do sang' : 'Che do toi'}
      className={`
        relative flex h-9 w-9 items-center justify-center rounded-xl
        transition-all duration-300
        ${isDark
          ? 'bg-slate-700 text-yellow-400 hover:bg-slate-600'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }
        ${className}
      `}
    >
      <span
        className={`absolute transition-all duration-300 ${
          isDark ? 'rotate-0 opacity-100 scale-100' : 'rotate-90 opacity-0 scale-50'
        }`}
      >
        <Sun size={18} />
      </span>
      <span
        className={`absolute transition-all duration-300 ${
          isDark ? '-rotate-90 opacity-0 scale-50' : 'rotate-0 opacity-100 scale-100'
        }`}
      >
        <Moon size={18} />
      </span>
    </button>
  );
};

export default DarkModeToggle;
