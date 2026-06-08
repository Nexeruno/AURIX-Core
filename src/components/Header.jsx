import { Moon, Sun, LogOut, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const Header = () => {
  const { isDark, setIsDark } = useTheme();
  const { session, logout } = useAuth();

  const handleLogout = () => {
    if (confirm('Opravdu se chceš odhlásit?')) logout();
  };

  return (
    <header className="bg-light-card dark:bg-dark-card border-b border-light-border dark:border-dark-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
        {/* Logo + name */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 sm:w-9 h-8 sm:h-9 shrink-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-xs sm:text-sm">💰</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-light-text dark:text-dark-text leading-tight truncate">
              AURIX Core
            </h1>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          {/* User chip — skrytý na mobilu */}
          {session && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border">
              <User size={14} className="text-light-textMuted dark:text-dark-textMuted" />
              <span className="text-sm font-medium text-light-text dark:text-dark-text max-w-[80px] truncate">
                {session.username}
              </span>
            </div>
          )}

          {/* Dark mode */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-lg bg-light-bg dark:bg-dark-bg hover:bg-light-border dark:hover:bg-dark-border transition-colors"
            aria-label="Přepnout tmavý režim"
          >
            {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-700 dark:text-slate-300" />}
          </button>

          {/* Logout */}
          {session && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-light-bg dark:bg-dark-bg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors group"
              aria-label="Odhlásit se"
            >
              <LogOut size={18} className="text-light-textMuted dark:text-dark-textMuted group-hover:text-red-500 transition-colors" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
