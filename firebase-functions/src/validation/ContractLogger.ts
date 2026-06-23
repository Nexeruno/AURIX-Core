/**
 * Contract Logger
 *
 * Provides concise, readable logging for the mock E2E contract flow.
 * Formats request/response validation logs in a structured way.
 */

import { ValidationError } from "./RequestValidator";
import { ValidationErrorFormatter } from "./ErrorFormatter";


interface LogColors {
  green: string;
  red: string;
  yellow: string;
  blue: string;
  reset: string;
  bold: string;
}


class ContractLogger {
  private useColors: boolean;
  private verbose: boolean;
  private logs: string[] = [];

  // Color codes (for terminal output)
  private colors: LogColors = {
    green: "\033[92m",
    red: "\033[91m",
    yellow: "\033[93m",
    blue: "\033[94m",
    reset: "\033[0m",
    bold: "\033[1m"
  };

  constructor(useColors: boolean = true, verbose: boolean = false) {
    this.useColors = useColors;
    this.verbose = verbose;
  }

  private colorize(text: string, color: string): string {
    if (!this.useColors) {
      return text;
    }
    return `${color}${text}${this.colors.reset}`;
  }

  logRequestPrepared(endpoint: string, request: any): void {
    // Extract key fields for logging
    const keyFields: string[] = [];

    if (request.dataset_path) {
      const path = request.dataset_path.split("/").pop();
      keyFields.push(`dataset=${path}`);
    }
    if (request.model_path) {
      const path = request.model_path.split("/").pop();
      keyFields.push(`model=${path}`);
    }
    if (request.run_id) {
      keyFields.push(`run_id=${request.run_id}`);
    }

    const fieldsStr = keyFields.length > 0 ? keyFields.join(" ") : "no_fields";
    const msg = `[REQUEST] ${this.colorize("✓", this.colors.green)} ${fieldsStr}`;

    console.log(msg);
    this.logs.push(msg);
  }

  logRequestValidated(isValid: boolean, errors?: ValidationError[]): void {
    if (isValid) {
      const msg = `[VALIDATE_REQ] ${this.colorize("✓ PASS", this.colors.green)}`;
      console.log(msg);
      this.logs.push(msg);
    } else {
      const errorSummary = ValidationErrorFormatter.formatAsStringList(
        errors || []
      );
      const errorMsg = errorSummary[0] || "Unknown error";
      const msg = `[VALIDATE_REQ] ${this.colorize(
        "✗ FAIL",
        this.colors.red
      )}: ${errorMsg}`;

      console.log(msg);
      this.logs.push(msg);

      // Log additional errors if verbose
      if (this.verbose && errorSummary.length > 1) {
        for (let i = 1; i < errorSummary.length; i++) {
          const detailMsg = `  └─ ${errorSummary[i]}`;
          console.log(detailMsg);
          this.logs.push(detailMsg);
        }
      }
    }
  }

  logPythonProcessing(endpoint: string): void {
    const msg = `[PYTHON] ${this.colorize("⚙", this.colors.blue)} Processing...`;
    console.log(msg);
    this.logs.push(msg);
  }

  logResponseReceived(response: any): void {
    // Extract key fields
    const keyFields: string[] = [];

    if (response.run_id) {
      keyFields.push(`run_id=${response.run_id}`);
    }
    if (response.status) {
      keyFields.push(`status=${response.status}`);
    }
    if (response.accuracy !== undefined) {
      keyFields.push(`accuracy=${response.accuracy.toFixed(3)}`);
    }

    const fieldsStr = keyFields.length > 0 ? keyFields.join(" ") : "no_fields";
    const msg = `[RESPONSE] ${this.colorize("✓", this.colors.green)} ${fieldsStr}`;

    console.log(msg);
    this.logs.push(msg);
  }

  logResponseValidated(isValid: boolean, errors?: ValidationError[]): void {
    if (isValid) {
      const msg = `[VALIDATE_RESP] ${this.colorize("✓ PASS", this.colors.green)}`;
      console.log(msg);
      this.logs.push(msg);
    } else {
      const errorSummary = ValidationErrorFormatter.formatAsStringList(
        errors || []
      );
      const errorMsg = errorSummary[0] || "Unknown error";
      const msg = `[VALIDATE_RESP] ${this.colorize(
        "✗ FAIL",
        this.colors.red
      )}: ${errorMsg}`;

      console.log(msg);
      this.logs.push(msg);

      // Log additional errors if verbose
      if (this.verbose && errorSummary.length > 1) {
        for (let i = 1; i < errorSummary.length; i++) {
          const detailMsg = `  └─ ${errorSummary[i]}`;
          console.log(detailMsg);
          this.logs.push(detailMsg);
        }
      }
    }
  }

  logSummary(
    success: boolean,
    endpoint: string,
    durationMs?: number
  ): void {
    let msg: string;

    if (success) {
      msg = `[SUMMARY] ${this.colorize("✅ SUCCESS", this.colors.green)}`;
      if (durationMs !== undefined) {
        msg += ` (${Math.round(durationMs)}ms)`;
      }
    } else {
      msg = `[SUMMARY] ${this.colorize("❌ FAILED", this.colors.red)}`;
      if (durationMs !== undefined) {
        msg += ` (${Math.round(durationMs)}ms)`;
      }
    }

    console.log(msg);
    this.logs.push(msg);
  }

