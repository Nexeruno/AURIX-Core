import { useState } from 'react';
import { AIAnalyzePanel } from './AIAnalyzePanel';
import { AIControlPanel } from './AIControlPanel';
import { AILearningPanel } from './AILearningPanel';
import { AILearningPanel as LearningPanel } from './LearningPanel';
import { MLPredictionPanel } from './MLPredictionPanel';

export const AIPanel = () => {
  const [aiTab, setAiTab] = useState('analyze');

  return (
    <div>
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setAiTab('analyze')}
          className={`px-5 py-2 rounded-lg font-medium transition-all text-sm ${
            aiTab === 'analyze'
              ? 'bg-purple-500 text-white shadow-md'
              : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border'
          }`}
        >
          📊 Analýza
        </button>
        <button
          onClick={() => setAiTab('control')}
          className={`px-5 py-2 rounded-lg font-medium transition-all text-sm ${
            aiTab === 'control'
              ? 'bg-purple-500 text-white shadow-md'
              : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border'
          }`}
        >
          ⚙️ Kontrola
        </button>
        <button
          onClick={() => setAiTab('learning')}
          className={`px-5 py-2 rounded-lg font-medium transition-all text-sm ${
            aiTab === 'learning'
              ? 'bg-purple-500 text-white shadow-md'
              : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border'
          }`}
        >
          📚 Co se naučila
        </button>
        <button
          onClick={() => setAiTab('reports')}
          className={`px-5 py-2 rounded-lg font-medium transition-all text-sm ${
            aiTab === 'reports'
              ? 'bg-purple-500 text-white shadow-md'
              : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border'
          }`}
        >
          📈 Učení
        </button>
        <button
          onClick={() => setAiTab('predictions')}
          className={`px-5 py-2 rounded-lg font-medium transition-all text-sm ${
            aiTab === 'predictions'
              ? 'bg-purple-500 text-white shadow-md'
              : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border'
          }`}
        >
          🤖 Predikce
        </button>
      </div>

      {aiTab === 'analyze' && <AIAnalyzePanel />}
      {aiTab === 'control' && <AIControlPanel />}
      {aiTab === 'learning' && <AILearningPanel />}
      {aiTab === 'reports' && <LearningPanel />}
      {aiTab === 'predictions' && <MLPredictionPanel />}
    </div>
  );
};
