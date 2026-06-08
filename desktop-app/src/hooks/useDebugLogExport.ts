/**
 * Debug Log Export Hook
 *
 * FÁZE 4.6F: Prepare debug logs for export
 * Generates exportable formats (TXT, JSON, structured)
 * Ready for future PDF generation
 */

export interface DebugLogExportData {
  id: string
  status: 'success' | 'failed'
  timestamp: string
  duration: number
  errorCount?: number
  lastError?: string
  requestSummary?: string
  responseSummary?: string
  validationStatus?: string
}

export interface ExportFormat {
  format: 'text' | 'json' | 'structured'
  filename: string
  content: string | object
  mimeType: string
}

export function useDebugLogExport() {
  /**
   * Generate long debug log from run data
   */
  const generateDebugLog = (data: DebugLogExportData): string[] => {
    const lines: string[] = []
    const now = new Date().toISOString()

    // Header
    lines.push('═══════════════════════════════════════════════════════')
    lines.push('AI OBSERVABILITY DEBUG LOG EXPORT')
    lines.push('═══════════════════════════════════════════════════════')
    lines.push('')

    // Metadata Section
    lines.push('[METADATA]')
    lines.push(`Exported: ${now}`)
    lines.push(`Run ID: ${data.id}`)
    lines.push(`Status: ${data.status.toUpperCase()}`)
    lines.push(`Timestamp: ${data.timestamp}`)
    lines.push('')

    // Timing Section
    lines.push('[TIMING]')
    lines.push(`Duration: ${Math.round(data.duration / 1000)}s (${data.duration}ms)`)
    lines.push(`Started: ${new Date(data.timestamp).toISOString()}`)
    lines.push('')

    // Request Section
    if (data.requestSummary) {
      lines.push('[REQUEST]')
      data.requestSummary.split('\n').forEach((line) => {
        lines.push(`  ${line}`)
      })
      lines.push('')
    }

    // Response Section
    if (data.responseSummary) {
      lines.push('[RESPONSE]')
      data.responseSummary.split('\n').forEach((line) => {
        lines.push(`  ${line}`)
      })
      lines.push('')
    }

    // Validation Section
    if (data.validationStatus) {
      lines.push('[VALIDATION]')
      const status = data.validationStatus.charAt(0).toUpperCase() + data.validationStatus.slice(1)
      lines.push(`  Status: ${status}`)
      lines.push('')
    }

    // Error Section (if failed)
    if (data.status === 'failed') {
      lines.push('[ERRORS]')
      lines.push(`  Error Count: ${data.errorCount || 1}`)
      if (data.lastError) {
        lines.push(`  Last Error:`)
        data.lastError.split('\n').forEach((line) => {
          lines.push(`    ${line}`)
        })
      }
      lines.push('')
    }

    // Runtime Log Section
    lines.push('[RUNTIME LOG]')
    lines.push(`[DEBUG] Run ID: ${data.id}`)
    lines.push(`[DEBUG] Status: ${data.status}`)
    lines.push(`[DEBUG] Duration: ${Math.round(data.duration / 1000)}s`)

    if (data.status === 'success') {
      lines.push(`[INFO] Request validation: OK`)
      lines.push(`[INFO] Response validation: OK`)
    } else {
      lines.push(`[ERROR] Run failed during execution`)
      if (data.errorCount && data.errorCount > 1) {
        lines.push(`[ERROR] Multiple errors detected: ${data.errorCount}`)
      }
    }

    lines.push(`[INFO] Validation status: ${data.validationStatus}`)
    lines.push(`[DEBUG] Export completed: ${now}`)
    lines.push('')

    // Footer
    lines.push('═══════════════════════════════════════════════════════')
    lines.push('END OF DEBUG LOG')
    lines.push('═══════════════════════════════════════════════════════')

    return lines
  }

  /**
   * Format as plain text
   */
  const formatAsText = (data: DebugLogExportData): ExportFormat => {
    const logs = generateDebugLog(data)
    const content = logs.join('\n')

    return {
      format: 'text',
      filename: `debug-log-${data.id}-${Date.now()}.txt`,
      content,
      mimeType: 'text/plain',
    }
  }

  /**
   * Format as JSON for programmatic use
   */
  const formatAsJson = (data: DebugLogExportData): ExportFormat => {
    const logs = generateDebugLog(data)

    const jsonData = {
      meta: {
        exportedAt: new Date().toISOString(),
        format: 'json',
        version: '1.0',
      },
      run: {
        id: data.id,
        status: data.status,
        timestamp: data.timestamp,
        duration: data.duration,
        errorCount: data.errorCount,
      },
      details: {
        requestSummary: data.requestSummary,
        responseSummary: data.responseSummary,
        validationStatus: data.validationStatus,
        lastError: data.lastError,
      },
      debugLog: logs,
    }

    return {
      format: 'json',
      filename: `debug-log-${data.id}-${Date.now()}.json`,
      content: jsonData,
      mimeType: 'application/json',
    }
  }

  /**
   * Format as structured for PDF generation
   * This format is optimized for PDF layout
   */
  const formatAsStructured = (data: DebugLogExportData): ExportFormat => {
    const logs = generateDebugLog(data)

    const structuredData = {
      document: {
        title: 'AI Observability Debug Log Report',
        subtitle: `Run ID: ${data.id}`,
        generatedAt: new Date().toISOString(),
      },
      sections: [
        {
          id: 'metadata',
          title: 'Metadata',
          content: {
            'Run ID': data.id,
            'Status': data.status.toUpperCase(),
            'Timestamp': data.timestamp,
            'Exported': new Date().toISOString(),
          },
        },
        {
          id: 'timing',
          title: 'Timing Information',
          content: {
            'Duration': `${Math.round(data.duration / 1000)}s`,
            'Duration (ms)': data.duration,
            'Started': new Date(data.timestamp).toISOString(),
          },
        },
        {
          id: 'request',
          title: 'Request Summary',
          content: data.requestSummary || 'N/A',
          format: 'text',
        },
        {
          id: 'response',
          title: 'Response Summary',
          content: data.responseSummary || 'N/A',
          format: 'text',
        },
        {
          id: 'validation',
          title: 'Validation Status',
          content: {
            'Status': data.validationStatus
              ? data.validationStatus.charAt(0).toUpperCase() + data.validationStatus.slice(1)
              : 'Unknown',
          },
        },
        ...(data.status === 'failed'
          ? [
              {
                id: 'errors',
                title: 'Error Information',
                content: {
                  'Error Count': data.errorCount || 1,
                  'Last Error': data.lastError || 'No error message',
                },
              },
            ]
          : []),
        {
          id: 'debuglog',
          title: 'Debug Log Output',
          content: logs.join('\n'),
          format: 'code',
        },
      ],
      metadata: {
        pageOrientation: 'portrait',
        pageSize: 'A4',
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
      },
    }

    return {
      format: 'structured',
      filename: `debug-report-${data.id}-${Date.now()}.json`,
      content: structuredData,
      mimeType: 'application/json',
    }
  }

  /**
   * Download file to user's computer
   */
  const downloadFile = (format: ExportFormat) => {
    let content: string

    if (format.format === 'text') {
      content = format.content as string
    } else {
      content = JSON.stringify(format.content, null, 2)
    }

    const blob = new Blob([content], { type: format.mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = format.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Copy to clipboard
   */
  const copyToClipboard = (format: ExportFormat) => {
    let content: string

    if (format.format === 'text') {
      content = format.content as string
    } else {
      content = JSON.stringify(format.content, null, 2)
    }

    navigator.clipboard.writeText(content)
  }

  /**
   * Export with selected format
   */
  const exportDebugLog = (
    data: DebugLogExportData,
    formatType: 'text' | 'json' | 'structured',
    action: 'download' | 'clipboard'
  ) => {
    let format: ExportFormat

    switch (formatType) {
      case 'text':
        format = formatAsText(data)
        break
      case 'json':
        format = formatAsJson(data)
        break
      case 'structured':
        format = formatAsStructured(data)
        break
      default:
        format = formatAsText(data)
    }

    if (action === 'download') {
      downloadFile(format)
    } else {
      copyToClipboard(format)
    }
  }

  return {
    generateDebugLog,
    formatAsText,
    formatAsJson,
    formatAsStructured,
    downloadFile,
    copyToClipboard,
    exportDebugLog,
  }
}
