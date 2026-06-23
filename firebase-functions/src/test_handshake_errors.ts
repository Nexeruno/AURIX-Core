/**
 * Handshake Error Handling Tests
 *
 * Tests error scenarios in the Firebase/Node.js → Python handshake:
 * 1. Request validation failures
 * 2. Response validation failures
 * 3. Network/timeout errors
 * 4. Unexpected errors
 *
 * Verifies that errors are caught and reported clearly.
 *
 * Run: npx ts-node test_handshake_errors.ts
 */

import MLRuntimeClient, {
  ValidateDatasetRequest,
  EvaluateModelRequest,
} from "./ml_runtime_client";
import {HandshakeLogger} from "./handshake_logger";


// ============================================================================
// Test Utilities
// ============================================================================

interface ErrorTestResult {
  name: string;
  errorType: string;
  errorMessage: string;
  isCaught: boolean;
  messageIsReadable: boolean;
}

const results: ErrorTestResult[] = [];

function printHeader(title: string): void {
  console.log(`\n${"=".repeat(80)}`);
  console.log(title);
  console.log("=".repeat(80));
}

function printTest(testName: string): void {
  console.log(`\n▶ ${testName}`);
}

function printError(error: string): void {
  console.log(`  Error caught: ${error}`);
}

function isReadableError(msg: string): boolean {
  // Readable if it contains:
  // - Field names (dataset_path, model_path, etc.)
  // - Clear action (is required, must be, etc.)
  // - No stack traces or cryptic codes
  return (
    msg &&
    (msg.includes("dataset_path") ||
      msg.includes("model_path") ||
      msg.includes("required") ||
      msg.includes("must be") ||
      msg.includes("invalid") ||
      msg.includes("Expected") ||
      msg.includes("Got")) &&
    !msg.includes("at ") &&
    !msg.includes("Error:") // At least describe the problem
  );
}

// ============================================================================
// Error Test Cases
// ============================================================================

