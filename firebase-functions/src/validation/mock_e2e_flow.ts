/**
 * Mock End-to-End Contract Flow
 *
 * Simulates the complete request/response cycle between Firebase and Python ML Runtime:
 * 1. Firebase prepares request
 * 2. Request validation
 * 3. Mock Python processes and returns response
 * 4. Response validation
 * 5. Success/failure reporting
 *
 * This is a LOCAL mock flow with no actual HTTP calls.
 */

import { RequestValidator, ResponseValidator, ValidationError } from "./RequestValidator";
import { ValidationErrorFormatter } from "./ErrorFormatter";


interface FlowResult {
  endpoint: string;
  request: any;
  request_valid: boolean;
  request_errors: Array<{ field: string; message: string }>;
  response: any | null;
  response_valid: boolean;
  response_errors: Array<{ field: string; message: string }>;
  final_status: "SUCCESS" | "FAILED";
}


class MockPythonRuntime {
  /**
   * Mock implementation of dataset validation.
   *
   * Simulates the Python runtime processing a dataset validation request.
   * Returns a mock response with realistic data.
   */
  static validateDataset(request: any): any {
    const runId = request.run_id || `mock-${Date.now()}`;

    // Simulate dataset processing
    return {
      run_id: runId,
      status: "PASS",
      timestamp: new Date().toISOString(),
      dataset_stats: {
        total_rows: 8247,
        valid_rows: 8211,
        invalid_rows: 36,
        valid_percentage: 99.56,
        unique_users: 1847,
        date_range: {
          start: "2024-01-01",
          end: "2026-06-07"
        }
      },
      schema_validation: {
        feature_count: 12,
        all_features_present: true,
        extra_fields: 0
      },
      quality_metrics: {
        quality_score: 0.9956,
        completeness_percent: 99.99,
        validity_percent: 99.56
      },
      quality_gates: {
        all_gates_passed: true
      },
      recommendations: [
        "Dataset is ready for training",
        "Consider removing 36 rows with predictedTotal ≤ 0"
      ]
    };
  }

  /**
   * Mock implementation of model evaluation.
   *
   * Simulates the Python runtime processing a model evaluation request.
   * Returns a mock response with realistic metrics.
   */
  static evaluateModel(request: any): any {
    const runId = request.run_id || `mock-${Date.now()}`;

    // Simulate model evaluation
    return {
      run_id: runId,
      status: "PASS",
      accuracy: 0.942,
      f1_score: 0.931,
      timestamp: new Date().toISOString()
    };
  }
}


class MockEndToEndFlow {
  /**
   * Complete mock flow for dataset validation.
   *
   * Returns:
   *   [success, result_data, log_messages]
   */
  static flowValidateDataset(
    request: any
  ): [boolean, FlowResult, string[]] {
    const logs: string[] = [];
    const result: FlowResult = {
      endpoint: "POST /api/ml/validate-dataset",
      request: request,
      request_valid: false,
      request_errors: [],
      response: null,
      response_valid: false,
      response_errors: [],
      final_status: "FAILED"
    };

    // STEP 1: Firebase prepares request
    logs.push("📋 STEP 1: Firebase prepares request");
    logs.push(`   Request: ${JSON.stringify(request, null, 2)}`);

    // STEP 2: Firebase validates request
    logs.push("\n✓ STEP 2: Firebase validates request");
    const [isValid, errors] = RequestValidator.validateDatasetRequest(request);
    result.request_valid = isValid;
    result.request_errors = errors.map((e) => ({
      field: e.field,
      message: e.message
    }));

    if (!isValid) {
      logs.push(`   ❌ Request validation FAILED`);
      logs.push(`   ${ValidationErrorFormatter.formatAllErrors(errors)}`);
      return [false, result, logs];
    }

    logs.push(`   ✓ Request validation PASSED`);

    // STEP 3: Mock Python processes and returns response
    logs.push("\n🐍 STEP 3: Mock Python runtime processes");
    const response = MockPythonRuntime.validateDataset(request);
    result.response = response;
    logs.push(`   Response: ${JSON.stringify(response, null, 2)}`);

    // STEP 4: Firebase validates response
    logs.push("\n✓ STEP 4: Firebase validates response");
    const [respValid, respErrors] = ResponseValidator.validateDatasetResponse(
      response
    );
    result.response_valid = respValid;
    result.response_errors = respErrors.map((e) => ({
      field: e.field,
      message: e.message
    }));

    if (!respValid) {
      logs.push(`   ❌ Response validation FAILED`);
      logs.push(`   ${ValidationErrorFormatter.formatAllErrors(respErrors)}`);
      return [false, result, logs];
    }

    logs.push(`   ✓ Response validation PASSED`);

    // STEP 5: Success
    logs.push("\n✅ SUCCESS: Complete flow validated");
    result.final_status = "SUCCESS";
    return [true, result, logs];
  }

