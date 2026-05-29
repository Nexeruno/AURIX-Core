import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const Header = () => {
  const { isDark, setIsDark } = useTheme();

  return (
    <header className="bg-light-card dark:bg-dark-card border-b border-light-border dark:border-dark-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">💰</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">Evidence Výdajů</h1>
            <p className="text-xs text-light-textMuted dark:text-dark-textMuted">Spravuj své finance</p>
          </div>
        </div>

        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-lg bg-light-bg dark:bg-dark-bg hover:bg-light-border dark:hover:bg-dark-border transition-colors"
          aria-label="Toggle dark mode"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-slate-700" />
          )}
        </button>
      </div>
    </header>
  );
};
