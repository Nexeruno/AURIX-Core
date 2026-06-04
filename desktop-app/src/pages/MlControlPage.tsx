import { useState, useEffect } from 'react'
import { useAppConfig } from '@/hooks/useFirestore'
import { useAuth } from '@/auth/AuthProvider'
import { useMlPipelineControl } from '@/hooks/useMlPipelineControl'

export function MlControlPage() {
  const { data: settings, loading: settingsLoading } = useAppConfig()
  const { getIdToken } = useAuth()
  const { runLevel2Pipeline, activateLevel2, rollbackToLevel1, updatePredictionSettings, getPredictionSettings, loading: pipelineLoading } = useMlPipelineControl()

  const [runningLevel2, setRunningLevel2] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState<'success' | 'error'>('error')
  const [activateModalOpen, setActivateModalOpen] = useState(false)
  const [rollbackModalOpen, setRollbackModalOpen] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [shadowToggling, setShadowToggling] = useState(false)

  // Initialize prediction settings if missing
  useEffect(() => {
    const init = async () => {
      if (!settingsLoading && !settings && !initialized) {
        try {
          const token = await getIdToken()
          await getPredictionSettings(token)
          setInitialized(true)
        } catch (err) {
          console.error('Failed to initialize prediction settings:', err)
          setInitialized(true)
        }
      }
    }
    init()
  }, [settingsLoading, settings, initialized, getIdToken, getPredictionSettings])

  const handleRunLevel2 = async () => {
    if (!window.ipcApi) {
      setStatusMessage('❌ This action is available only in AURIX Core desktop mode.')
      return
    }

    try {
      setRunningLevel2(true)
      setStatusMessage('Running Level 2 pipeline...')
      const token = await getIdToken()
      const result = await runLevel2Pipeline(token)
      if (result?.success === false || result?.ok === false) {
        setStatusMessage(`⚠️ ${result.message || 'Pipeline not ready yet'}`)
      } else {
        setStatusMessage(`✅ Pipeline completed: ${result?.message || 'Success'}`)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      setStatusMessage(`❌ Pipeline failed: ${msg}`)
    } finally {
      setRunningLevel2(false)
    }
  }

  const handleActivateLevel2 = async () => {
    try {
      setStatusMessage('Activating Level 2 model...')
      setStatusType('error')
      const token = await getIdToken()

      // First activate via Cloud Function (for audit log)
      const result = await activateLevel2(token)
      if (result?.ok !== true && result?.success !== true) {
        setStatusMessage(`❌ ${result?.message || result?.error || 'Activation failed'}`)
        return
      }

      // Then update prediction settings to Level 2 active
      const updateResult = await updatePredictionSettings(token, {
        activePredictionLevel: 2,
        level2Enabled: true,
        level2ShadowMode: false,
      })

      if (updateResult?.ok === true) {
        setStatusMessage(`✅ Level 2 activated successfully`)
        setStatusType('success')
        setActivateModalOpen(false)
        // Refresh settings to reflect changes
        setTimeout(() => {
          getPredictionSettings(token).catch(err => console.error('Failed to refresh settings:', err))
        }, 500)
      } else {
        setStatusMessage(`❌ ${updateResult?.message || updateResult?.error || 'Update failed'}`)
        setStatusType('error')
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      setStatusType('error')
      if (msg.includes('not available')) {
        setStatusMessage('❌ Backend function not deployed yet. Contact admin.')
      } else {
        setStatusMessage(`❌ Activation failed: ${msg}`)
      }
    }
  }

  const handleRollback = async () => {
    try {
      setStatusMessage('Rolling back to Level 1...')
      setStatusType('error')
      const token = await getIdToken()

      // First rollback via Cloud Function (for audit log)
      const result = await rollbackToLevel1(token)
      if (result?.ok !== true && result?.success !== true) {
        setStatusMessage(`❌ ${result?.message || result?.error || 'Rollback failed'}`)
        return
      }

      // Then update prediction settings to Level 1
      const updateResult = await updatePredictionSettings(token, {
        activePredictionLevel: 1,
        level2Enabled: true,
        level2ShadowMode: true,
      })

      if (updateResult?.ok === true) {
        setStatusMessage(`✅ Rolled back to Level 1 successfully`)
        setStatusType('success')
        setRollbackModalOpen(false)
        // Refresh settings to reflect changes
        setTimeout(() => {
          getPredictionSettings(token).catch(err => console.error('Failed to refresh settings:', err))
        }, 500)
      } else {
        setStatusMessage(`❌ ${updateResult?.message || updateResult?.error || 'Update failed'}`)
        setStatusType('error')
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      setStatusType('error')
      if (msg.includes('not available')) {
        setStatusMessage('❌ Backend function not deployed yet. Contact admin.')
      } else {
        setStatusMessage(`❌ Rollback failed: ${msg}`)
      }
    }
  }

  const handleToggleShadowMode = async () => {
    try {
      const token = await getIdToken()
      setShadowToggling(true)

      // Toggle shadow mode while keeping Level 1 active
      const newShadowMode = !settings?.level2ShadowMode

      const updateResult = await updatePredictionSettings(token, {
        activePredictionLevel: 1,
        level2Enabled: true,
        level2ShadowMode: newShadowMode,
      })

      if (updateResult?.ok === true) {
        setStatusMessage(newShadowMode ? '✅ Shadow Mode enabled' : '✅ Shadow Mode disabled')
        setStatusType('success')
        setTimeout(() => {
          getPredictionSettings(token).catch(err => console.error('Failed to refresh settings:', err))
        }, 300)
      } else {
        setStatusMessage(`❌ ${updateResult?.message || updateResult?.error || 'Failed to toggle Shadow Mode'}`)
        setStatusType('error')
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      setStatusMessage(`❌ ${msg}`)
      setStatusType('error')
    } finally {
      setShadowToggling(false)
    }
  }

  const handleActivateLevel1 = async () => {
    try {
      setStatusMessage('Activating Level 1...')
      setStatusType('error')
      const token = await getIdToken()

      const updateResult = await updatePredictionSettings(token, {
        activePredictionLevel: 1,
        level2Enabled: false,
        level2ShadowMode: false,
      })

      if (updateResult?.ok === true) {
        setStatusMessage(`✅ Level 1 activated successfully`)
        setStatusType('success')
        setTimeout(() => {
          getPredictionSettings(token).catch(err => console.error('Failed to refresh settings:', err))
        }, 500)
      } else {
        setStatusMessage(`❌ ${updateResult?.message || updateResult?.error || 'Activation failed'}`)
        setStatusType('error')
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      setStatusType('error')
      if (msg.includes('not available')) {
        setStatusMessage('❌ Backend function not deployed yet. Contact admin.')
      } else {
        setStatusMessage(`❌ Activation failed: ${msg}`)
      }
    }
  }

  const handleDisableLevel2 = async () => {
    try {
      setStatusMessage('Disabling Level 2...')
      setStatusType('error')
      const token = await getIdToken()

      const updateResult = await updatePredictionSettings(token, {
        activePredictionLevel: 1,
        level2Enabled: false,
        level2ShadowMode: false,
      })

      if (updateResult?.ok === true) {
        setStatusMessage(`✅ Level 2 disabled successfully`)
        setStatusType('success')
        setTimeout(() => {
          getPredictionSettings(token).catch(err => console.error('Failed to refresh settings:', err))
        }, 500)
      } else {
        setStatusMessage(`❌ ${updateResult?.message || updateResult?.error || 'Disable failed'}`)
        setStatusType('error')
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      setStatusType('error')
      if (msg.includes('not available')) {
        setStatusMessage('❌ Backend function not deployed yet. Contact admin.')
      } else {
        setStatusMessage(`❌ Disable failed: ${msg}`)
      }
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">ML Model Control</h1>

      {/* Current Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`card rounded-lg p-6 border-2 ${
          settings?.activePredictionLevel === 1 ? 'border-green-500' : 'border-transparent'
        }`}>
          <p className="text-light-textMuted dark:text-dark-textMuted text-sm">Level 1 (Baseline)</p>
          <p className={`text-3xl font-bold mt-2 ${
            settings?.activePredictionLevel === 1 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
          }`}>
            {settingsLoading ? '⏳ Loading...' :
             settings?.activePredictionLevel === 1 ? '✅ Active' : '⬇️ Fallback'}
          </p>
          <p className="text-xs text-light-textMuted dark:text-dark-textMuted mt-2">
            {settingsLoading ? 'Loading...' :
             settings?.activePredictionLevel === 1 ? 'Serving predictions' : 'Backup model'}
          </p>
        </div>
        <div className={`card rounded-lg p-6 border-2 ${
          settings?.activePredictionLevel === 2 ? 'border-green-500' : 'border-transparent'
        }`}>
          <p className="text-light-textMuted dark:text-dark-textMuted text-sm">Level 2 (Advanced)</p>
          <p className={`text-3xl font-bold mt-2 ${
            settings?.activePredictionLevel === 2 ? 'text-green-600 dark:text-green-400' :
            settings?.level2ShadowMode ? 'text-blue-600 dark:text-blue-400' :
            'text-orange-600 dark:text-orange-400'
          }`}>
            {settingsLoading ? '⏳ Loading...' :
             settings?.activePredictionLevel === 2 ? '✅ Active' :
             settings?.level2ShadowMode ? '🔄 Shadow' :
             '⭐ Inactive'}
          </p>
          <p className="text-xs text-light-textMuted dark:text-dark-textMuted mt-2">
            {settingsLoading ? 'Loading...' :
             settings?.activePredictionLevel === 2 ? 'Serving predictions' :
             settings?.level2ShadowMode ? 'Testing in parallel' :
             'Not running'}
          </p>
        </div>
      </div>

      {/* Level 2 Pipeline Control */}
      <div className="card rounded-lg p-6">
        <h2 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">Level 2 Pipeline Execution</h2>
        <p className="text-light-textMuted dark:text-dark-textMuted mb-6">Run local ML pipeline with current admin credentials (token passed via stdin)</p>

        <button
          onClick={handleRunLevel2}
          disabled={runningLevel2 || pipelineLoading || !window.ipcApi}
          title={!window.ipcApi ? 'Available only in AURIX Core desktop mode' : ''}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200 ${
            runningLevel2 || pipelineLoading || !window.ipcApi
              ? 'bg-gray-400 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800'
          }`}
        >
          {runningLevel2 ? '⏳ Running...' : '▶️ Run Level 2 Pipeline'}
        </button>

        {statusMessage && (
          <div className={`mt-4 p-4 rounded-lg text-sm ${
            statusType === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}>
            {statusMessage}
          </div>
        )}
      </div>

      {/* Shadow Mode Control */}
      <div className="card rounded-lg p-6">
        <h2 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">Level 2 Shadow Mode</h2>
        <p className="text-light-textMuted dark:text-dark-textMuted mb-6">Enable shadow mode to run Level 2 in parallel without affecting users</p>

        {settingsLoading ? (
          <div className="space-y-4">
            <p className="text-light-textMuted dark:text-dark-textMuted font-semibold">⏳ Loading...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Shadow Mode Toggle */}
            <div className="flex items-center gap-4 p-4 rounded-lg border border-light-border dark:border-dark-border">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-light-text dark:text-dark-text mb-2">
                  Run Level 2 in Shadow Mode
                </label>
                <p className="text-xs text-light-textMuted dark:text-dark-textMuted">
                  {settings?.level2ShadowMode
                    ? 'Level 2 is running in parallel. Not serving to users.'
                    : 'Level 2 shadow mode is disabled.'}
                </p>
              </div>
              <button
                onClick={handleToggleShadowMode}
                disabled={shadowToggling || settingsLoading || settings?.activePredictionLevel === 2}
                title={settings?.activePredictionLevel === 2 ? 'Disable active Level 2 first' : ''}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${
                  settings?.level2ShadowMode
                    ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700'
                    : 'bg-light-border dark:bg-dark-border text-light-text dark:text-dark-text hover:opacity-80'
                } ${shadowToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {shadowToggling ? '⏳ ...' : settings?.level2ShadowMode ? '✓ On' : 'Off'}
              </button>
            </div>

            {/* Action Buttons */}
            {settings?.activePredictionLevel === 2 ? (
              <div className="space-y-3">
                <p className="text-green-600 dark:text-green-400 font-semibold">Level 2 is Active in Production</p>
                <p className="text-sm text-light-textMuted dark:text-dark-textMuted">All users are receiving Level 2 predictions</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleDisableLevel2}
                    className="px-6 py-3 bg-yellow-600 dark:bg-yellow-700 text-white rounded-lg font-semibold hover:bg-yellow-700 dark:hover:bg-yellow-800 transition-colors duration-200"
                  >
                    ⚠️ Disable Level 2
                  </button>
                  <button
                    onClick={() => setRollbackModalOpen(true)}
                    className="px-6 py-3 bg-orange-600 dark:bg-orange-700 text-white rounded-lg font-semibold hover:bg-orange-700 dark:hover:bg-orange-800 transition-colors duration-200"
                  >
                    ↩️ Rollback to L1
                  </button>
                </div>
              </div>
            ) : settings?.level2ShadowMode ? (
              <div className="space-y-3">
                <p className="text-blue-600 dark:text-blue-400 font-semibold">Level 2 is in Shadow Mode</p>
                <p className="text-sm text-light-textMuted dark:text-dark-textMuted">Level 1 is active. Level 2 predictions run in parallel but are not served to users.</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleDisableLevel2}
                    className="px-6 py-3 bg-yellow-600 dark:bg-yellow-700 text-white rounded-lg font-semibold hover:bg-yellow-700 dark:hover:bg-yellow-800 transition-colors duration-200"
                  >
                    ⚠️ Disable L2
                  </button>
                  <button
                    onClick={() => setActivateModalOpen(true)}
                    className="px-6 py-3 bg-green-600 dark:bg-green-700 text-white rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-800 transition-colors duration-200"
                  >
                    🚀 Activate L2
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-light-text dark:text-dark-text font-semibold">Level 2 is Inactive</p>
                <p className="text-sm text-light-textMuted dark:text-dark-textMuted">Enable shadow mode to test Level 2 predictions in parallel.</p>
                <button
                  onClick={handleActivateLevel1}
                  className="w-full px-6 py-3 bg-green-600 dark:bg-green-700 text-white rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-800 transition-colors duration-200"
                >
                  ✅ Activate Level 1
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Model Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card rounded-lg p-6">
          <p className="text-light-textMuted dark:text-dark-textMuted text-sm">Baseline Accuracy</p>
          <p className="text-2xl font-bold text-light-text dark:text-dark-text mt-2">~94.2%</p>
        </div>
        <div className="card rounded-lg p-6">
          <p className="text-light-textMuted dark:text-dark-textMuted text-sm">Model Status</p>
          <p className="text-2xl font-bold text-light-text dark:text-dark-text mt-2">
            {settingsLoading ? '⏳' : settings?.level2Enabled ? '✅' : '⭐'}
          </p>
        </div>
        <div className="card rounded-lg p-6">
          <p className="text-light-textMuted dark:text-dark-textMuted text-sm">Configuration Updated</p>
          <p className="text-2xl font-bold text-light-text dark:text-dark-text mt-2">
            {settingsLoading ? '-' : settings?.updatedAt ? new Date(settings.updatedAt.seconds * 1000).toLocaleDateString() : '-'}
          </p>
        </div>
      </div>

      {/* Activation Confirmation Modal */}
      {activateModalOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-light-card dark:bg-dark-card rounded-lg p-8 max-w-md border border-light-border dark:border-dark-border">
            <h3 className="text-xl font-bold text-light-text dark:text-dark-text mb-4">🚀 Activate Level 2?</h3>
            <p className="text-light-textMuted dark:text-dark-textMuted mb-6">
              This will move Level 2 from shadow mode to production. All users will receive Level 2 predictions.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setActivateModalOpen(false)}
                className="flex-1 px-4 py-2 border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg font-semibold transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleActivateLevel2}
                className="flex-1 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 font-semibold transition-colors duration-200"
              >
                Yes, Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rollback Confirmation Modal */}
      {rollbackModalOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-light-card dark:bg-dark-card rounded-lg p-8 max-w-md border border-light-border dark:border-dark-border">
            <h3 className="text-xl font-bold text-light-text dark:text-dark-text mb-4">↩️ Rollback to Level 1?</h3>
            <p className="text-light-textMuted dark:text-dark-textMuted mb-6">
              This will revert to Level 1 predictions. Use this only if Level 2 is causing issues.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setRollbackModalOpen(false)}
                className="flex-1 px-4 py-2 border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg font-semibold transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRollback}
                className="flex-1 px-4 py-2 bg-orange-600 dark:bg-orange-700 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-800 font-semibold transition-colors duration-200"
              >
                Yes, Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
