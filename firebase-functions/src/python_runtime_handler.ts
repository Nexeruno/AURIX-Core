/**
 * Python Runtime Handler
 *
 * Unified wrapper for calling Python ML Runtime with:
 * 1. Request validation
 * 2. HTTP call to Python runtime
 * 3. Response validation
 * 4. Comprehensive error handling
 *
 * Simplifies the call flow and ensures all steps are handled consistently.
 *
 * Usage:
 *   const handler = new PythonRuntimeHandler();
 *   const result = await handler.validateDataset({...});
 *   const result = await handler.evaluateModel({...});
 */

import MLRuntimeClient, {
  ValidateDatasetRequest,
  ValidateDatasetResponse,
  EvaluateModelRequest,
  EvaluateModelResponse,
} from "./ml_runtime_client";
import {HandshakeLogger} from "./handshake_logger";


// ============================================================================
// Type Definitions
// ============================================================================

export interface CallResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
}

export interface CallOptions {
  logName?: string;
  timeout?: number;
  useColors?: boolean;
}

// ============================================================================
// Python Runtime Handler
// ============================================================================

export class PythonRuntimeHandler {
  private client: MLRuntimeClient;
  private runtimeUrl: string;

  constructor(runtimeUrl: string = "http://localhost:5000") {
    this.runtimeUrl = runtimeUrl;
    this.client = new MLRuntimeClient(runtimeUrl);
  }

  /**
   * Unified handler for dataset validation.
   *
   * Flow:
   * 1. Validate request locally
   * 2. Call Python runtime
   * 3. Validate response locally
   * 4. Handle errors
   * 5. Return result
   *
   * @param request - ValidateDatasetRequest
   * @param options - Optional configuration
   * @returns CallResult with response data or error
   *
   * @example
   *   const result = await handler.validateDataset({
   *     dataset_path: "gs://bucket/file.json"
   *   });
   *   if (result.success) {
   *     console.log(result.data);
   *   } else {
   *     console.error(result.error);
   *   }
   */
  async validateDataset(
    request: ValidateDatasetRequest,
    options: CallOptions = {}
  ): Promise<CallResult<ValidateDatasetResponse>> {
    const startTime = Date.now();
    const logName = options.logName || "validateDataset";
    const logger = new HandshakeLogger(logName, options.useColors !== false);

    try {
      // STEP 1: Log request sent
      logger.logRequestSent(request);

      // STEP 2: Validate request locally (will throw if invalid)
      this._validateDatasetRequest(request);
      logger.logRequestValidating();
      logger.logRequestValidated(true);

      // STEP 3: Call Python runtime
      logger.logProcessing("Python Runtime");
      const response: ValidateDatasetResponse = await this.client.validateDataset(
        request
      );

      // STEP 4: Validate response locally
      logger.logResponseReceived(200);
      this._validateDatasetResponse(response);
      logger.logResponseValidated(true);

      // STEP 5: Success
      const duration = Date.now() - startTime;
      logger.logSummary(true, duration);

      return {
        success: true,
        data: response,
        duration,
      };
    } catch (error) {
      const errorMsg = this._formatError(error);
      const duration = Date.now() - startTime;

      logger.logError(errorMsg);
      logger.logSummary(false, duration);

      return {
        success: false,
        error: errorMsg,
        duration,
      };
    }
  }

  /**
   * Unified handler for model evaluation.
   *
   * Flow:
   * 1. Validate request locally
   * 2. Call Python runtime
   * 3. Validate response locally
   * 4. Handle errors
   * 5. Return result
   *
   * @param request - EvaluateModelRequest
   * @param options - Optional configuration
   * @returns CallResult with response data or error
   *
   * @example
   *   const result = await handler.evaluateModel({
   *     model_path: "gs://bucket/model.pkl",
   *     validation_data_path: "gs://bucket/data.json"
   *   });
   *   if (result.success) {
   *     console.log(`Accuracy: ${result.data?.accuracy}`);
   *   } else {
   *     console.error(result.error);
   *   }
   */
  async evaluateModel(
    request: EvaluateModelRequest,
    options: CallOptions = {}
  ): Promise<CallResult<EvaluateModelResponse>> {
    const startTime = Date.now();
    const logName = options.logName || "evaluateModel";
    const logger = new HandshakeLogger(logName, options.useColors !== false);

    try {
      // STEP 1: Log request sent
      logger.logRequestSent(request);

      // STEP 2: Validate request locally
      this._validateEvaluateRequest(request);
      logger.logRequestValidating();
      logger.logRequestValidated(true);

      // STEP 3: Call Python runtime
      logger.logProcessing("Python Runtime");
      const response: EvaluateModelResponse = await this.client.evaluateModel(
        request
      );

      // STEP 4: Validate response locally
      logger.logResponseReceived(200);
      this._validateEvaluateResponse(response);
      logger.logResponseValidated(true);

      // STEP 5: Success
      const duration = Date.now() - startTime;
      logger.logSummary(true, duration);

      return {
        success: true,
        data: response,
        duration,
      };
    } catch (error) {
      const errorMsg = this._formatError(error);
      const duration = Date.now() - startTime;

      logger.logError(errorMsg);
      logger.logSummary(false, duration);

      return {
        success: false,
        error: errorMsg,
        duration,
      };
    }
  }

