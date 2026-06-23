/**
 * ML Runtime Client Tests
 *
 * Tests local communication with Python ML Runtime Flask app.
 * Verifies that the Firebase/Node.js backend can call the Python runtime.
 *
 * Prerequisites:
 *   Flask app running at http://localhost:5000
 *
 * Run: npx ts-node test_ml_runtime_client.ts
 */

import MLRuntimeClient, {
  ValidateDatasetRequest,
  ValidateDatasetResponse,
  EvaluateModelRequest,
  EvaluateModelResponse,
} from "./ml_runtime_client";


// ============================================================================
// Test Helpers
// ============================================================================

function printHeader(title: string): void {
  console.log(`\n${"=".repeat(70)}`);
  console.log(title);
  console.log("=".repeat(70));
}

function printTest(testName: string): void {
  console.log(`\n▶ ${testName}`);
}

function printResult(passed: boolean, message: string): void {
  const status = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`  ${status}: ${message}`);
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Test Suite
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

async function testHealthCheck(): Promise<void> {
  printTest("Health Check");

  try {
    const client = new MLRuntimeClient("http://localhost:5000");
    const isHealthy = await client.healthCheck();

    if (isHealthy) {
      printResult(true, "Flask app is healthy");
      results.push({name: "Health Check", passed: true, message: "Flask app is healthy"});
    } else {
      printResult(false, "Flask app returned unhealthy status");
      results.push({name: "Health Check", passed: false, message: "Unhealthy"});
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    printResult(false, `Error: ${message}`);
    results.push({name: "Health Check", passed: false, message});
  }
}

async function testContractInfo(): Promise<void> {
  printTest("Get Contract Info");

  try {
    const client = new MLRuntimeClient("http://localhost:5000");
    const info = await client.getContractInfo();

    if (info && info.endpoints && Array.isArray(info.endpoints)) {
      printResult(true, `Retrieved contract info with ${info.endpoints.length} endpoints`);
      results.push({name: "Contract Info", passed: true, message: "Retrieved successfully"});
    } else {
      printResult(false, "Invalid contract info structure");
      results.push({name: "Contract Info", passed: false, message: "Invalid structure"});
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    printResult(false, `Error: ${message}`);
    results.push({name: "Contract Info", passed: false, message});
  }
}

async function testValidateDatasetSuccess(): Promise<void> {
  printTest("Validate Dataset - Valid Request");

  try {
    const client = new MLRuntimeClient("http://localhost:5000");
    const request: ValidateDatasetRequest = {
      dataset_path: "gs://evidence-bucket/exports/dataset-20260607.json",
      run_id: "20260607-val-001",
      validation_level: "full",
      format: "json",
    };

    console.log("  Request:", JSON.stringify(request, null, 2));

    const response: ValidateDatasetResponse = await client.validateDataset(request);

    console.log(`  Response status: ${response.status}`);
    console.log(`  Quality score: ${response.quality_metrics?.quality_score || "N/A"}`);

    if (response.status === "PASS" && response.run_id === request.run_id) {
      printResult(true, "Valid dataset request succeeded");
      results.push({name: "Validate Dataset (Valid)", passed: true, message: "Success"});
    } else {
      printResult(false, "Invalid response format");
      results.push({name: "Validate Dataset (Valid)", passed: false, message: "Invalid format"});
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    printResult(false, `Error: ${message}`);
    results.push({name: "Validate Dataset (Valid)", passed: false, message});
  }
}

async function testValidateDatasetInvalid(): Promise<void> {
  printTest("Validate Dataset - Invalid Request (Missing Required)");

  try {
    const client = new MLRuntimeClient("http://localhost:5000");
    const request: any = {
      run_id: "20260607-val-001",
      // Missing: dataset_path
    };

    console.log("  Request (invalid):", JSON.stringify(request, null, 2));

    const response = await client.validateDataset(request);
    printResult(false, "Should have rejected invalid request");
    results.push({name: "Validate Dataset (Invalid)", passed: false, message: "Not rejected"});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("dataset_path")) {
      printResult(true, `Correctly rejected: ${message}`);
      results.push({name: "Validate Dataset (Invalid)", passed: true, message: "Rejected"});
    } else {
      printResult(false, `Wrong error: ${message}`);
      results.push({name: "Validate Dataset (Invalid)", passed: false, message});
    }
  }
}

async function testEvaluateModelSuccess(): Promise<void> {
  printTest("Evaluate Model - Valid Request");

  try {
    const client = new MLRuntimeClient("http://localhost:5000");
    const request: EvaluateModelRequest = {
      model_path: "gs://evidence-bucket/models/v3.3/model.pkl",
      validation_data_path: "gs://evidence-bucket/data/validation.json",
      run_id: "20260607-eval-001",
    };

    console.log("  Request:", JSON.stringify(request, null, 2));

    const response: EvaluateModelResponse = await client.evaluateModel(request);

    console.log(`  Response status: ${response.status}`);
    console.log(`  Accuracy: ${response.accuracy}`);
    console.log(`  F1 score: ${response.f1_score || "N/A"}`);

    if (response.status === "PASS" && response.accuracy >= 0 && response.accuracy <= 1) {
      printResult(true, "Valid evaluate request succeeded");
      results.push({name: "Evaluate Model (Valid)", passed: true, message: "Success"});
    } else {
      printResult(false, "Invalid response format");
      results.push({name: "Evaluate Model (Valid)", passed: false, message: "Invalid format"});
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    printResult(false, `Error: ${message}`);
    results.push({name: "Evaluate Model (Valid)", passed: false, message});
  }
}

async function testEvaluateModelInvalid(): Promise<void> {
  printTest("Evaluate Model - Invalid Request (Missing Required)");

  try {
    const client = new MLRuntimeClient("http://localhost:5000");
    const request: any = {
      model_path: "gs://bucket/model.pkl",
      // Missing: validation_data_path
    };

    console.log("  Request (invalid):", JSON.stringify(request, null, 2));

    const response = await client.evaluateModel(request);
    printResult(false, "Should have rejected invalid request");
    results.push({name: "Evaluate Model (Invalid)", passed: false, message: "Not rejected"});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("validation_data_path")) {
      printResult(true, `Correctly rejected: ${message}`);
      results.push({name: "Evaluate Model (Invalid)", passed: true, message: "Rejected"});
    } else {
      printResult(false, `Wrong error: ${message}`);
      results.push({name: "Evaluate Model (Invalid)", passed: false, message});
    }
  }
}

async function testLocalHandshake(): Promise<void> {
  printTest("Local Firebase/Node -> Python Handshake");

  try {
    const client = new MLRuntimeClient("http://localhost:5000");

    console.log(`  Connecting to: ${client.getBaseUrl()}`);

    // Step 1: Health check
    const isHealthy = await client.healthCheck();
    if (!isHealthy) {
      throw new Error("Flask app is not healthy");
    }
    console.log("  ✓ Flask app is healthy");

    // Step 2: Get contract info
    const info = await client.getContractInfo();
    console.log(`  ✓ Got contract info (${info.endpoints?.length || 0} endpoints)`);

    // Step 3: Make a real request
    const dataset_result = await client.validateDataset({
      dataset_path: "gs://bucket/dataset.json",
      run_id: "local-test-001",
    });
    console.log(`  ✓ Dataset validation succeeded (status: ${dataset_result.status})`);

    // Step 4: Make another real request
    const eval_result = await client.evaluateModel({
      model_path: "gs://bucket/model.pkl",
      validation_data_path: "gs://bucket/data.json",
      run_id: "local-test-002",
    });
    console.log(`  ✓ Model evaluation succeeded (accuracy: ${eval_result.accuracy})`);

    printResult(true, "Complete handshake successful");
    results.push({
      name: "Local Firebase/Node -> Python Handshake",
      passed: true,
      message: "All steps succeeded",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    printResult(false, `Error: ${message}`);
    results.push({
      name: "Local Firebase/Node -> Python Handshake",
      passed: false,
      message,
    });
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests(): Promise<void> {
  printHeader("ML RUNTIME CLIENT TEST SUITE");
  console.log(`Testing local Firebase/Node.js -> Python Communication`);
  console.log(`Server: http://localhost:5000`);

  // Run tests sequentially
  await testHealthCheck();
  await delay(100);

  await testContractInfo();
  await delay(100);

  await testValidateDatasetSuccess();
  await delay(100);

  await testValidateDatasetInvalid();
  await delay(100);

  await testEvaluateModelSuccess();
  await delay(100);

  await testEvaluateModelInvalid();
  await delay(100);

  await testLocalHandshake();

  // Print summary
  printHeader("TEST SUMMARY");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  results.forEach((result) => {
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${status}: ${result.name}`);
  });

  console.log(`\n${"=".repeat(70)}`);
  console.log(`Total: ${passed}/${results.length} passed`);
  console.log("=".repeat(70));

  if (failed === 0) {
    console.log(
      "\n✅ ALL TESTS PASSED - Firebase/Node can call Python Runtime locally!"
    );
  } else {
    console.log(`\n❌ ${failed} test(s) failed`);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
