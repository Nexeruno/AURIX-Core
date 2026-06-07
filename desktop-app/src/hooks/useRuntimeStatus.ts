import { useState, useEffect, useCallback } from 'react'

/**
 * Runtime Status Hook
 *
 * FÁZE 4.6B: Track basic Python ML runtime status
 * - Runtime availability (health check)
 * - Last request status
 * - Last response validity
 */

export interface RuntimeStatus {
  available: boolean
  lastCheckTime?: Date
  lastRequestStatus?: 'pending' | 'success' | 'failed'
  lastResponseValid?: boolean
  lastError?: string
}

// Canonical local runtime endpoint — Python server in local dev mode
export const RUNTIME_URL = 'http://localhost:5000'

// Health check goes through the backend proxy, not directly to the Python runtime.
// Direct browser → localhost:5000 causes ERR_CONNECTION_REFUSED spam when runtime is down.
const BACKEND_HEALTH_ENDPOINT = 'http://localhost:3000/status/dependencies'
const CHECK_INTERVAL = 5000 // Check every 5 seconds

export function useRuntimeStatus() {
  const [status, setStatus] = useState<RuntimeStatus>({
    available: false,
    lastCheckTime: undefined,
    lastRequestStatus: undefined,
    lastResponseValid: undefined,
    lastError: undefined,
  })

  const [loading, setLoading] = useState(true)

  /**
   * Check runtime health
   */
  const checkRuntimeHealth = useCallback(async () => {
    try {
      setStatus((prev) => ({
        ...prev,
        lastRequestStatus: 'pending',
      }))

      const response = await fetch(BACKEND_HEALTH_ENDPOINT, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Backend returns { status, dependencies: { mlRuntime: { status, reachable } } }
      const mlRuntime = data.dependencies?.mlRuntime
      const isReachable = mlRuntime?.reachable ?? false
      const isHealthy = mlRuntime?.status === 'healthy'
      const isValid = isReachable && isHealthy

      setStatus({
        available: isValid,
        lastCheckTime: new Date(),
        lastRequestStatus: isValid ? 'success' : 'failed',
        lastResponseValid: isValid,
        lastError: undefined,
      })
    } catch (error) {
      const errorReason = (() => {
        if (!(error instanceof Error)) return 'Backend unavailable'
        const msg = error.message.toLowerCase()
        if (msg.includes('econnrefused') || msg.includes('refused'))
          return 'Backend not running on http://localhost:3000'
        if (msg.includes('enotfound')) return 'Cannot reach backend server'
        if (msg.includes('timeout')) return 'Backend response timeout'
        return 'Backend unavailable'
      })()

      if (process.env.NODE_ENV === 'development') {
        console.debug('[RuntimeStatus] Health check failed:', errorReason)
      }

      setStatus({
        available: false,
        lastCheckTime: new Date(),
        lastRequestStatus: 'failed',
        lastResponseValid: false,
        lastError: errorReason,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Initial check on mount
   */
  useEffect(() => {
    checkRuntimeHealth()
  }, [checkRuntimeHealth])

  /**
   * Periodic health checks
   */
  useEffect(() => {
    const interval = setInterval(() => {
      checkRuntimeHealth()
    }, CHECK_INTERVAL)

    return () => clearInterval(interval)
  }, [checkRuntimeHealth])

  return {
    status,
    loading,
    checkNow: checkRuntimeHealth,
  }
}
