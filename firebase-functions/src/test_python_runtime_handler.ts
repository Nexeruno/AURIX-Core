/**
 * Python Runtime Handler Tests
 *
 * Demonstrates the unified handler for calling Python runtime.
 * Shows how the handler simplifies the complete flow:
 * - Request validation
 * - HTTP call
 * - Response validation
 * - Error handling
 *
 * Run: npx ts-node test_python_runtime_handler.ts
 */

import PythonRuntimeHandler, {
  createHandler,
  getDefaultHandler,
} from "./python_runtime_handler";
import {ValidateDatasetRequest, EvaluateModelRequest} from "./ml_runtime_client";


// ============================================================================
// Test Utilities
// ============================================================================

function printHeader(title: string): void {
  console.log(`\n${"=".repeat(80)}`);
  console.log(title);
  console.log("=".repeat(80));
}

function printTest(name: string): void {
  console.log(`\n▶ ${name}`);
}

function printResult(success: boolean, message: string): void {
  const status = success ? "✅ SUCCESS" : "❌ FAILED";
  console.log(`  ${status}: ${message}`);
}

// ============================================================================
// Test Cases
// ============================================================================

async function testValidateDatasetSuccess(): Promise<void> {
  printTest("Valid Dataset Validation");

  const handler = createHandler("http://localhost:5000");

  const request: ValidateDatasetRequest = {
    dataset_path: "gs://test-bucket/exports/handler-test-001.json",
    run_id: "handler-test-001",
    validation_level: "full",
  };

  console.log("\n--- Using unified handler ---\n");

  const result = await handler.validateDataset(request, {
    logName: "test-validate",
  });

  console.log("\n--- Handler Result ---");
  printResult(result.success, `Duration: ${result.duration}ms`);
  if (result.success) {
    console.log(`  Response status: ${result.data?.status}`);
    console.log(`  Quality score: ${result.data?.quality_metrics?.quality_score}`);
  } else {
    console.log(`  Error: ${result.error}`);
  }
}

async function testValidateDatasetInvalid(): Promise<void> {
  printTest("Invalid Dataset Validation (Missing Field)");

  const handler = createHandler("http://localhost:5000");

  const request: any = {
    // Missing dataset_path
    run_id: "handler-test-002",
    validation_level: "full",
  };

  console.log("\n--- Using unified handler ---\n");

  const result = await handler.validateDataset(request, {
    logName: "test-validate-invalid",
  });

  console.log("\n--- Handler Result ---");
  printResult(result.success, `Duration: ${result.duration}ms`);
  if (!result.success) {
    console.log(`  Error: ${result.error}`);
  }
}

async function testEvaluateModelSuccess(): Promise<void> {
  printTest("Valid Model Evaluation");

  const handler = createHandler("http://localhost:5000");

  const request: EvaluateModelRequest = {
    model_path: "gs://test-bucket/models/handler-test.pkl",
    validation_data_path: "gs://test-bucket/data/handler-test.json",
    run_id: "handler-eval-001",
  };

  console.log("\n--- Using unified handler ---\n");

  const result = await handler.evaluateModel(request, {
    logName: "test-evaluate",
  });

  console.log("\n--- Handler Result ---");
  printResult(result.success, `Duration: ${result.duration}ms`);
  if (result.success) {
    console.log(`  Response status: ${result.data?.status}`);
    console.log(`  Accuracy: ${result.data?.accuracy}`);
  } else {
    console.log(`  Error: ${result.error}`);
  }
}

async function testEvaluateModelInvalid(): Promise<void> {
  printTest("Invalid Model Evaluation (Missing Field)");

  const handler = createHandler("http://localhost:5000");

  const request: any = {
    model_path: "gs://bucket/model.pkl",
    // Missing validation_data_path
    run_id: "handler-eval-002",
  };

  console.log("\n--- Using unified handler ---\n");

  const result = await handler.evaluateModel(request, {
    logName: "test-evaluate-invalid",
  });

  console.log("\n--- Handler Result ---");
  printResult(result.success, `Duration: ${result.duration}ms`);
  if (!result.success) {
    console.log(`  Error: ${result.error}`);
  }
}

async function testHealthCheck(): Promise<void> {
  printTest("Health Check");

  const handler = getDefaultHandler();

  const isHealthy = await handler.healthCheck();

  if (isHealthy) {
    printResult(true, "Python runtime is healthy");
  } else {
    printResult(false, "Python runtime is not responding");
  }
}

async function testContractInfo(): Promise<void> {
  printTest("Get Contract Info");

  const handler = getDefaultHandler();

  const info = await handler.getContractInfo();

  if (info && info.endpoints) {
    printResult(true, `Got contract info with ${info.endpoints.length} endpoints`);
  } else {
    printResult(false, "Could not get contract info");
  }
}

async function demonstrateSimplifiedUsage(): Promise<void> {
  printHeader("SIMPLIFIED USAGE PATTERN");
  console.log("\nWith the unified handler, code is simpler:\n");

  console.log("BEFORE (manual steps):");
  console.log(`
  const client = new MLRuntimeClient("http://localhost:5000");
  const request = {...};

  try {
    // 1. Validate request manually
    validateRequest(request);

    // 2. Call Python runtime
    const response = await client.validateDataset(request);

    // 3. Validate response manually
    validateResponse(response);

    // 4. Use response
    console.log(response);
  } catch (error) {
    // 5. Handle error
    console.error(error);
  }
  `);

  console.log("\nAFTER (using unified handler):");
  console.log(`
  const handler = new PythonRuntimeHandler("http://localhost:5000");
  const request = {...};

  // All steps handled automatically
  const result = await handler.validateDataset(request);

  if (result.success) {
    console.log(result.data);
  } else {
    console.error(result.error);
  }
  `);

  console.log("\n✅ Handler abstracts all complexity:");
  console.log("   • Request validation");
  console.log("   • HTTP communication");
  console.log("   • Response validation");
  console.log("   • Error handling");
  console.log("   • Logging");
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests(): Promise<void> {
  printHeader("PYTHON RUNTIME HANDLER TEST SUITE");
  console.log("Testing unified wrapper for Python runtime calls");

  // Run tests
  await testHealthCheck();
  await new Promise((r) => setTimeout(r, 200));

  await testContractInfo();
  await new Promise((r) => setTimeout(r, 200));

  await testValidateDatasetSuccess();
  await new Promise((r) => setTimeout(r, 200));

  await testValidateDatasetInvalid();
  await new Promise((r) => setTimeout(r, 200));

  await testEvaluateModelSuccess();
  await new Promise((r) => setTimeout(r, 200));

  await testEvaluateModelInvalid();
  await new Promise((r) => setTimeout(r, 200));

  // Demonstrate simplified usage
  await demonstrateSimplifiedUsage();

  printHeader("HANDLER TEST SUMMARY");
  console.log("\n✅ All handler tests completed");
  console.log("\nKey benefits:");
  console.log("  • Single unified interface for all Python calls");
  console.log("  • Automatic validation (request + response)");
  console.log("  • Automatic error handling");
  console.log("  • Automatic logging");
  console.log("  • Consistent CallResult<T> return format");
  console.log("  • Easy to extend for new endpoints");
  console.log("\nUsage:");
  console.log("  const handler = new PythonRuntimeHandler();");
  console.log("  const result = await handler.validateDataset(request);");
  console.log("  const result = await handler.evaluateModel(request);");
}

// Run tests
runAllTests().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
