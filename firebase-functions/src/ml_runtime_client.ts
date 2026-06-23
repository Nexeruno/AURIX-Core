/**
 * ML Runtime Client
 *
 * TypeScript client for communicating with the Python ML Runtime.
 * Handles HTTP requests to Flask entrypoint.
 *
 * Usage:
 *   const client = new MLRuntimeClient("http://localhost:5000");
 *   const result = await client.validateDataset({...});
 */

import axios, {AxiosInstance, AxiosError} from "axios";


// ============================================================================
// Type Definitions (Match contract from ml_runtime_contracts.json)
// ============================================================================

export interface ValidateDatasetRequest {
  dataset_path: string;
  run_id?: string;
  validation_level?: "quick" | "full";
  format?: "json" | "csv";
  timeout_seconds?: number;
}

export interface ValidateDatasetResponse {
  run_id: string;
  status: "PASS" | "FAIL" | "WARNING";
  timestamp: string;
  dataset_stats?: {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    valid_percentage: number;
    unique_users: number;
    date_range: {start: string; end: string};
  };
  schema_validation?: {
    feature_count: number;
    all_features_present: boolean;
    extra_fields: number;
  };
  quality_metrics?: {
    quality_score: number;
    completeness_percent: number;
    validity_percent: number;
  };
  quality_gates?: {all_gates_passed: boolean};
  recommendations?: string[];
}

export interface EvaluateModelRequest {
  model_path: string;
  validation_data_path: string;
  run_id?: string;
}

export interface EvaluateModelResponse {
  run_id: string;
  status: "PASS" | "FAIL" | "WARNING";
  accuracy: number;
  f1_score?: number;
  precision?: number;
  recall?: number;
  confidence?: number;
  timestamp: string;
  predictions?: {
    total_samples: number;
    correct_predictions: number;
    incorrect_predictions: number;
  };
  model_info?: {
    model_name: string;
    model_version: string;
    training_date: string;
    framework: string;
  };
  validation_data_info?: {
    total_samples: number;
    data_splits: Record<string, number>;
  };
  evaluation_info?: {
    evaluation_method: string;
    evaluation_time_seconds: number;
    evaluation_environment: string;
  };
  performance_breakdown?: Record<string, {precision: number; recall: number; f1_score: number}>;
}

export interface MLRuntimeError {
  status: "error";
  error: string;
  error_count?: number;
  errors?: Array<{field: string; message: string}>;
  timestamp: string;
}

// ============================================================================
// ML Runtime Client
// ============================================================================

export class MLRuntimeClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private timeout: number = 30000; // 30 seconds

  constructor(baseUrl: string = "http://localhost:5000") {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Check if ML Runtime is healthy.
   *
   * @returns Promise<boolean> - True if healthy, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get("/health");
      return response.status === 200 && response.data.status === "healthy";
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  }

  /**
   * Get contract information from ML Runtime.
   *
   * @returns Promise with contract info
   */
  async getContractInfo(): Promise<any> {
    try {
      const response = await this.client.get("/api/ml/contract-info");
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to get contract info");
    }
  }

  /**
   * Validate a dataset using the ML Runtime.
   *
   * @param request - ValidateDatasetRequest
   * @returns Promise<ValidateDatasetResponse>
   * @throws MLRuntimeError on validation failure or server error
   *
   * @example
   *   const result = await client.validateDataset({
   *     dataset_path: "gs://bucket/dataset.json"
   *   });
   */
  async validateDataset(request: ValidateDatasetRequest): Promise<ValidateDatasetResponse> {
    try {
      // Validate request shape (optional, can be done by server)
      this.validateDatasetRequest(request);

      // Make request
      const response = await this.client.post<ValidateDatasetResponse>(
        "/api/ml/validate-dataset",
        request
      );

      if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error, "Dataset validation failed");
    }
  }

  /**
   * Evaluate a model using the ML Runtime.
   *
   * @param request - EvaluateModelRequest
   * @returns Promise<EvaluateModelResponse>
   * @throws MLRuntimeError on validation failure or server error
   *
   * @example
   *   const result = await client.evaluateModel({
   *     model_path: "gs://bucket/model.pkl",
   *     validation_data_path: "gs://bucket/validation.json"
   *   });
   */
  async evaluateModel(request: EvaluateModelRequest): Promise<EvaluateModelResponse> {
    try {
      // Validate request shape (optional, can be done by server)
      this.validateEvaluateRequest(request);

      // Make request
      const response = await this.client.post<EvaluateModelResponse>(
        "/api/ml/evaluate",
        request
      );

      if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error, "Model evaluation failed");
    }
  }

  /**
   * Validate dataset request shape.
   */
  private validateDatasetRequest(request: ValidateDatasetRequest): void {
    if (!request.dataset_path) {
      throw new Error("dataset_path is required");
    }
    if (typeof request.dataset_path !== "string") {
      throw new Error("dataset_path must be a string");
    }
    if (!request.dataset_path.match(/^gs:\/\//)) {
      throw new Error("dataset_path must be a GCS path (gs://...)");
    }
  }

  /**
   * Validate evaluate request shape.
   */
  private validateEvaluateRequest(request: EvaluateModelRequest): void {
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
      throw new Error("model_path must be a GCS path (gs://...)");
    }
    if (!request.validation_data_path.match(/^gs:\/\//)) {
      throw new Error("validation_data_path must be a GCS path (gs://...)");
    }
  }

  /**
   * Handle HTTP errors and format them.
   */
  private handleError(error: any, defaultMessage: string): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<MLRuntimeError>;

      // Server returned error response (4xx, 5xx)
      if (axiosError.response) {
        const data = axiosError.response.data;
        if (data && typeof data === "object" && "error" in data) {
          const mlError = data as MLRuntimeError;
          if (mlError.errors && mlError.errors.length > 0) {
            // Format validation errors
            const errorMessages = mlError.errors
              .map((e) => `${e.field}: ${e.message}`)
              .join("; ");
            return new Error(`${mlError.error}: ${errorMessages}`);
          }
          return new Error(mlError.error);
        }
        return new Error(
          `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`
        );
      }

      // Network error
      if (axiosError.request) {
        return new Error(`Network error: ${axiosError.message}`);
      }

      // Other axios error
      return new Error(`Request error: ${axiosError.message}`);
    }

    // Unknown error
    if (error instanceof Error) {
      return error;
    }

    return new Error(defaultMessage);
  }

  /**
   * Set timeout for requests.
   */
  setTimeout(ms: number): void {
    this.timeout = ms;
    this.client.defaults.timeout = ms;
  }

  /**
   * Get base URL.
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// ============================================================================
// Export for Cloud Functions
// ============================================================================

export default MLRuntimeClient;
