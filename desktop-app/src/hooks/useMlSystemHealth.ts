import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/auth/AuthProvider'

export interface MlDebugLog {
  level: string
  source: string
  stage: string
  message: string
  userId?: string
  details?: any
  createdAt?: any
}

export interface PipelineStatus {
  status: string
  stage: string
  startedAt?: any
  updatedAt?: any
  finishedAt?: any
  durationMs?: number
  progress?: {
    usersTotal: number
    usersProcessed: number
    usersSkipped: number
    predictionsCreated: number
    feedbackRecordsUsed: number
    manualFeedbackRecordsUsed: number
    autoFeedbackRecordsUsed: number
    errorCount: number
  }
  lastError?: any
}

export interface MlSystemHealth {
  ok: boolean
  firebaseProjectId: string
  predictionSettingsExists: boolean
  predictionSettings?: any
  cloudFunctionsReachable?: boolean
  firestoreReadable?: boolean
  firestoreWritable?: boolean
  l2ShadowEnabled?: boolean
  pipelineStatus?: PipelineStatus
  recentRuns?: any[]
  recentErrors?: MlDebugLog[]
  recentDebugLogs?: MlDebugLog[]
  feedbackStats?: {
    totalManualFeedback: number
    totalAutoFeedback: number
    latestManualFeedback: any
  }
  error?: string
}

export function useMlSystemHealth() {
  const { getIdToken } = useAuth()
  const [health, setHealth] = useState<MlSystemHealth | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadHealth = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const token = await getIdToken()
      if (!window.ipcApi) {
        throw new Error('IPC API not available')
      }

      const result = await window.ipcApi.callCloudFunction(
        'adminGetMlSystemHealth',
        token,
        {}
      )

      if (result?.ok === true) {
        setHealth(result)
        setError(null)
      } else {
        setError(result?.error || 'Failed to load ML system health')
        setHealth(null)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load health'
      setError(msg)
      setHealth(null)
    } finally {
      setLoading(false)
    }
  }, [getIdToken])

  useEffect(() => {
    loadHealth()
    const interval = setInterval(loadHealth, 15000) // Refresh every 15s
    return () => clearInterval(interval)
  }, [loadHealth])

  return { health, loading, error, reload: loadHealth }
}
