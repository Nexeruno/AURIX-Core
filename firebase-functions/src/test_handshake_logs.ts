/**
 * Handshake Logs Demonstration
 *
 * Demonstrates the complete handshake logging flow:
 * 1. Node.js sends request (logged)
 * 2. Flask receives and validates (logged)
 * 3. Flask returns response (logged)
 * 4. Node.js receives and validates (logged)
 *
 * Run: npx ts-node test_handshake_logs.ts
 */

import MLRuntimeClient, {ValidateDatasetRequest} from "./ml_runtime_client";
import {HandshakeLogger} from "./handshake_logger";


// ============================================================================
// Test
// ============================================================================

async function testHandshakeWithLogs(): Promise<void> {
  console.log("================================================================================");
  console.log("HANDSHAKE LOGGING DEMONSTRATION");
  console.log("================================================================================");
  console.log(
    "Simulating: Node.js → Flask → Response → Node.js\n"
  );

  // Create logger on Node.js side
  const logger = new HandshakeLogger("validate-dataset", true);

  try {
    // STEP 1: Prepare request
    const request: ValidateDatasetRequest = {
      dataset_path: "gs://test-bucket/exports/handshake-demo.json",
      run_id: "handshake-demo-001",
      validation_level: "full",
    };

    const startTime = Date.now();

    console.log("--- NODE.JS SIDE ---\n");

    // Log request sending
    logger.logRequestSent(request);
    console.log("");

    // STEP 2: Send request to Flask
    console.log("--- CALLING FLASK APP ---\n");
    console.log("(Flask will log its own side - shown below)\n");

    const client = new MLRuntimeClient("http://localhost:5000");
    const response = await client.validateDataset(request);

    const duration = Date.now() - startTime;

    // STEP 3: Log response received
    console.log("\n--- NODE.JS SIDE (CONTINUED) ---\n");

    logger.logResponseReceived(200);

    // Log response validation
    const isValid = !!response.run_id && response.run_id === request.run_id;
    logger.logResponseValidated(isValid);

    // STEP 4: Log summary
    console.log("");
    logger.logSummary(isValid, duration);

    // Print all Node.js logs
    console.log("\n================================================================================");
    console.log("NODE.JS SIDE LOG SUMMARY");
    console.log("================================================================================");
    logger.getLogs().forEach((log) => console.log(log));

    if (isValid) {
      console.log("\n✅ Handshake completed successfully!");
      console.log("   Request → Response roundtrip verified");
      console.log(`   Total time: ${duration}ms`);
    } else {
      console.log("\n❌ Handshake failed!");
      console.log("   Response validation failed");
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`\n❌ Error: ${errorMsg}`);
    logger.logError(errorMsg);
  }
}

async function testMultipleHandshakes(): Promise<void> {
  console.log("\n\n================================================================================");
  console.log("MULTIPLE HANDSHAKES WITH LOGGING");
  console.log("================================================================================\n");

  const client = new MLRuntimeClient("http://localhost:5000");

  // Test 1: Dataset validation
  {
    const logger = new HandshakeLogger("validate-dataset", true);
    const startTime = Date.now();

    try {
      const request: ValidateDatasetRequest = {
        dataset_path: "gs://bucket/data1.json",
        run_id: "multi-handshake-001",
        validation_level: "full",
      };

      logger.logRequestSent(request);
      const response = await client.validateDataset(request);
      logger.logResponseReceived(200);
      const isValid = response.run_id === request.run_id;
      logger.logResponseValidated(isValid);

      const duration = Date.now() - startTime;
      logger.logSummary(isValid, duration);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.logError(msg);
      logger.logSummary(false, Date.now() - startTime);
    }

    console.log("");
  }

  // Test 2: Model evaluation
  {
    const logger = new HandshakeLogger("evaluate", true);
    const startTime = Date.now();

    try {
      const request = {
        model_path: "gs://bucket/model.pkl",
        validation_data_path: "gs://bucket/data.json",
        run_id: "multi-handshake-002",
      };

      logger.logRequestSent(request);
      const response = await client.evaluateModel(request);
      logger.logResponseReceived(200);
      const isValid = response.run_id === request.run_id;
      logger.logResponseValidated(isValid);

      const duration = Date.now() - startTime;
      logger.logSummary(isValid, duration);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.logError(msg);
      logger.logSummary(false, Date.now() - startTime);
    }

    console.log("");
  }

  // Test 3: Invalid request (should fail)
  {
    const logger = new HandshakeLogger("invalid-request", true);
    const startTime = Date.now();

    try {
      const request: any = {
        // Missing required dataset_path
        run_id: "multi-handshake-003",
      };

      logger.logRequestSent({...request, dataset_path: "(missing)"});
      const response = await client.validateDataset(request);
      logger.logResponseReceived(200);

      const duration = Date.now() - startTime;
      logger.logSummary(false, duration);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.logError(msg);

      const duration = Date.now() - startTime;
      logger.logSummary(false, duration);
    }

    console.log("");
  }
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  try {
    // Test single handshake with detailed logging
    await testHandshakeWithLogs();

    // Test multiple handshakes
    await testMultipleHandshakes();

    console.log("================================================================================");
    console.log("✅ ALL LOGGING TESTS COMPLETE");
    console.log("================================================================================");
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run
main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
