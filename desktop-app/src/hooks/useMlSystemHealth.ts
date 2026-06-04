import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/auth/AuthProvider'

export interface PipelineProgress {
  usersTotal: number
  usersProcessed: number
  usersSkipped: number
  predictionsCreated: number
  feedbackRecordsUsed: number
  manualFeedbackRecordsUsed: number
  autoFeedbackRecordsUsed: number
  errorCount: number
}

export interface PipelineStatus {
  status: 'idle' | 'running' | 'completed' | 'partial_success' | 'failed'
  stage: string
  startedAt?: any
  updatedAt?: any
  finishedAt?: any
  durationMs?: number
  progress?: PipelineProgress
  lastError?: any
  runId?: string
}

export interface MlRun {
  id: string
  status: string
  pipelineLevel: number
  mode: string
  usersTotal?: number
  usersProcessed: number
  usersSkipped?: number
  predictionsCreated: number
  fallbackCount?: number
  trainingDataRecordsUsed?: number
  manualFeedbackRecordsUsed?: number
  autoFeedbackRecordsUsed?: number
  usersWithTrainingData?: number
  averageFinalCorrectionFactor?: number
  errorCount: number
  errorsPreview?: Array<{ userId: string; stage: string; message: string }>
  durationMs?: number
  startedAt?: any
  finishedAt?: any
  triggeredBy?: string
  runId?: string
}

export interface MlDebugLog {
  id?: string
  runId?: string
  level: 'info' | 'warning' | 'error'
  source: string
  stage: string
  message: string
  userId?: string
  details?: Record<string, unknown>
  createdAt?: any
}

export interface MlSystemHealth {
  ok: boolean
  success?: boolean
  cloudFunctionsReachable?: boolean
  firestoreReadable?: boolean
  firestoreWritable?: boolean
  firebaseProjectId?: string
  predictionSettingsExists?: boolean
  predictionSettings?: {
    activePredictionLevel: number
    level2Enabled: boolean
    level2ShadowMode: boolean
    fallbackEnabled: boolean
    updatedAt?: any
  }
  l2ShadowEnabled?: boolean
  pipelineStatus?: PipelineStatus
  lastL2Run?: MlRun | null
  recentRuns?: MlRun[]
  feedbackSummary?: {
    manualFeedbackCount: number
    autoFeedbackCount: number
    latestManualFeedbackAt?: any
    latestAutoFeedbackAt?: any
  }
  recentErrorCount?: number
  recentErrors?: MlDebugLog[]
  recentDebugLogs?: MlDebugLog[]
  error?: string
}

export function useMlSystemHealth() {
  const { getIdToken } = useAuth()
  const [health, setHealth] = useState<MlSystemHealth | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null)

  const loadHealth = useCallback(async () => {
    setLoading(true)

    try {
      const token = await getIdToken()
      if (!window.ipcApi) {
        setError('IPC API not available — running in Electron?')
        return
      }

      const result = await window.ipcApi.callCloudFunction(
        'adminGetMlSystemHealth',
        token,
        {}
      )

      if (result?.ok === true || result?.success === true) {
        setHealth(result as MlSystemHealth)
        setError(null)
        setLastLoaded(new Date())
      } else {
        setError(result?.error || 'adminGetMlSystemHealth returned ok:false')
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
    const interval = setInterval(loadHealth, 15000)
    return () => clearInterval(interval)
  }, [loadHealth])

  return { health, loading, error, lastLoaded, reload: loadHealth }
}
