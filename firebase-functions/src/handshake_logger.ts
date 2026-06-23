/**
 * Handshake Logger
 *
 * Logs the Firebase/Node.js → Python handshake flow in a readable format.
 * Shows each step of the communication process.
 *
 * Usage:
 *   const logger = new HandshakeLogger("validate-dataset");
 *   logger.logRequestSent(request);
 *   logger.logResponseReceived(response);
 *   logger.logSummary(true, duration);
 */

import {ValidateDatasetRequest, EvaluateModelRequest} from "./ml_runtime_client";

// ============================================================================
// Handshake Logger
// ============================================================================

export class HandshakeLogger {
  private operationName: string;
  private startTime: number = Date.now();
  private logs: string[] = [];
  private useColors: boolean = true;

  // ANSI color codes
  private colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
  };

  constructor(operationName: string, useColors: boolean = true) {
    this.operationName = operationName;
    this.useColors = useColors;
  }

  /**
   * Log request being sent from Node.js.
   */
  logRequestSent(request: ValidateDatasetRequest | EvaluateModelRequest): void {
    const timestamp = new Date().toISOString();
    const msg = `[${timestamp}] [NODE  ] → Sending request to Flask...`;
    this._log(msg);

    // Extract key fields for display
    const fields: string[] = [];
    if ("dataset_path" in request) {
      const path = request.dataset_path.split("/").pop() || request.dataset_path;
      fields.push(`dataset=${path}`);
    }
    if ("model_path" in request) {
      const path = request.model_path.split("/").pop() || request.model_path;
      fields.push(`model=${path}`);
    }
    if (request.run_id) {
      fields.push(`run_id=${request.run_id}`);
    }

    const fieldStr = fields.join(", ");
    const detailMsg = `${" ".repeat(35)} (${fieldStr})`;
    this._log(detailMsg, "dim");
  }

  /**
   * Log request validated on Flask side.
   */
  logRequestValidated(isValid: boolean): void {
    const timestamp = new Date().toISOString();
    const status = isValid ? "✓" : "✗";
    const statusColor = isValid ? "green" : "red";
    const result = isValid ? "Request valid" : "Request invalid";

    const msg = `[${timestamp}] [FLASK ] ${this._colorize(status, statusColor)} ${result}`;
    this._log(msg);
  }

  /**
   * Log mock response being generated.
   */
  logResponseGenerated(endpoint: string): void {
    const timestamp = new Date().toISOString();
    const endpointName = endpoint.split("/").pop() || endpoint;
    const msg = `[${timestamp}] [FLASK ] ⚙ Generating mock response for ${endpointName}...`;
    this._log(msg);
  }

  /**
   * Log response being returned from Flask.
   */
  logResponseReturned(statusCode: number): void {
    const timestamp = new Date().toISOString();
    const statusColor = statusCode === 200 ? "green" : "red";
    const msg = `[${timestamp}] [FLASK ] ← Returning ${this._colorize(statusCode.toString(), statusColor)} response`;
    this._log(msg);
  }

  /**
   * Log response received on Node.js side.
   */
  logResponseReceived(statusCode: number): void {
    const timestamp = new Date().toISOString();
    const statusColor = statusCode === 200 ? "green" : "red";
    const msg = `[${timestamp}] [NODE  ] ← Received ${this._colorize(statusCode.toString(), statusColor)} response from Flask`;
    this._log(msg);
  }

  /**
   * Log response validated on Node.js side.
   */
  logResponseValidated(isValid: boolean): void {
    const timestamp = new Date().toISOString();
    const status = isValid ? "✓" : "✗";
    const statusColor = isValid ? "green" : "red";
    const result = isValid ? "Response valid" : "Response invalid";

    const msg = `[${timestamp}] [NODE  ] ${this._colorize(status, statusColor)} ${result}`;
    this._log(msg);
  }

  /**
   * Log error that occurred.
   */
  logError(error: string): void {
    const timestamp = new Date().toISOString();
    const msg = `[${timestamp}] [ERROR ] ${this._colorize("✗", "red")} ${error}`;
    this._log(msg);
  }

  /**
   * Log summary of handshake.
   */
  logSummary(success: boolean, durationMs: number): void {
    const timestamp = new Date().toISOString();
    const status = success
      ? this._colorize("✅ SUCCESS", "green")
      : this._colorize("❌ FAILED", "red");
    const msg = `[${timestamp}] [SUMMARY] ${status} (${durationMs}ms)`;
    this._log(msg);
  }

  /**
   * Print all logs.
   */
  printLogs(): void {
    console.log("");
    this.logs.forEach((log) => console.log(log));
    console.log("");
  }

  /**
   * Get all logs as array.
   */
  getLogs(): string[] {
    return this.logs;
  }

  /**
   * Private helper to log with optional color.
   */
  private _log(message: string, colorKey?: keyof typeof this.colors): void {
    if (colorKey && this.useColors) {
      const colorCode = this.colors[colorKey];
      const coloredMsg = `${colorCode}${message}${this.colors.reset}`;
      this.logs.push(message); // Store uncolored version
      console.log(coloredMsg);
    } else {
      this.logs.push(message);
      console.log(message);
    }
  }

  /**
   * Private helper to colorize text.
   */
  private _colorize(text: string, colorKey: keyof typeof this.colors): string {
    if (!this.useColors) {
      return text;
    }
    const colorCode = this.colors[colorKey];
    return `${colorCode}${text}${this.colors.reset}`;
  }
}

// ============================================================================
// Standalone Logging Functions (for simple use cases)
// ============================================================================

/**
 * Log a complete handshake in compact format.
 *
 * @example
 *   logHandshakeFlow({
 *     operation: "validate-dataset",
 *     requestSent: true,
 *     requestValid: true,
 *     responseReceived: true,
 *     responseValid: true,
 *     duration: 245,
 *     success: true
 *   });
 */
export function logHandshakeFlow(options: {
  operation: string;
  requestSent: boolean;
  requestValid: boolean;
  responseReceived: boolean;
  responseValid: boolean;
  duration: number;
  success: boolean;
  error?: string;
}): void {
  const timestamp = new Date().toISOString();
  const status = options.success ? "✅" : "❌";
  const shortOp = options.operation.split("-").pop() || options.operation;

  // Compact single-line format
  const requestStatus = options.requestValid ? "REQ✓" : "REQ✗";
  const responseStatus = options.responseValid ? "RESP✓" : "RESP✗";
  const line =
    `${status} [${shortOp}] ${requestStatus} ${responseStatus} → ${options.duration}ms`;

  console.log(line);

  if (options.error) {
    console.log(`   └─ Error: ${options.error}`);
  }
}

// ============================================================================
// Flow Logger Helper
// ============================================================================

/**
 * Create a standard handshake log with typical flow.
 */
export function createHandshakeLog(): {
  logger: HandshakeLogger;
  startTime: number;
  logFlow: (
    success: boolean,
    requestValid: boolean,
    responseValid: boolean
  ) => void;
} {
  const logger = new HandshakeLogger("handshake");
  const startTime = Date.now();

  const logFlow = (
    success: boolean,
    requestValid: boolean,
    responseValid: boolean
  ) => {
    if (!success) {
      logger.logError("Handshake failed");
    }
    const duration = Date.now() - startTime;
    logger.logSummary(success && requestValid && responseValid, duration);
  };

  return {logger, startTime, logFlow};
}

export default HandshakeLogger;
