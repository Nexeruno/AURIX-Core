/**
 * Roundtrip Handshake Test
 *
 * Verifies complete request/response journey:
 * Node.js → Flask → Response → Node.js
 *
 * This test confirms:
 * 1. Request from Node.js reaches Flask app intact
 * 2. Request is validated correctly
 * 3. Response is generated correctly
 * 4. Response reaches Node.js intact
 *
 * Run: npx ts-node test_roundtrip_handshake.ts
 */

import MLRuntimeClient, {
  ValidateDatasetRequest,
  ValidateDatasetResponse,
  EvaluateModelRequest,
  EvaluateModelResponse,
} from "./ml_runtime_client";


// ============================================================================
// Test Utilities
// ============================================================================

interface RoundtripTestResult {
  name: string;
  success: boolean;
  requestSent: any;
  responsReceived: any;
  checks: {name: string; passed: boolean; detail: string}[];
  duration: number;
}

const results: RoundtripTestResult[] = [];

function printHeader(title: string): void {
  console.log(`\n${"=".repeat(80)}`);
  console.log(title);
  console.log("=".repeat(80));
}

function printTest(testName: string): void {
  console.log(`\n▶ ${testName}`);
}

function printCheck(name: string, passed: boolean, detail: string = ""): void {
  const status = passed ? "✅" : "❌";
  const msg = detail ? `${detail}` : "";
  console.log(`  ${status} ${name} ${msg}`);
}

function printRequest(request: any): void {
  console.log(`\n  REQUEST SENT:`);
  console.log(`  ${JSON.stringify(request, null, 4).split("\n").join("\n  ")}`);
}

function printResponse(response: any): void {
  console.log(`\n  RESPONSE RECEIVED:`);
  const responseStr = JSON.stringify(response, null, 4).split("\n").join("\n  ");
  // Limit output length
  const lines = responseStr.split("\n");
  if (lines.length > 20) {
    const shown = lines.slice(0, 15).join("\n");
    const hidden = lines.length - 15;
    console.log(`  ${shown}`);
    console.log(`  ... (${hidden} more lines)`);
  } else {
    console.log(`  ${responseStr}`);
  }
}

// ============================================================================
// Roundtrip Tests
// ============================================================================

async function testValidateDatasetRoundtrip(): Promise<void> {
  const testName = "Dataset Validation Roundtrip";
  printTest(testName);

  const startTime = Date.now();
  const checks: {name: string; passed: boolean; detail: string}[] = [];

  try {
    // Create request
    const request: ValidateDatasetRequest = {
      dataset_path: "gs://test-bucket/exports/roundtrip-test-001.json",
      run_id: "roundtrip-test-001",
      validation_level: "full",
      format: "json",
      timeout_seconds: 30,
    };

    printRequest(request);

    // STEP 1: Send request
    console.log("\n  SENDING REQUEST TO FLASK...");
    const client = new MLRuntimeClient("http://localhost:5000");
    const response: ValidateDatasetResponse = await client.validateDataset(request);

    printResponse(response);
    console.log("\n  RESPONSE RECEIVED FROM FLASK");

    // STEP 2: Verify request was understood (run_id is echoed back)
    console.log("\n  VERIFYING ROUNDTRIP:");

    const runIdMatch = response.run_id === request.run_id;
    checks.push({
      name: "Run ID matches",
      passed: runIdMatch,
      detail: `Expected: ${request.run_id}, Got: ${response.run_id}`,
    });
    printCheck("Run ID matches", runIdMatch, runIdMatch ? "✓" : "MISMATCH");

    // STEP 3: Verify response has required fields
    const hasStatus = !!response.status;
    checks.push({
      name: "Response has status",
      passed: hasStatus,
      detail: `Status: ${response.status}`,
    });
    printCheck("Response has status", hasStatus, response.status || "MISSING");

    const hasTimestamp = !!response.timestamp;
    checks.push({
      name: "Response has timestamp",
      passed: hasTimestamp,
      detail: `Timestamp: ${response.timestamp}`,
    });
    printCheck("Response has timestamp", hasTimestamp, response.timestamp || "MISSING");

    // STEP 4: Verify data integrity (quality metrics present)
    const hasQualityMetrics = !!response.quality_metrics;
    checks.push({
      name: "Quality metrics present",
      passed: hasQualityMetrics,
      detail: hasQualityMetrics
        ? `Score: ${response.quality_metrics?.quality_score}`
        : "MISSING",
    });
    printCheck("Quality metrics present", hasQualityMetrics);

    const hasDatasetStats = !!response.dataset_stats;
    checks.push({
      name: "Dataset stats present",
      passed: hasDatasetStats,
      detail: hasDatasetStats ? `Rows: ${response.dataset_stats?.total_rows}` : "MISSING",
    });
    printCheck("Dataset stats present", hasDatasetStats);

    // STEP 5: Verify data format
    const statusIsValid = ["PASS", "FAIL", "WARNING"].includes(response.status);
    checks.push({
      name: "Status has valid enum",
      passed: statusIsValid,
      detail: `Status: ${response.status}`,
    });
    printCheck("Status has valid enum", statusIsValid);

    // STEP 6: Verify metrics are in valid ranges
    const accuracyInRange =
      response.quality_metrics && response.quality_metrics.quality_score >= 0 &&
      response.quality_metrics.quality_score <= 1;
    checks.push({
      name: "Quality score in range [0,1]",
      passed: accuracyInRange,
      detail: `Score: ${response.quality_metrics?.quality_score}`,
    });
    printCheck("Quality score in range", accuracyInRange);

    // All checks passed?
    const allPassed = checks.every((c) => c.passed);

    const duration = Date.now() - startTime;
    results.push({
      name: testName,
      success: allPassed,
      requestSent: request,
      responsReceived: response,
      checks,
      duration,
    });

    if (allPassed) {
      console.log(`\n  ✅ ROUNDTRIP SUCCESSFUL (${duration}ms)`);
    } else {
      console.log(
        `\n  ❌ ROUNDTRIP FAILED (${checks.filter((c) => !c.passed).length} checks failed)`
      );
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`\n  ❌ ERROR: ${errorMsg}`);

    checks.push({
      name: "Request succeeded",
      passed: false,
      detail: errorMsg,
    });

    const duration = Date.now() - startTime;
    results.push({
      name: testName,
      success: false,
      requestSent: {},
      responsReceived: null,
      checks,
      duration,
    });
  }
}

