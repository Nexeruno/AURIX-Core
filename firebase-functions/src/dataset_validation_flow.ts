/**
 * Dataset Validation Flow
 *
 * Real use-case implementation using PythonRuntimeHandler:
 * 1. User submits dataset for validation
 * 2. Firebase calls Python runtime via handler
 * 3. Handler manages validation + error handling + logging
 * 4. Results returned to caller
 *
 * This is the first concrete use-case flow connecting all components.
 *
 * Usage:
 *   const flow = new DatasetValidationFlow();
 *   const result = await flow.validateUploadedDataset({...});
 */

import PythonRuntimeHandler, {CallResult} from "./python_runtime_handler";
import {ValidateDatasetResponse} from "./ml_runtime_client";
import {HandshakeLogger} from "./handshake_logger";


// ============================================================================
// Type Definitions
// ============================================================================

export interface DatasetValidationRequest {
  // User provides these
  datasetPath: string;  // GCS path
  userId?: string;
  runName?: string;
}

export interface DatasetValidationResponse {
  // We return these
  success: boolean;
  status?: "PASS" | "FAIL" | "WARNING";
  qualityScore?: number;
  totalRows?: number;
  validRows?: number;
  invalidRows?: number;
  duration: number;
  error?: string;
}

// ============================================================================
// Dataset Validation Flow
// ============================================================================

export class DatasetValidationFlow {
  private handler: PythonRuntimeHandler;
  private userId?: string;

  constructor(
    runtimeUrl: string = "http://localhost:5000",
    userId?: string
  ) {
    this.handler = new PythonRuntimeHandler(runtimeUrl);
    this.userId = userId;
  }

  /**
   * Main flow: Validate an uploaded dataset.
   *
   * Steps:
   * 1. Prepare request from user input
   * 2. Call Python runtime via handler
   * 3. Process results
   * 4. Return response
   *
   * @param request - DatasetValidationRequest
   * @returns DatasetValidationResponse with results
   *
   * @example
   *   const flow = new DatasetValidationFlow();
   *   const result = await flow.validateUploadedDataset({
   *     datasetPath: "gs://bucket/dataset.json"
   *   });
   *   console.log(`Status: ${result.status}`);
   *   console.log(`Quality: ${result.qualityScore}`);
   */
  async validateUploadedDataset(
    request: DatasetValidationRequest
  ): Promise<DatasetValidationResponse> {
    console.log(`\n${"=".repeat(80)}`);
    console.log("DATASET VALIDATION FLOW");
    console.log("=".repeat(80));

    try {
      // STEP 1: Prepare request for Python runtime
      console.log("\n📋 STEP 1: Preparing request...");
      const pythonRequest = this._preparePythonRequest(request);
      console.log(`   Dataset path: ${pythonRequest.dataset_path}`);
      console.log(`   Run ID: ${pythonRequest.run_id}`);

      // STEP 2: Call Python runtime via handler
      console.log("\n🔄 STEP 2: Calling Python runtime via handler...");
      const handlerResult: CallResult<ValidateDatasetResponse> =
        await this.handler.validateDataset(pythonRequest, {
          logName: `dataset-validation-${pythonRequest.run_id}`,
        });

      console.log(`   Duration: ${handlerResult.duration}ms`);

      // STEP 3: Process results
      console.log("\n✅ STEP 3: Processing results...");

      if (!handlerResult.success) {
        console.log(`   ❌ Validation failed: ${handlerResult.error}`);
        return this._formatErrorResponse(handlerResult);
      }

      console.log(`   ✓ Validation succeeded`);
      const response = handlerResult.data!;

      console.log(`   Status: ${response.status}`);
      console.log(
        `   Quality Score: ${response.quality_metrics?.quality_score}`
      );
      console.log(
        `   Rows: ${response.dataset_stats?.total_rows} total, ${response.dataset_stats?.valid_rows} valid`
      );

      // STEP 4: Return formatted response
      console.log("\n📤 STEP 4: Returning response to user...");
      const result = this._formatSuccessResponse(response, handlerResult);

      console.log(`   ✅ Success`);
      console.log(`\n${"=".repeat(80)}`);

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`\n❌ Flow failed: ${errorMsg}`);
      console.log(`\n${"=".repeat(80)}`);

      return {
        success: false,
        duration: 0,
        error: errorMsg,
      };
    }
  }

  /**
   * Check if dataset validation is available.
   */
  async isAvailable(): Promise<boolean> {
    return await this.handler.healthCheck();
  }

  // ========================================================================
  // Private Helpers
  // ========================================================================

  private _preparePythonRequest(
    request: DatasetValidationRequest
  ): {
    dataset_path: string;
    run_id: string;
    validation_level: "quick" | "full";
  } {
    // Convert user-friendly request to Python contract format
    return {
      dataset_path: request.datasetPath,
      run_id: request.runName || this._generateRunId(request.userId),
      validation_level: "full", // Default to full validation
    };
  }

  private _generateRunId(userId?: string): string {
    const date = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const seq = Math.floor(Math.random() * 1000);
    const user = userId ? userId.substring(0, 3).toLowerCase() : "sys";
    return `${date}-${user}-${seq.toString().padStart(3, "0")}`;
  }

  private _formatSuccessResponse(
    pythonResponse: ValidateDatasetResponse,
    handlerResult: CallResult<ValidateDatasetResponse>
  ): DatasetValidationResponse {
    return {
      success: true,
      status: pythonResponse.status as "PASS" | "FAIL" | "WARNING",
      qualityScore: pythonResponse.quality_metrics?.quality_score,
      totalRows: pythonResponse.dataset_stats?.total_rows,
      validRows: pythonResponse.dataset_stats?.valid_rows,
      invalidRows: pythonResponse.dataset_stats?.invalid_rows,
      duration: handlerResult.duration,
    };
  }

  private _formatErrorResponse(
    handlerResult: CallResult<ValidateDatasetResponse>
  ): DatasetValidationResponse {
    return {
      success: false,
      duration: handlerResult.duration,
      error: handlerResult.error || "Unknown error",
    };
  }
}

// ============================================================================
// Cloud Function Wrapper (example for Firebase)
// ============================================================================

/**
 * Cloud Function that handles dataset validation requests.
 *
 * This would be deployed as:
 *   import * as functions from "firebase-functions";
 *   export const validateDataset = functions.https.onCall(validateDatasetHandler);
 */
export async function validateDatasetHandler(
  data: any,
  context: any
): Promise<DatasetValidationResponse> {
  const userId = context?.auth?.uid;

  // Create flow instance
  const flow = new DatasetValidationFlow("http://localhost:5000", userId);

  // Check if Python runtime is available
  const available = await flow.isAvailable();
  if (!available) {
    return {
      success: false,
      duration: 0,
      error: "Python runtime is not available",
    };
  }

  // Run validation flow
  return await flow.validateUploadedDataset({
    datasetPath: data.datasetPath,
    userId: userId,
    runName: data.runName,
  });
}

// ============================================================================
// Standalone Function (for testing/CLI)
// ============================================================================

/**
 * Standalone validation function for testing.
 */
export async function validateDatasetStandalone(
  datasetPath: string,
  userId?: string,
  runName?: string
): Promise<DatasetValidationResponse> {
  const flow = new DatasetValidationFlow("http://localhost:5000", userId);

  return await flow.validateUploadedDataset({
    datasetPath,
    userId,
    runName,
  });
}

export default DatasetValidationFlow;
