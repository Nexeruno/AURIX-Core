import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { AuthPage } from './components/auth/AuthPage';
import { FormVydaj } from './components/FormVydaj';
import { FormPrijem } from './components/FormPrijem';
import { FilterBarVydaj, FilterBarPrijem } from './components/FilterBar';
import { SeznamVydaj } from './components/SeznamVydaj';
import { SeznamPrijem } from './components/SeznamPrijem';
import { Dashboard } from './components/Dashboard';
import { useFirestoreSync } from './hooks/useFirestoreSync';
import { aiTracker } from './utils/aiTracker';
import { initActivityTracker } from './utils/store';

const TABS = [
  { id: 'dashboard', label: '📊 Přehled' },
  { id: 'vydaje', label: '💸 Výdaje' },
  { id: 'prijmy', label: '💰 Příjmy' },
];

function AppContent() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Napojení Firestore real-time listenerů
  useFirestoreSync();

  // Initialize AI tracker on app load (works even without login)
  useEffect(() => {
    aiTracker.init(session?.uid);
    return () => {
      aiTracker.destroy();
    };
  }, [session?.uid]);

  // Initialize activity tracker on mount
  useEffect(() => {
    if (session?.uid) {
      initActivityTracker();
    }
  }, [session?.uid]);

  // Track beforeunload to flush AI data
  useEffect(() => {
    const handleBeforeUnload = () => {
      aiTracker.flushSync();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleTabChange = (newTab) => {
    aiTracker.trackTabChange(newTab, activeTab);
    setActiveTab(newTab);
  };

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <nav className="flex gap-2 mb-6 flex-wrap" aria-label="Navigace">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`px-5 py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-2xl font-bold mb-5">Přehled financí</h2>
            <Dashboard />
          </div>
        )}

        {activeTab === 'vydaje' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1"><FormVydaj /></div>
            <div className="lg:col-span-2 space-y-6">
              <FilterBarVydaj />
              <SeznamVydaj />
            </div>
          </div>
        )}

        {activeTab === 'prijmy' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1"><FormPrijem /></div>
            <div className="lg:col-span-2 space-y-6">
              <FilterBarPrijem />
              <SeznamPrijem />
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function AppRouter() {
  const { session } = useAuth();

  // Čekáme na ověření Firebase Auth (session === undefined = loading)
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="text-light-textMuted dark:text-dark-textMuted">Načítání...</div>
      </div>
    );
  }

  if (!session) return <AuthPage />;
  return <AppContent />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
        <Toaster position="bottom-center" />
      </AuthProvider>
    </ThemeProvider>
  );
}