  /**
   * Complete mock flow for model evaluation.
   *
   * Returns:
   *   [success, result_data, log_messages]
   */
  static flowEvaluateModel(request: any): [boolean, FlowResult, string[]] {
    const logs: string[] = [];
    const result: FlowResult = {
      endpoint: "POST /api/ml/evaluate",
      request: request,
      request_valid: false,
      request_errors: [],
      response: null,
      response_valid: false,
      response_errors: [],
      final_status: "FAILED"
    };

    // STEP 1: Firebase prepares request
    logs.push("📋 STEP 1: Firebase prepares request");
    logs.push(`   Request: ${JSON.stringify(request, null, 2)}`);

    // STEP 2: Firebase validates request
    logs.push("\n✓ STEP 2: Firebase validates request");
    const [isValid, errors] = RequestValidator.validateEvaluateRequest(
      request
    );
    result.request_valid = isValid;
    result.request_errors = errors.map((e) => ({
      field: e.field,
      message: e.message
    }));

    if (!isValid) {
      logs.push(`   ❌ Request validation FAILED`);
      logs.push(`   ${ValidationErrorFormatter.formatAllErrors(errors)}`);
      return [false, result, logs];
    }

    logs.push(`   ✓ Request validation PASSED`);

    // STEP 3: Mock Python processes and returns response
    logs.push("\n🐍 STEP 3: Mock Python runtime processes");
    const response = MockPythonRuntime.evaluateModel(request);
    result.response = response;
    logs.push(`   Response: ${JSON.stringify(response, null, 2)}`);

    // STEP 4: Firebase validates response
    logs.push("\n✓ STEP 4: Firebase validates response");
    const [respValid, respErrors] = ResponseValidator.validateEvaluateResponse(
      response
    );
    result.response_valid = respValid;
    result.response_errors = respErrors.map((e) => ({
      field: e.field,
      message: e.message
    }));

    if (!respValid) {
      logs.push(`   ❌ Response validation FAILED`);
      logs.push(`   ${ValidationErrorFormatter.formatAllErrors(respErrors)}`);
      return [false, result, logs];
    }

    logs.push(`   ✓ Response validation PASSED`);

    // STEP 5: Success
    logs.push("\n✅ SUCCESS: Complete flow validated");
    result.final_status = "SUCCESS";
    return [true, result, logs];
  }
}


// ============================================================================
// TEST SCENARIOS
// ============================================================================

function printFlowResult(
  endpointName: string,
  success: boolean,
  result: FlowResult,
  logs: string[]
) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`ENDPOINT: ${endpointName}`);
  console.log("=".repeat(70));

  logs.forEach((log) => console.log(log));

  console.log(`\n${"=".repeat(70)}`);
  console.log(`SUMMARY: ${result.final_status}`);
  console.log("=".repeat(70));
  console.log(`  Request Valid: ${result.request_valid}`);
  console.log(`  Response Valid: ${result.response_valid}`);
  console.log(`  Overall: ${success ? "✅ PASS" : "❌ FAIL"}`);
}


// Main execution (if running directly)
if (require.main === module) {
  console.log("\n" + "=".repeat(70));
  console.log("MOCK END-TO-END CONTRACT FLOWS");
  console.log("=".repeat(70));

  // ========================================================================
  // TEST 1: Valid dataset validation request/response
  // ========================================================================

  console.log("\n🧪 TEST 1: Dataset Validation - VALID REQUEST/RESPONSE");

  const validDatasetRequest = {
    dataset_path: "gs://bucket/exports/dataset-20260607.json",
    run_id: "20260607-val-001",
    validation_level: "full",
    format: "json"
  };

  const [success1, result1, logs1] = MockEndToEndFlow.flowValidateDataset(
    validDatasetRequest
  );
  printFlowResult("POST /api/ml/validate-dataset", success1, result1, logs1);

  // ========================================================================
  // TEST 2: Invalid dataset validation request
  // ========================================================================

  console.log(
    "\n\n🧪 TEST 2: Dataset Validation - INVALID REQUEST (missing field)"
  );

  const invalidDatasetRequest = {
    run_id: "20260607-val-001",
    validation_level: "full"
    // Missing: dataset_path
  };

  const [success2, result2, logs2] = MockEndToEndFlow.flowValidateDataset(
    invalidDatasetRequest
  );
  printFlowResult("POST /api/ml/validate-dataset", success2, result2, logs2);

  // ========================================================================
  // TEST 3: Valid model evaluation request/response
  // ========================================================================

  console.log(
    "\n\n🧪 TEST 3: Model Evaluation - VALID REQUEST/RESPONSE"
  );

  const validEvaluateRequest = {
    model_path: "gs://bucket/models/v3.3/model.pkl",
    validation_data_path: "gs://bucket/data/validation.json",
    run_id: "20260607-eval-001"
  };

  const [success3, result3, logs3] = MockEndToEndFlow.flowEvaluateModel(
    validEvaluateRequest
  );
  printFlowResult("POST /api/ml/evaluate", success3, result3, logs3);

  // ========================================================================
  // TEST 4: Invalid model evaluation request
  // ========================================================================

  console.log(
    "\n\n🧪 TEST 4: Model Evaluation - INVALID REQUEST (missing field)"
  );

  const invalidEvaluateRequest = {
    validation_data_path: "gs://bucket/data/validation.json",
    run_id: "20260607-eval-001"
    // Missing: model_path
  };

  const [success4, result4, logs4] = MockEndToEndFlow.flowEvaluateModel(
    invalidEvaluateRequest
  );
  printFlowResult("POST /api/ml/evaluate", success4, result4, logs4);

  // ========================================================================
  // TEST SUMMARY
  // ========================================================================

  console.log("\n\n" + "=".repeat(70));
  console.log("ALL TESTS COMPLETE");
  console.log("=".repeat(70));
  console.log(`
✅ E2E Flow Summary:
  1. Firebase prepares request
  2. Request validation (local, no HTTP)
  3. Mock Python processes
  4. Response validation (local, no HTTP)
  5. Success/failure reported

All tests demonstrate the complete contract flow
without actual HTTP calls or Python runtime.
`);
}

export { MockEndToEndFlow, MockPythonRuntime, FlowResult };
