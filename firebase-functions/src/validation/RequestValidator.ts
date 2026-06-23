/**
 * Request/Response validation layer for ML Runtime API contracts.
 *
 * Validates incoming requests and outgoing responses against the JSON Schema
 * defined in ml-pipeline/schemas/api_contracts/v1.0/ml_runtime_contracts.json
 */

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export class RequestValidator {
  // Regex patterns for validation
  private static readonly GCS_PATH_PATTERN = /^gs:\/\/[a-z0-9_-]+\/[a-zA-Z0-9_.\\/\-]+\.(json|pkl)$/;
  private static readonly RUN_ID_PATTERN = /^([0-9]{8}-[a-z]+-[0-9]{3,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

  /**
   * Validate POST /api/ml/validate-dataset request.
   *
   * Required fields:
   * - dataset_path (string, GCS path to .json file)
   *
   * Optional fields:
   * - run_id (string or null, auto-generate if missing)
   * - validation_level (string, "quick" or "full", default: "full")
   * - format (string, "json" or "csv", default: "json")
   * - timeout_seconds (number 10-600, default: 30)
   *
   * @returns [isValid, listOfErrors]
   */
  static validateDatasetRequest(request: any): [boolean, ValidationError[]] {
    const errors: ValidationError[] = [];

    // Check required: dataset_path
    if (!("dataset_path" in request)) {
      errors.push({ field: "dataset_path", message: "Field is required" });
    } else {
      const datasetPath = request.dataset_path;
      if (typeof datasetPath !== "string") {
        errors.push({
          field: "dataset_path",
          message: `Must be string, got ${typeof datasetPath}`,
          value: datasetPath,
        });
      } else if (!this.GCS_PATH_PATTERN.test(datasetPath)) {
        errors.push({
          field: "dataset_path",
          message: "Must be valid GCS path (gs://bucket/path.json)",
          value: datasetPath,
        });
      }
    }

    // Check optional: run_id
    if ("run_id" in request) {
      const runId = request.run_id;
      if (runId !== null && runId !== undefined) {
        if (typeof runId !== "string") {
          errors.push({
            field: "run_id",
            message: `Must be string or null, got ${typeof runId}`,
            value: runId,
          });
        } else if (!this.RUN_ID_PATTERN.test(runId)) {
          errors.push({
            field: "run_id",
            message: "Invalid format (must be UUID or YYYYMMDD-type-NNN)",
            value: runId,
          });
        }
      }
    }

    // Check optional: validation_level
    if ("validation_level" in request) {
      const validationLevel = request.validation_level;
      if (typeof validationLevel !== "string") {
        errors.push({
          field: "validation_level",
          message: `Must be string, got ${typeof validationLevel}`,
          value: validationLevel,
        });
      } else if (!["quick", "full"].includes(validationLevel)) {
        errors.push({
          field: "validation_level",
          message: "Must be 'quick' or 'full'",
          value: validationLevel,
        });
      }
    }

    // Check optional: format
    if ("format" in request) {
      const format = request.format;
      if (typeof format !== "string") {
        errors.push({
          field: "format",
          message: `Must be string, got ${typeof format}`,
          value: format,
        });
      } else if (!["json", "csv"].includes(format)) {
        errors.push({
          field: "format",
          message: "Must be 'json' or 'csv'",
          value: format,
        });
      }
    }

    // Check optional: timeout_seconds
    if ("timeout_seconds" in request) {
      const timeout = request.timeout_seconds;
      if (typeof timeout !== "number") {
        errors.push({
          field: "timeout_seconds",
          message: `Must be number, got ${typeof timeout}`,
          value: timeout,
        });
      } else if (timeout < 10 || timeout > 600) {
        errors.push({
          field: "timeout_seconds",
          message: "Must be between 10 and 600",
          value: timeout,
        });
      }
    }

    return [errors.length === 0, errors];
  }

  /**
   * Validate POST /api/ml/evaluate request.
   *
   * Required fields:
   * - model_path (string, GCS path to .pkl file)
   *
   * Optional fields:
   * - validation_data_path (string or null, use default if null)
   * - run_id (string or null, auto-generate if missing)
   * - timeout_seconds (number 10-600, default: 30)
   *
   * @returns [isValid, listOfErrors]
   */
  static validateEvaluateRequest(request: any): [boolean, ValidationError[]] {
    const errors: ValidationError[] = [];

    // Check required: model_path
    if (!("model_path" in request)) {
      errors.push({ field: "model_path", message: "Field is required" });
    } else {
      const modelPath = request.model_path;
      if (typeof modelPath !== "string") {
        errors.push({
          field: "model_path",
          message: `Must be string, got ${typeof modelPath}`,
          value: modelPath,
        });
      } else if (!this.GCS_PATH_PATTERN.test(modelPath)) {
        errors.push({
          field: "model_path",
          message: "Must be valid GCS path (gs://bucket/path.pkl)",
          value: modelPath,
        });
      }
    }

    // Check optional: validation_data_path
    if ("validation_data_path" in request) {
      const valPath = request.validation_data_path;
      if (valPath !== null && valPath !== undefined) {
        if (typeof valPath !== "string") {
          errors.push({
            field: "validation_data_path",
            message: `Must be string or null, got ${typeof valPath}`,
            value: valPath,
          });
        } else if (!this.GCS_PATH_PATTERN.test(valPath)) {
          errors.push({
            field: "validation_data_path",
            message: "Must be valid GCS path (gs://bucket/path.json)",
            value: valPath,
          });
        }
      }
    }

    // Check optional: run_id
    if ("run_id" in request) {
      const runId = request.run_id;
      if (runId !== null && runId !== undefined) {
        if (typeof runId !== "string") {
          errors.push({
            field: "run_id",
            message: `Must be string or null, got ${typeof runId}`,
            value: runId,
          });
        } else if (!this.RUN_ID_PATTERN.test(runId)) {
          errors.push({
            field: "run_id",
            message: "Invalid format (must be UUID or YYYYMMDD-type-NNN)",
            value: runId,
          });
        }
      }
    }

    // Check optional: timeout_seconds
    if ("timeout_seconds" in request) {
      const timeout = request.timeout_seconds;
      if (typeof timeout !== "number") {
        errors.push({
          field: "timeout_seconds",
          message: `Must be number, got ${typeof timeout}`,
          value: timeout,
        });
      } else if (timeout < 10 || timeout > 600) {
        errors.push({
          field: "timeout_seconds",
          message: "Must be between 10 and 600",
          value: timeout,
        });
      }
    }

    return [errors.length === 0, errors];
  }
}

export class ResponseValidator {
  /**
   * Validate POST /api/ml/validate-dataset response.
   *
   * Required fields:
   * - run_id (string)
   * - status (string: "PASS", "FAIL", "WARNING")
   * - dataset_stats (object with total_rows, valid_rows, unique_users)
   *
   * @returns [isValid, listOfErrors]
   */
  static validateDatasetResponse(response: any): [boolean, ValidationError[]] {
    const errors: ValidationError[] = [];

    // Check required: run_id
    if (!("run_id" in response)) {
      errors.push({ field: "run_id", message: "Field is required" });
    } else {
      const runId = response.run_id;
      if (typeof runId !== "string") {
        errors.push({
          field: "run_id",
          message: `Must be string, got ${typeof runId}`,
          value: runId,
        });
      } else if (runId.length === 0) {
        errors.push({
          field: "run_id",
          message: "Cannot be empty",
          value: runId,
        });
      }
    }

    // Check required: status
    if (!("status" in response)) {
      errors.push({ field: "status", message: "Field is required" });
    } else {
      const status = response.status;
      if (typeof status !== "string") {
        errors.push({
          field: "status",
          message: `Must be string, got ${typeof status}`,
          value: status,
        });
      } else if (!["PASS", "FAIL", "WARNING"].includes(status)) {
        errors.push({
          field: "status",
          message: "Must be 'PASS', 'FAIL', or 'WARNING'",
          value: status,
        });
      }
    }

    // Check required: dataset_stats
    if (!("dataset_stats" in response)) {
      errors.push({ field: "dataset_stats", message: "Field is required" });
    } else {
      const datasetStats = response.dataset_stats;
      if (typeof datasetStats !== "object" || datasetStats === null) {
        errors.push({
          field: "dataset_stats",
          message: `Must be object, got ${typeof datasetStats}`,
          value: datasetStats,
        });
      } else {
        // Check required sub-fields
        const requiredStats = ["total_rows", "valid_rows", "unique_users"];
        for (const stat of requiredStats) {
          if (!(stat in datasetStats)) {
            errors.push({
              field: `dataset_stats.${stat}`,
              message: "Field is required",
            });
          } else if (typeof datasetStats[stat] !== "number") {
            errors.push({
              field: `dataset_stats.${stat}`,
              message: `Must be number, got ${typeof datasetStats[stat]}`,
              value: datasetStats[stat],
            });
          } else if (datasetStats[stat] < 0) {
            errors.push({
              field: `dataset_stats.${stat}`,
              message: "Cannot be negative",
              value: datasetStats[stat],
            });
          }
        }
      }
    }

    // Check optional: timestamp
    if ("timestamp" in response) {
      const timestamp = response.timestamp;
      if (typeof timestamp !== "string") {
        errors.push({
          field: "timestamp",
          message: `Must be string (ISO-8601), got ${typeof timestamp}`,
          value: timestamp,
        });
      } else {
        try {
          new Date(timestamp);
        } catch {
          errors.push({
            field: "timestamp",
            message: "Must be valid ISO-8601 format",
            value: timestamp,
          });
        }
      }
    }

    return [errors.length === 0, errors];
  }

  /**
   * Validate POST /api/ml/evaluate response.
   *
   * Required fields:
   * - run_id (string)
   * - status (string: "PASS" or "FAIL")
   * - accuracy (number 0-1)
   * - f1_score (number 0-1)
   *
   * @returns [isValid, listOfErrors]
   */
  static validateEvaluateResponse(response: any): [boolean, ValidationError[]] {
    const errors: ValidationError[] = [];

    // Check required: run_id
    if (!("run_id" in response)) {
      errors.push({ field: "run_id", message: "Field is required" });
    } else {
      const runId = response.run_id;
      if (typeof runId !== "string") {
        errors.push({
          field: "run_id",
          message: `Must be string, got ${typeof runId}`,
          value: runId,
        });
      } else if (runId.length === 0) {
        errors.push({
          field: "run_id",
          message: "Cannot be empty",
          value: runId,
        });
      }
    }

    // Check required: status
    if (!("status" in response)) {
      errors.push({ field: "status", message: "Field is required" });
    } else {
      const status = response.status;
      if (typeof status !== "string") {
        errors.push({
          field: "status",
          message: `Must be string, got ${typeof status}`,
          value: status,
        });
      } else if (!["PASS", "FAIL"].includes(status)) {
        errors.push({
          field: "status",
          message: "Must be 'PASS' or 'FAIL'",
          value: status,
        });
      }
    }

    // Check required: accuracy
    if (!("accuracy" in response)) {
      errors.push({ field: "accuracy", message: "Field is required" });
    } else {
      const accuracy = response.accuracy;
      if (typeof accuracy !== "number") {
        errors.push({
          field: "accuracy",
          message: `Must be number, got ${typeof accuracy}`,
          value: accuracy,
        });
      } else if (accuracy < 0 || accuracy > 1) {
        errors.push({
          field: "accuracy",
          message: "Must be between 0 and 1",
          value: accuracy,
        });
      }
    }

    // Check required: f1_score
    if (!("f1_score" in response)) {
      errors.push({ field: "f1_score", message: "Field is required" });
    } else {
      const f1Score = response.f1_score;
      if (typeof f1Score !== "number") {
        errors.push({
          field: "f1_score",
          message: `Must be number, got ${typeof f1Score}`,
          value: f1Score,
        });
      } else if (f1Score < 0 || f1Score > 1) {
        errors.push({
          field: "f1_score",
          message: "Must be between 0 and 1",
          value: f1Score,
        });
      }
    }

    // Check optional: timestamp
    if ("timestamp" in response) {
      const timestamp = response.timestamp;
      if (typeof timestamp !== "string") {
        errors.push({
          field: "timestamp",
          message: `Must be string (ISO-8601), got ${typeof timestamp}`,
          value: timestamp,
        });
      } else {
        try {
          new Date(timestamp);
        } catch {
          errors.push({
            field: "timestamp",
            message: "Must be valid ISO-8601 format",
            value: timestamp,
          });
        }
      }
    }

    return [errors.length === 0, errors];
  }
}
