import { useAppConfig, useMlRuns } from '@/hooks/useFirestore'

export function MlDashboardPage() {
  const { data: settings, loading: settingsLoading } = useAppConfig()
  const { data: recentRuns, loading: runsLoading, error: runsError } = useMlRuns(10)

  const getRunStatusClasses = (status: string) => {
    switch(status) {
      case 'completed': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'failed': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      default: return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">ML System Overview</h1>

      {/* ML Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card rounded-lg p-6">
          <p className="text-sm text-light-textMuted dark:text-dark-textMuted">Level 1 Status</p>
          <p className="text-2xl font-bold mt-2 text-green-600">✅ Active</p>
          <p className="text-xs mt-2 text-light-textMuted dark:text-dark-textMuted">Baseline predictions</p>
        </div>
        <div className="card rounded-lg p-6">
          <p className="text-sm text-light-textMuted dark:text-dark-textMuted">Level 2 Status</p>
          <p className={`text-2xl font-bold mt-2 ${
            settings?.activePredictionLevel === 2 ? 'text-green-600' :
            settings?.level2ShadowMode ? 'text-blue-600' :
            'text-orange-600'
          }`}>
            {settingsLoading ? '⏳' :
             settings?.activePredictionLevel === 2 ? '✅ Active' :
             settings?.level2ShadowMode ? '🔄 Shadow' :
             '↩️ Disabled'}
          </p>
          <p className="text-xs mt-2 text-light-textMuted dark:text-dark-textMuted">ML model</p>
        </div>
        <div className="card rounded-lg p-6">
          <p className="text-sm text-light-textMuted dark:text-dark-textMuted">Configuration Status</p>
          <p className="text-2xl font-bold mt-2 text-blue-500 dark:text-blue-400">
            {settingsLoading ? 'Loading...' : '✅ Ready'}
          </p>
        </div>
      </div>

      {/* ML Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card rounded-lg p-6">
          <p className="text-sm text-light-textMuted dark:text-dark-textMuted">Recent Runs (L1)</p>
          <p className="text-3xl font-bold mt-2 text-light-text dark:text-dark-text">
            {runsLoading ? '...' : recentRuns.filter((r: any) => r.level === 1).length}
          </p>
        </div>
        <div className="card rounded-lg p-6">
          <p className="text-sm text-light-textMuted dark:text-dark-textMuted">Recent Runs (L2)</p>
          <p className="text-3xl font-bold mt-2 text-light-text dark:text-dark-text">
            {runsLoading ? '...' : recentRuns.filter((r: any) => r.level === 2).length}
          </p>
        </div>
        <div className="card rounded-lg p-6">
          <p className="text-sm text-light-textMuted dark:text-dark-textMuted">Configuration</p>
          <p className="text-sm mt-2 text-light-textMuted dark:text-dark-textMuted">
            {settingsLoading ? 'Loading...' : `Level ${settings?.activePredictionLevel || '1'} Active`}
          </p>
        </div>
      </div>

      {/* Recent Runs */}
      <div className="card rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-light-border dark:border-dark-border">
          <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">Recent ML Runs</h2>
        </div>
        <div className="overflow-x-auto">
          {runsError ? (
            <div className="px-6 py-8 text-center">
              <div className="font-semibold mb-2 text-red-600 dark:text-red-400">⚠️ Error loading runs</div>
              <p className="text-sm text-light-textMuted dark:text-dark-textMuted">{runsError.message}</p>
            </div>
          ) : runsLoading ? (
            <div className="px-6 py-8 text-center text-light-textMuted dark:text-dark-textMuted">Loading...</div>
          ) : recentRuns.length === 0 ? (
            <div className="px-6 py-8 text-center text-light-textMuted dark:text-dark-textMuted">No runs yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="table-header bg-light-border dark:bg-dark-border">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-light-text dark:text-dark-text">Timestamp</th>
                  <th className="px-6 py-3 text-left font-semibold text-light-text dark:text-dark-text">Level</th>
                  <th className="px-6 py-3 text-left font-semibold text-light-text dark:text-dark-text">Status</th>
                  <th className="px-6 py-3 text-left font-semibold text-light-text dark:text-dark-text">Accuracy</th>
                  <th className="px-6 py-3 text-left font-semibold text-light-text dark:text-dark-text">Time (ms)</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run: any) => (
                  <tr key={run.id} className="table-row">
                    <td className="px-6 py-4 text-light-text dark:text-dark-text">
                      {new Date(run.timestamp).toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 ${run.level === 1 ? 'text-green-600' : 'text-blue-600'}`}>
                      L{run.level}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getRunStatusClasses(run.status)}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-light-text dark:text-dark-text">
                      {run.accuracy ? `${(run.accuracy * 100).toFixed(1)}%` : '-'}
                    </td>
                    <td className="px-6 py-4 text-light-text dark:text-dark-text">{run.processingTime || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ML Model Control */}
      <div className="card rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-2 text-light-text dark:text-dark-text">ML Model Control</h2>
        <p className="mb-4 text-light-textMuted dark:text-dark-textMuted">Manage Level 1, Level 2, Shadow Mode and model activation.</p>
        <a
          href="/ml/control"
          className="inline-block px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 font-semibold transition-colors duration-200"
        >
          Open ML Model Control
        </a>
      </div>
    </div>
  )
}
