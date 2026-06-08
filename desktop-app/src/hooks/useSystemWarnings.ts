import { useEffect, useState } from 'react'
import { db } from '@/config/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

/**
 * System Warnings Hook
 *
 * FÁZE 4.7C: Fetch system warnings and health issues
 * Shows simple warning messages for common issues
 */

export type WarningType =
  | 'missing_target_rows'
  | 'invalid_contract_response'
  | 'stale_data'
  | 'no_train_samples'
  | 'low_confidence'
  | 'training_failed'
  | 'high_error_rate'

export type WarningSeverity = 'critical' | 'warning' | 'info'

export interface SystemWarning {
  id: string
  type: WarningType
  message: string
  severity: WarningSeverity
  timestamp?: any
  resolved: boolean
}

export interface SystemWarningsState {
  warnings: SystemWarning[]
  loading: boolean
  error: Error | null
  totalCount: number
}

export function useSystemWarnings() {
  const [state, setState] = useState<SystemWarningsState>({
    warnings: [],
    loading: true,
    error: null,
    totalCount: 0,
  })

  useEffect(() => {
    const fetchWarnings = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }))

        // Try to fetch from systemWarnings collection
        const warningsCollection = collection(db, 'systemWarnings')
        const q = query(warningsCollection, where('resolved', '==', false))
        const snapshot = await getDocs(q)

        if (!snapshot.empty) {
          const warningsList: SystemWarning[] = snapshot.docs
            .map((doc) => ({
              id: doc.id,
              type: doc.data().type || 'info',
              message: doc.data().message || 'Unknown warning',
              severity: doc.data().severity || 'info',
              timestamp: doc.data().timestamp,
              resolved: doc.data().resolved || false,
            }))
            .filter((w) => !w.resolved)

          setState({
            warnings: warningsList,
            loading: false,
            error: null,
            totalCount: warningsList.length,
          })
        } else {
          // Fallback: Generate mock warnings for demo
          const mockWarnings: SystemWarning[] = [
            {
              id: 'warn-001',
              type: 'stale_data',
              message: 'Data not updated for 6 hours - consider refresh',
              severity: 'warning',
              timestamp: new Date(),
              resolved: false,
            },
            {
              id: 'warn-002',
              type: 'no_train_samples',
              message: 'Less than 100 training samples available',
              severity: 'warning',
              timestamp: new Date(),
              resolved: false,
            },
          ]

          setState({
            warnings: mockWarnings,
            loading: false,
            error: null,
            totalCount: mockWarnings.length,
          })
        }
      } catch (err) {
        setState({
          warnings: [],
          loading: false,
          error: err instanceof Error ? err : new Error('Unknown error'),
          totalCount: 0,
        })
      }
    }

    fetchWarnings()
  }, [])

  return state
}

/**
 * Get warning icon based on type
 */
export function getWarningIcon(type: WarningType): string {
  const icons: Record<WarningType, string> = {
    missing_target_rows: '🎯',
    invalid_contract_response: '📋',
    stale_data: '⏱️',
    no_train_samples: '📊',
    low_confidence: '❓',
    training_failed: '❌',
    high_error_rate: '⚠️',
  }

  return icons[type] || '⚠️'
}

/**
 * Get warning label based on type
 */
export function getWarningLabel(type: WarningType): string {
  const labels: Record<WarningType, string> = {
    missing_target_rows: 'Missing Target Rows',
    invalid_contract_response: 'Invalid Contract Response',
    stale_data: 'Stale Data',
    no_train_samples: 'No Train Samples',
    low_confidence: 'Low Confidence',
    training_failed: 'Training Failed',
    high_error_rate: 'High Error Rate',
  }

  return labels[type] || 'Unknown Warning'
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: WarningSeverity): {
  bg: string
  text: string
  border: string
  icon: string
} {
  switch (severity) {
    case 'critical':
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800',
        icon: '🔴',
      }
    case 'warning':
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        text: 'text-yellow-700 dark:text-yellow-400',
        border: 'border-yellow-200 dark:border-yellow-800',
        icon: '🟡',
      }
    case 'info':
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
        icon: '🔵',
      }
    default:
      return {
        bg: 'bg-gray-50 dark:bg-gray-900/20',
        text: 'text-gray-700 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-800',
        icon: '⚪',
      }
  }
}

/**
 * Get severity badge text
 */
export function getSeverityBadge(severity: WarningSeverity): string {
  const badges: Record<WarningSeverity, string> = {
    critical: 'CRITICAL',
    warning: 'WARNING',
    info: 'INFO',
  }

  return badges[severity] || 'UNKNOWN'
}

/**
 * Count warnings by severity
 */
export function countBySeverity(warnings: SystemWarning[]): Record<WarningSeverity, number> {
  return {
    critical: warnings.filter((w) => w.severity === 'critical').length,
    warning: warnings.filter((w) => w.severity === 'warning').length,
    info: warnings.filter((w) => w.severity === 'info').length,
  }
}