  /**
   * Health check for Python runtime.
   *
   * @returns true if runtime is healthy, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.client.healthCheck();
    } catch {
      return false;
    }
  }

  /**
   * Get contract information from Python runtime.
   */
  async getContractInfo(): Promise<any> {
    try {
      return await this.client.getContractInfo();
    } catch {
      return null;
    }
  }

  // ========================================================================
  // Private Validation Methods
  // ========================================================================

  private _validateDatasetRequest(request: ValidateDatasetRequest): void {
    if (!request.dataset_path) {
      throw new Error("dataset_path is required");
    }
    if (typeof request.dataset_path !== "string") {
      throw new Error("dataset_path must be a string");
    }
    if (!request.dataset_path.match(/^gs:\/\//)) {
      throw new Error("dataset_path must be a valid GCS path (gs://...)");
    }
  }

  private _validateDatasetResponse(response: ValidateDatasetResponse): void {
    if (!response.run_id) {
      throw new Error("Response missing run_id");
    }
    if (!response.status) {
      throw new Error("Response missing status");
    }
    if (!["PASS", "FAIL", "WARNING"].includes(response.status)) {
      throw new Error(
        `Invalid status value: ${response.status}. Must be PASS, FAIL, or WARNING.`
      );
    }
    if (!response.timestamp) {
      throw new Error("Response missing timestamp");
    }
  }

  private _validateEvaluateRequest(request: EvaluateModelRequest): void {
    if (!request.model_path) {
      throw new Error("model_path is required");
    }
    if (!request.validation_data_path) {
      throw new Error("validation_data_path is required");
    }
    if (typeof request.model_path !== "string") {
      throw new Error("model_path must be a string");
    }
    if (typeof request.validation_data_path !== "string") {
      throw new Error("validation_data_path must be a string");
    }
    if (!request.model_path.match(/^gs:\/\//)) {
      throw new Error("model_path must be a valid GCS path (gs://...)");
    }
    if (!request.validation_data_path.match(/^gs:\/\//)) {
      throw new Error(
        "validation_data_path must be a valid GCS path (gs://...)"
      );
    }
  }

  private _validateEvaluateResponse(response: EvaluateModelResponse): void {
    if (!response.run_id) {
      throw new Error("Response missing run_id");
    }
    if (!response.status) {
      throw new Error("Response missing status");
    }
    if (!["PASS", "FAIL", "WARNING"].includes(response.status)) {
      throw new Error(
        `Invalid status value: ${response.status}. Must be PASS, FAIL, or WARNING.`
      );
    }
    if (response.accuracy === undefined) {
      throw new Error("Response missing accuracy");
    }
    if (typeof response.accuracy !== "number") {
      throw new Error("accuracy must be a number");
    }
    if (response.accuracy < 0 || response.accuracy > 1) {
      throw new Error("accuracy must be between 0 and 1");
    }
    if (!response.timestamp) {
      throw new Error("Response missing timestamp");
    }
  }

  // ========================================================================
  // Private Error Formatting
  // ========================================================================

  private _formatError(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return "Unknown error occurred";
  }

  // ========================================================================
  // Configuration
  // ========================================================================

  /**
   * Set the Python runtime URL.
   */
  setRuntimeUrl(url: string): void {
    this.runtimeUrl = url;
    this.client = new MLRuntimeClient(url);
  }

  /**
   * Get the Python runtime URL.
   */
  getRuntimeUrl(): string {
    return this.runtimeUrl;
  }

  /**
   * Set timeout for requests.
   */
  setTimeout(ms: number): void {
    this.client.setTimeout(ms);
  }
}

// ============================================================================
// Singleton Instance (optional convenience)
// ============================================================================

let _defaultHandler: PythonRuntimeHandler | null = null;

/**
 * Get default handler instance.
 * Creates one on first call with localhost:5000.
 */
export function getDefaultHandler(): PythonRuntimeHandler {
  if (!_defaultHandler) {
    _defaultHandler = new PythonRuntimeHandler("http://localhost:5000");
  }
  return _defaultHandler;
}

/**
 * Create a new handler instance.
 */
export function createHandler(runtimeUrl?: string): PythonRuntimeHandler {
  return new PythonRuntimeHandler(runtimeUrl);
}

export default PythonRuntimeHandler;