  printLogs(): void {
    console.log(this.logs.join("\n"));
  }

  getLogs(): string[] {
    return this.logs;
  }
}


class CompactFlowLogger {
  /**
   * Log complete flow in single line.
   *
   * Example outputs:
   *   "[validate-dataset] REQ✓ RESP✓ → SUCCESS"
   *   "[validate-dataset] REQ✗ (dataset_path) → FAILED"
   *   "[evaluate] REQ✓ RESP✗ (status) → FAILED"
   */
  static logRequestFlow(
    endpoint: string,
    requestValid: boolean,
    requestErrors?: ValidationError[],
    responseValid?: boolean,
    responseErrors?: ValidationError[],
    overallSuccess: boolean = false
  ): string {
    const endpointShort = endpoint.split("/").pop() || endpoint;

    // Request status
    let reqStatus = requestValid ? "REQ✓" : "REQ✗";
    if (!requestValid && requestErrors && requestErrors.length > 0) {
      const errorField = requestErrors[0].field;
      reqStatus += ` (${errorField})`;
    }

    // Response status
    let respStatus: string;
    if (responseValid === undefined) {
      respStatus = "—";
    } else {
      respStatus = responseValid ? "RESP✓" : "RESP✗";
      if (!responseValid && responseErrors && responseErrors.length > 0) {
        const errorField = responseErrors[0].field;
        respStatus += ` (${errorField})`;
      }
    }

    // Overall result
    const result = overallSuccess ? "SUCCESS" : "FAILED";

    return `[${endpointShort}] ${reqStatus} ${respStatus} → ${result}`;
  }
}


// ============================================================================
// EXAMPLE USAGE
// ============================================================================

if (require.main === module) {
  console.log("=".repeat(70));
  console.log("EXAMPLE 1: Valid Request + Response");
  console.log("=".repeat(70));

  const logger1 = new ContractLogger(true, false);
  const start1 = Date.now();

  logger1.logRequestPrepared("/api/ml/validate-dataset", {
    dataset_path: "gs://bucket/exports/dataset-20260607.json",
    run_id: "20260607-val-001"
  });
  logger1.logRequestValidated(true);
  logger1.logPythonProcessing("/api/ml/validate-dataset");
  logger1.logResponseReceived({
    run_id: "20260607-val-001",
    status: "PASS"
  });
  logger1.logResponseValidated(true);
  const duration1 = Date.now() - start1;
  logger1.logSummary(true, "/api/ml/validate-dataset", duration1);

  // Compact single-line version
  console.log("\nCompact format:");
  const compactLog1 = CompactFlowLogger.logRequestFlow(
    "/api/ml/validate-dataset",
    true,
    undefined,
    true,
    undefined,
    true
  );
  console.log(compactLog1);

  // ========================================================================

  console.log("\n\n" + "=".repeat(70));
  console.log("EXAMPLE 2: Invalid Request");
  console.log("=".repeat(70));

  const logger2 = new ContractLogger(true, false);
  const start2 = Date.now();

  logger2.logRequestPrepared("/api/ml/validate-dataset", {
    run_id: "20260607-val-001"
  });

  const error: ValidationError = {
    field: "dataset_path",
    message: "Field is required"
  };
  logger2.logRequestValidated(false, [error]);
  const duration2 = Date.now() - start2;
  logger2.logSummary(false, "/api/ml/validate-dataset", duration2);

  // Compact single-line version
  console.log("\nCompact format:");
  const compactLog2 = CompactFlowLogger.logRequestFlow(
    "/api/ml/validate-dataset",
    false,
    [error],
    undefined,
    undefined,
    false
  );
  console.log(compactLog2);

  // ========================================================================

  console.log("\n\n" + "=".repeat(70));
  console.log("EXAMPLE 3: Valid Request + Invalid Response");
  console.log("=".repeat(70));

  const logger3 = new ContractLogger(true, false);
  const start3 = Date.now();

  logger3.logRequestPrepared("/api/ml/evaluate", {
    model_path: "gs://bucket/models/v3.3/model.pkl",
    run_id: "20260607-eval-001"
  });
  logger3.logRequestValidated(true);
  logger3.logPythonProcessing("/api/ml/evaluate");
  logger3.logResponseReceived({
    run_id: "20260607-eval-001",
    status: "INVALID",
    accuracy: 0.5
  });

  const respError: ValidationError = {
    field: "status",
    message: "Must be 'PASS' or 'FAIL'"
  };
  logger3.logResponseValidated(false, [respError]);
  const duration3 = Date.now() - start3;
  logger3.logSummary(false, "/api/ml/evaluate", duration3);

  // Compact single-line version
  console.log("\nCompact format:");
  const compactLog3 = CompactFlowLogger.logRequestFlow(
    "/api/ml/evaluate",
    true,
    undefined,
    false,
    [respError],
    false
  );
  console.log(compactLog3);
}


export { ContractLogger, CompactFlowLogger };
