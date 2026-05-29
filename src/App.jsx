import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/Header';
import { FormVydaj } from './components/FormVydaj';
import { FormPrijem } from './components/FormPrijem';
import { FilterBarVydaj, FilterBarPrijem } from './components/FilterBar';
import { SeznamVydaj } from './components/SeznamVydaj';
import { SeznamPrijem } from './components/SeznamPrijem';
import { Dashboard } from './components/Dashboard';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {[
            { id: 'dashboard', label: '📊 Přehled' },
            { id: 'vydaje', label: '💸 Výdaje' },
            { id: 'prijmy', label: '💰 Příjmy' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <h1 className="text-3xl font-bold mb-6">Přehled financí</h1>
            <Dashboard />
          </div>
        )}

        {/* Výdaje Tab */}
        {activeTab === 'vydaje' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <FormVydaj />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <FilterBarVydaj />
              <SeznamVydaj />
            </div>
          </div>
        )}

        {/* Příjmy Tab */}
        {activeTab === 'prijmy' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <FormPrijem />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <FilterBarPrijem />
              <SeznamPrijem />
            </div>
          </div>
        )}
      </main>
      <Toaster position="bottom-center" />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