async function testEvaluateModelRoundtrip(): Promise<void> {
  const testName = "Model Evaluation Roundtrip";
  printTest(testName);

  const startTime = Date.now();
  const checks: {name: string; passed: boolean; detail: string}[] = [];

  try {
    // Create request
    const request: EvaluateModelRequest = {
      model_path: "gs://test-bucket/models/roundtrip-test.pkl",
      validation_data_path: "gs://test-bucket/data/roundtrip-test.json",
      run_id: "roundtrip-eval-001",
    };

    printRequest(request);

    // STEP 1: Send request
    console.log("\n  SENDING REQUEST TO FLASK...");
    const client = new MLRuntimeClient("http://localhost:5000");
    const response: EvaluateModelResponse = await client.evaluateModel(request);

    printResponse(response);
    console.log("\n  RESPONSE RECEIVED FROM FLASK");

    // STEP 2: Verify request was understood
    console.log("\n  VERIFYING ROUNDTRIP:");

    const runIdMatch = response.run_id === request.run_id;
    checks.push({
      name: "Run ID matches",
      passed: runIdMatch,
      detail: `Expected: ${request.run_id}, Got: ${response.run_id}`,
    });
    printCheck("Run ID matches", runIdMatch, runIdMatch ? "✓" : "MISMATCH");

    // STEP 3: Verify response has required fields
    const hasStatus = !!response.status;
    checks.push({
      name: "Response has status",
      passed: hasStatus,
      detail: `Status: ${response.status}`,
    });
    printCheck("Response has status", hasStatus, response.status || "MISSING");

    const hasAccuracy = response.accuracy !== undefined;
    checks.push({
      name: "Response has accuracy",
      passed: hasAccuracy,
      detail: `Accuracy: ${response.accuracy}`,
    });
    printCheck("Response has accuracy", hasAccuracy, response.accuracy !== undefined ? "✓" : "MISSING");

    const hasTimestamp = !!response.timestamp;
    checks.push({
      name: "Response has timestamp",
      passed: hasTimestamp,
      detail: `Timestamp: ${response.timestamp}`,
    });
    printCheck("Response has timestamp", hasTimestamp, response.timestamp || "MISSING");

    // STEP 4: Verify data integrity
    const hasMetrics =
      response.precision !== undefined ||
      response.recall !== undefined ||
      response.f1_score !== undefined;
    checks.push({
      name: "Performance metrics present",
      passed: hasMetrics,
      detail: hasMetrics
        ? `F1: ${response.f1_score}, Accuracy: ${response.accuracy}`
        : "MISSING",
    });
    printCheck("Performance metrics present", hasMetrics);

    // STEP 5: Verify data format
    const statusIsValid = ["PASS", "FAIL", "WARNING"].includes(response.status);
    checks.push({
      name: "Status has valid enum",
      passed: statusIsValid,
      detail: `Status: ${response.status}`,
    });
    printCheck("Status has valid enum", statusIsValid);

    // STEP 6: Verify metrics are in valid ranges
    const accuracyInRange = response.accuracy >= 0 && response.accuracy <= 1;
    checks.push({
      name: "Accuracy in range [0,1]",
      passed: accuracyInRange,
      detail: `Accuracy: ${response.accuracy}`,
    });
    printCheck("Accuracy in range", accuracyInRange);

    // All checks passed?
    const allPassed = checks.every((c) => c.passed);

    const duration = Date.now() - startTime;
    results.push({
      name: testName,
      success: allPassed,
      requestSent: request,
      responsReceived: response,
      checks,
      duration,
    });

    if (allPassed) {
      console.log(`\n  ✅ ROUNDTRIP SUCCESSFUL (${duration}ms)`);
    } else {
      console.log(
        `\n  ❌ ROUNDTRIP FAILED (${checks.filter((c) => !c.passed).length} checks failed)`
      );
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`\n  ❌ ERROR: ${errorMsg}`);

    checks.push({
      name: "Request succeeded",
      passed: false,
      detail: errorMsg,
    });

    const duration = Date.now() - startTime;
    results.push({
      name: testName,
      success: false,
      requestSent: {},
      responsReceived: null,
      checks,
      duration,
    });
  }
}

