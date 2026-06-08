import { useMlRuns } from './useFirestore'

/**
 * Successful Runs Hook
 *
 * FÁZE 4.6C: Fetch successful AI runs from Firebase
 * Filters only runs with 'completed' or 'success' status
 */

export interface SuccessfulRun {
  id: string
  startedAt?: any
  finishedAt?: any
  status: string
  pipelineLevel?: number
  usersProcessed?: number
  predictionsCreated?: number
  durationMs?: number
  summary?: string
}

export function useSuccessfulRuns(limitCount: number = 10) {
  const { data: allRuns, loading, error } = useMlRuns(limitCount * 2) // Fetch more to account for filtering

  // Filter only successful runs
  const successfulRuns = allRuns
    .filter(
      (run: any) =>
        run.status === 'completed' ||
        run.status === 'success' ||
        (run.status === 'partial_success' && run.predictionsCreated && run.predictionsCreated > 0)
    )
    .slice(0, limitCount)
    .map((run: any) => ({
      id: run.id,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      status: run.status,
      pipelineLevel: run.pipelineLevel,
      usersProcessed: run.usersProcessed,
      predictionsCreated: run.predictionsCreated,
      durationMs: run.durationMs,
      summary: generateSummary(run),
    }))

  return {
    runs: successfulRuns as SuccessfulRun[],
    loading,
    error,
    totalCount: successfulRuns.length,
  }
}

/**
 * Generate short summary for a run
 */
function generateSummary(run: any): string {
  const parts = []

  if (run.pipelineLevel === 1) {
    parts.push('L1 Model')
  } else if (run.pipelineLevel === 2) {
    parts.push('L2 Model')
  }

  if (run.usersProcessed) {
    parts.push(`${run.usersProcessed} users`)
  }

  if (run.predictionsCreated) {
    parts.push(`${run.predictionsCreated} predictions`)
  }

  if (run.durationMs) {
    const seconds = Math.round(run.durationMs / 1000)
    parts.push(`${seconds}s`)
  }

  return parts.join(' • ') || 'Completed successfully'
}

/**
 * Format timestamp for display
 */
export function formatRunTimestamp(timestamp: any): string {
  if (!timestamp) return '—'

  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString()
  } catch {
    return '—'
  }
}

/**
 * Format status badge
 */
export function formatRunStatus(status: string): { text: string; color: string } {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'success':
      return {
        text: '✅ Completed',
        color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      }
    case 'partial_success':
      return {
        text: '⚠️ Partial',
        color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      }
    case 'running':
      return {
        text: '🔄 Running',
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      }
    default:
      return {
        text: status,
        color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400',
      }
  }
}