async function testMissingRequiredField(): Promise<void> {
  const testName = "Request Validation: Missing Required Field";
  printTest(testName);

  const logger = new HandshakeLogger("error-test-1", true);

  try {
    const client = new MLRuntimeClient("http://localhost:5000");

    // Missing required dataset_path
    const request: any = {
      run_id: "error-test-001",
      validation_level: "full",
      // Missing: dataset_path
    };

    logger.logRequestSent(request);
    logger.logError("Request validation failed: dataset_path is required");

    const response = await client.validateDataset(request);
    printError("ERROR: Should have rejected invalid request!");
    results.push({
      name: testName,
      errorType: "NOT_CAUGHT",
      errorMessage: "Request was not rejected",
      isCaught: false,
      messageIsReadable: false,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    printError(errorMsg);

    const isCaught = true;
    const isReadable = isReadableError(errorMsg);
    const icon = isReadable ? "✓" : "✗";

    console.log(`  ${icon} Message is ${isReadable ? "readable" : "not readable"}`);

    results.push({
      name: testName,
      errorType: "ValidationError",
      errorMessage: errorMsg,
      isCaught,
      messageIsReadable: isReadable,
    });

    logger.logError(errorMsg);
    logger.logSummary(false, 50);
  }
}

async function testWrongFieldType(): Promise<void> {
  const testName = "Request Validation: Wrong Field Type";
  printTest(testName);

  const logger = new HandshakeLogger("error-test-2", true);

  try {
    const client = new MLRuntimeClient("http://localhost:5000");

    // dataset_path should be string, not number
    const request: any = {
      dataset_path: 12345, // Should be string!
      run_id: "error-test-002",
    };

    logger.logRequestSent({...request, dataset_path: "(invalid type)"});

    const response = await client.validateDataset(request);
    printError("ERROR: Should have rejected invalid type!");

    results.push({
      name: testName,
      errorType: "NOT_CAUGHT",
      errorMessage: "Request with wrong type was not rejected",
      isCaught: false,
      messageIsReadable: false,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    printError(errorMsg);

    const isCaught = true;
    const isReadable = isReadableError(errorMsg);
    const icon = isReadable ? "✓" : "✗";

    console.log(`  ${icon} Message is ${isReadable ? "readable" : "not readable"}`);

    results.push({
      name: testName,
      errorType: "TypeError",
      errorMessage: errorMsg,
      isCaught,
      messageIsReadable: isReadable,
    });

    logger.logError(errorMsg);
    logger.logSummary(false, 45);
  }
}

async function testInvalidGcsPath(): Promise<void> {
  const testName = "Request Validation: Invalid GCS Path";
  printTest(testName);

  const logger = new HandshakeLogger("error-test-3", true);

  try {
    const client = new MLRuntimeClient("http://localhost:5000");

    // Invalid GCS path (missing gs://)
    const request: any = {
      dataset_path: "/local/path/file.json", // Should start with gs://
      run_id: "error-test-003",
    };

    logger.logRequestSent({...request, dataset_path: "(bad GCS path)"});

    const response = await client.validateDataset(request);
    printError("ERROR: Should have rejected invalid GCS path!");

    results.push({
      name: testName,
      errorType: "NOT_CAUGHT",
      errorMessage: "Invalid GCS path was not rejected",
      isCaught: false,
      messageIsReadable: false,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    printError(errorMsg);

    const isCaught = true;
    const isReadable = isReadableError(errorMsg) || errorMsg.includes("gs://");
    const icon = isReadable ? "✓" : "✗";

    console.log(`  ${icon} Message is ${isReadable ? "readable" : "not readable"}`);

    results.push({
      name: testName,
      errorType: "FormatError",
      errorMessage: errorMsg,
      isCaught,
      messageIsReadable: isReadable,
    });

    logger.logError(errorMsg);
    logger.logSummary(false, 55);
  }
}

async function testEvaluateMissingField(): Promise<void> {
  const testName = "Evaluate Validation: Missing validation_data_path";
  printTest(testName);

  const logger = new HandshakeLogger("error-test-4", true);

  try {
    const client = new MLRuntimeClient("http://localhost:5000");

    // Missing required validation_data_path
    const request: any = {
      model_path: "gs://bucket/model.pkl",
      run_id: "error-test-004",
      // Missing: validation_data_path
    };

    logger.logRequestSent(request);

    const response = await client.evaluateModel(request);
    printError("ERROR: Should have rejected invalid request!");

    results.push({
      name: testName,
      errorType: "NOT_CAUGHT",
      errorMessage: "Request was not rejected",
      isCaught: false,
      messageIsReadable: false,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    printError(errorMsg);

    const isCaught = true;
    const isReadable = isReadableError(errorMsg);
    const icon = isReadable ? "✓" : "✗";

    console.log(`  ${icon} Message is ${isReadable ? "readable" : "not readable"}`);

    results.push({
      name: testName,
      errorType: "ValidationError",
      errorMessage: errorMsg,
      isCaught,
      messageIsReadable: isReadable,
    });

    logger.logError(errorMsg);
    logger.logSummary(false, 48);
  }
}

async function testServerConnectionError(): Promise<void> {
  const testName = "Network Error: Server Unreachable";
  printTest(testName);

  const logger = new HandshakeLogger("error-test-5", true);

  try {
    // Connect to wrong host (should fail)
    const client = new MLRuntimeClient("http://localhost:9999");

    const request: ValidateDatasetRequest = {
      dataset_path: "gs://bucket/file.json",
      run_id: "error-test-005",
    };

    logger.logRequestSent(request);

    const response = await client.validateDataset(request);
    printError("ERROR: Should have failed to connect!");

    results.push({
      name: testName,
      errorType: "NOT_CAUGHT",
      errorMessage: "Connection error was not caught",
      isCaught: false,
      messageIsReadable: false,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    printError(errorMsg);

    const isCaught = true;
    // Network errors typically mention connection/network/timeout
    const isReadable = errorMsg.includes("Network") ||
      errorMsg.includes("ECONNREFUSED") ||
      errorMsg.includes("connection") ||
      errorMsg.includes("timeout");
    const icon = isReadable ? "✓" : "✗";

    console.log(`  ${icon} Message is ${isReadable ? "readable/technical" : "unclear"}`);

    results.push({
      name: testName,
      errorType: "NetworkError",
      errorMessage: errorMsg,
      isCaught,
      messageIsReadable: isReadable,
    });

    logger.logError(errorMsg);
    logger.logSummary(false, 100);
  }
}

// ============================================================================
// Error Summary Test
// ============================================================================

async function testErrorMessageQuality(): Promise<void> {
  printHeader("ERROR MESSAGE QUALITY CHECK");

  console.log("\nChecking that error messages are readable and helpful:");
  console.log("✓ Contain field names (dataset_path, model_path, etc.)");
  console.log("✓ Describe the problem (is required, must be, etc.)");
  console.log("✓ No cryptic stack traces");
  console.log("✓ Clear enough for debugging\n");

  const readableCount = results.filter((r) => r.messageIsReadable).length;
  const totalWithErrors = results.filter((r) => r.isCaught).length;

  console.log(
    `Error message quality: ${readableCount}/${totalWithErrors} are readable\n`
  );

  if (readableCount === totalWithErrors) {
    console.log("✅ All error messages are readable and helpful!");
  } else {
    console.log(
      `⚠ ${totalWithErrors - readableCount} error message(s) could be clearer:`
    );
    results
      .filter((r) => r.isCaught && !r.messageIsReadable)
      .forEach((r) => {
        console.log(`   - ${r.name}`);
        console.log(`     Current: "${r.errorMessage}"`);
      });
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests(): Promise<void> {
  printHeader("HANDSHAKE ERROR HANDLING TESTS");
  console.log("Testing error scenarios and error message quality\n");

  // Run error tests
  await testMissingRequiredField();
  await new Promise((r) => setTimeout(r, 100));

  await testWrongFieldType();
  await new Promise((r) => setTimeout(r, 100));

  await testInvalidGcsPath();
  await new Promise((r) => setTimeout(r, 100));

  await testEvaluateMissingField();
  await new Promise((r) => setTimeout(r, 100));

  await testServerConnectionError();

  // Test error message quality
  await testErrorMessageQuality();

  // Print summary
  printHeader("ERROR HANDLING SUMMARY");

  const totalTests = results.length;
  const caughtErrors = results.filter((r) => r.isCaught).length;
  const readableErrors = results.filter((r) => r.messageIsReadable).length;

  console.log(`\nTest Results:`);
  results.forEach((result) => {
    const caughtIcon = result.isCaught ? "✅" : "❌";
    const readableIcon = result.messageIsReadable ? "✓" : "✗";
    console.log(`${caughtIcon} ${result.name}`);
    console.log(
      `   Error: ${readableIcon} "${result.errorMessage.substring(0, 60)}${result.errorMessage.length > 60 ? "..." : ""}"`
    );
  });

  console.log(`\n${"=".repeat(80)}`);
  console.log(`Errors caught: ${caughtErrors}/${totalTests}`);
  console.log(`Readable messages: ${readableErrors}/${caughtErrors}`);
  console.log("=".repeat(80));

  if (caughtErrors === totalTests && readableErrors === caughtErrors) {
    console.log("\n✅ ALL ERROR HANDLING TESTS PASSED");
    console.log("   Errors are caught and messages are readable");
  } else {
    console.log(
      `\n⚠ ${totalTests - caughtErrors} error(s) not caught or ${caughtErrors - readableErrors} message(s) not readable`
    );
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