async function testMultipleRoundtrips(): Promise<void> {
  const testName = "Multiple Consecutive Roundtrips";
  printTest(testName);

  const startTime = Date.now();
  const checks: {name: string; passed: boolean; detail: string}[] = [];

  try {
    const client = new MLRuntimeClient("http://localhost:5000");

    // Send 3 requests and verify all succeed
    console.log("\n  Sending 3 consecutive requests...");

    const requests = [
      {
        id: "trip-1",
        type: "dataset",
        request: {
          dataset_path: "gs://bucket/data1.json",
          run_id: "multi-test-001",
        } as ValidateDatasetRequest,
      },
      {
        id: "trip-2",
        type: "evaluate",
        request: {
          model_path: "gs://bucket/model1.pkl",
          validation_data_path: "gs://bucket/data1.json",
          run_id: "multi-test-002",
        } as EvaluateModelRequest,
      },
      {
        id: "trip-3",
        type: "dataset",
        request: {
          dataset_path: "gs://bucket/data2.json",
          run_id: "multi-test-003",
          validation_level: "quick",
        } as ValidateDatasetRequest,
      },
    ];

    let successCount = 0;
    for (const {id, type, request} of requests) {
      try {
        let response;
        if (type === "dataset") {
          response = await client.validateDataset(
            request as ValidateDatasetRequest
          );
        } else {
          response = await client.evaluateModel(
            request as EvaluateModelRequest
          );
        }

        const matched = response.run_id === request.run_id;
        console.log(`    ✓ ${id}: ${type} request roundtrip (${matched ? "✓" : "✗"})`);
        if (matched) successCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`    ✗ ${id}: ${msg}`);
      }
    }

    const allSucceeded = successCount === requests.length;
    checks.push({
      name: "All requests succeeded",
      passed: allSucceeded,
      detail: `${successCount}/${requests.length} requests succeeded`,
    });
    printCheck("All requests succeeded", allSucceeded);

    const duration = Date.now() - startTime;
    results.push({
      name: testName,
      success: allSucceeded,
      requestSent: {count: requests.length},
      responsReceived: {successCount},
      checks,
      duration,
    });

    if (allSucceeded) {
      console.log(`\n  ✅ ALL ROUNDTRIPS SUCCESSFUL (${duration}ms)`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`\n  ❌ ERROR: ${errorMsg}`);

    const duration = Date.now() - startTime;
    results.push({
      name: testName,
      success: false,
      requestSent: {},
      responsReceived: null,
      checks: [{name: "Request succeeded", passed: false, detail: errorMsg}],
      duration,
    });
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests(): Promise<void> {
  printHeader("ROUNDTRIP HANDSHAKE VERIFICATION");
  console.log("Testing: Node.js Request → Flask → Response → Node.js");
  console.log("Server: http://localhost:5000");

  // Run tests
  await testValidateDatasetRoundtrip();
  await new Promise((r) => setTimeout(r, 200));

  await testEvaluateModelRoundtrip();
  await new Promise((r) => setTimeout(r, 200));

  await testMultipleRoundtrips();

  // Print summary
  printHeader("ROUNDTRIP SUMMARY");

  const totalTests = results.length;
  const passedTests = results.filter((r) => r.success).length;

  results.forEach((result) => {
    const status = result.success ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} ${result.name} (${result.duration}ms)`);

    // Show failed checks
    if (!result.success) {
      result.checks.forEach((check) => {
        if (!check.passed) {
          console.log(`       ❌ ${check.name}: ${check.detail}`);
        }
      });
    }
  });

  console.log(`\n${"=".repeat(80)}`);
  console.log(`TOTAL: ${passedTests}/${totalTests} roundtrips successful`);
  console.log("=".repeat(80));

  if (passedTests === totalTests) {
    console.log("\n✅ ALL ROUNDTRIPS VERIFIED - Request/Response Integrity Confirmed!");
  } else {
    console.log(`\n❌ ${totalTests - passedTests} roundtrip(s) failed`);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
