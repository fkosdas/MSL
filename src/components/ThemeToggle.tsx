import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export function ThemeToggle({ theme, toggleTheme }: ThemeToggleProps) {
  return (
    <button
      onClick={toggleTheme}
      className={`relative w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
        theme === 'dark' ? 'bg-blue-600' : 'bg-amber-400'
      }`}
      title={`Temayı Değiştir (${theme === 'dark' ? 'Aydınlık' : 'Karanlık'})`}
    >
      <div
        className={`bg-white w-4 h-4 rounded-full shadow-md flex items-center justify-center transition-transform duration-300 transform ${
          theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
        }`}
      >
        {theme === 'dark' ? (
          <Moon size={10} className="text-blue-600" />
        ) : (
          <Sun size={10} className="text-amber-500" />
        )}
      </div>
    </button>
  );
}
