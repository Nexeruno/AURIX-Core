import { useMlRuns } from './useFirestore'

/**
 * Failed Runs Hook
 *
 * FÁZE 4.6D: Fetch failed AI runs from Firebase
 * Filters only runs with 'failed' or error status
 */

export interface FailedRun {
  id: string
  startedAt?: any
  finishedAt?: any
  status: string
  pipelineLevel?: number
  durationMs?: number
  errorCount?: number
  lastError?: string
  errorSummary?: string
}

export function useFailedRuns(limitCount: number = 10) {
  const { data: allRuns, loading, error } = useMlRuns(limitCount * 2) // Fetch more to account for filtering

  // Filter only failed runs
  const failedRuns = allRuns
    .filter(
      (run: any) =>
        run.status === 'failed' ||
        run.status === 'error' ||
        (run.errorCount && run.errorCount > 0)
    )
    .slice(0, limitCount)
    .map((run: any) => ({
      id: run.id,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      status: run.status,
      pipelineLevel: run.pipelineLevel,
      durationMs: run.durationMs,
      errorCount: run.errorCount || 1,
      lastError: run.lastError,
      errorSummary: generateErrorSummary(run),
    }))

  return {
    runs: failedRuns as FailedRun[],
    loading,
    error,
    totalCount: failedRuns.length,
  }
}

/**
 * Generate short error summary for a run
 */
function generateErrorSummary(run: any): string {
  const parts = []

  if (run.errorCount && run.errorCount > 1) {
    parts.push(`${run.errorCount} errors`)
  }

  // Extract error type from lastError or errorMessage
  if (run.lastError) {
    // Get first line of error message
    const errorLine = run.lastError.split('\n')[0]
    // Limit to 60 chars
    if (errorLine.length > 60) {
      parts.push(errorLine.substring(0, 57) + '...')
    } else {
      parts.push(errorLine)
    }
  } else if (run.errorMessage) {
    const errorLine = run.errorMessage.split('\n')[0]
    if (errorLine.length > 60) {
      parts.push(errorLine.substring(0, 57) + '...')
    } else {
      parts.push(errorLine)
    }
  } else {
    parts.push('Unknown error')
  }

  return parts.join(' • ')
}

/**
 * Format timestamp for display (same as success runs)
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
 * Format status badge for failed runs
 */
export function formatFailedStatus(status: string): { text: string; color: string } {
  const lowerStatus = status.toLowerCase()

  if (lowerStatus === 'failed' || lowerStatus === 'error') {
    return {
      text: '❌ Failed',
      color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    }
  }

  if (lowerStatus === 'timeout') {
    return {
      text: '⏱️ Timeout',
      color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    }
  }

  if (lowerStatus === 'network_error') {
    return {
      text: '🌐 Network',
      color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    }
  }

  return {
    text: lowerStatus.toUpperCase(),
    color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  }
}
