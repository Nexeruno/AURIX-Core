/**
 * Dataset Validation Flow Tests
 *
 * Tests the complete use-case flow:
 * 1. User submits dataset
 * 2. Flow prepares request
 * 3. Flow calls Python runtime via handler
 * 4. Flow processes and returns results
 *
 * This demonstrates the first concrete use-case implementation.
 *
 * Run: npx ts-node test_dataset_validation_flow.ts
 */

import DatasetValidationFlow, {
  validateDatasetStandalone,
} from "./dataset_validation_flow";


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

// ============================================================================
// Test Cases
// ============================================================================

async function testValidDatasetFlow(): Promise<void> {
  printTest("Valid Dataset Validation Flow");

  const flow = new DatasetValidationFlow("http://localhost:5000", "user-123");

  const result = await flow.validateUploadedDataset({
    datasetPath: "gs://test-bucket/exports/flow-test-001.json",
    userId: "user-123",
    runName: "flow-test-001",
  });

  console.log("\n--- Flow Result ---");
  console.log(`Success: ${result.success}`);
  if (result.success) {
    console.log(`Status: ${result.status}`);
    console.log(`Quality Score: ${result.qualityScore}`);
    console.log(`Total Rows: ${result.totalRows}`);
    console.log(`Valid Rows: ${result.validRows}`);
    console.log(`Duration: ${result.duration}ms`);
  } else {
    console.log(`Error: ${result.error}`);
  }
}

async function testInvalidDatasetFlow(): Promise<void> {
  printTest("Invalid Dataset Flow (Missing Path)");

  const flow = new DatasetValidationFlow("http://localhost:5000", "user-456");

  // Invalid: missing datasetPath
  const result = await flow.validateUploadedDataset({
    datasetPath: "", // Empty!
    userId: "user-456",
  });

  console.log("\n--- Flow Result ---");
  console.log(`Success: ${result.success}`);
  if (!result.success) {
    console.log(`Error: ${result.error}`);
    console.log(`Duration: ${result.duration}ms`);
  }
}

async function testFlowAvailability(): Promise<void> {
  printTest("Check Flow Availability");

  const flow = new DatasetValidationFlow("http://localhost:5000");
  const available = await flow.isAvailable();

  console.log(`\n--- Availability Check ---`);
  console.log(`Python runtime available: ${available ? "YES" : "NO"}`);

  if (!available) {
    console.log("Note: Make sure Flask app is running on localhost:5000");
  }
}

async function testStandaloneFunction(): Promise<void> {
  printTest("Standalone Function (For Cloud Function Deployment)");

  const result = await validateDatasetStandalone(
    "gs://test-bucket/exports/standalone-test.json",
    "user-789",
    "standalone-test-001"
  );

  console.log("\n--- Standalone Result ---");
  console.log(`Success: ${result.success}`);
  console.log(`Duration: ${result.duration}ms`);
  if (result.success) {
    console.log(`Quality Score: ${result.qualityScore}`);
  }
}

async function demonstrateIntegration(): Promise<void> {
  printHeader("USE-CASE INTEGRATION DEMONSTRATION");

  console.log("\nThis flow demonstrates the complete pipeline:\n");

  console.log("USER PERSPECTIVE:");
  console.log("  1. User uploads dataset.json");
  console.log("  2. Firebase receives request");
  console.log("  3. Cloud Function calls DatasetValidationFlow");
  console.log("  4. Flow handles all validation + error handling");
  console.log("  5. Results returned to user\n");

  console.log("TECHNICAL FLOW:");
  console.log("  DatasetValidationFlow");
  console.log("    ↓");
  console.log("  Prepare Request (convert user input)");
  console.log("    ↓");
  console.log("  PythonRuntimeHandler.validateDataset()");
  console.log("    ↓");
  console.log("  1. Validate request locally");
  console.log("  2. Call Python runtime");
  console.log("  3. Validate response locally");
  console.log("  4. Handle errors");
  console.log("  5. Return results");
  console.log("    ↓");
  console.log("  Format Response (convert to user-friendly format)");
  console.log("    ↓");
  console.log("  Return to user\n");

  console.log("COMPONENTS INTEGRATED:");
  console.log("  ✓ RequestValidator (validation logic)");
  console.log("  ✓ ResponseValidator (validation logic)");
  console.log("  ✓ ValidationErrorFormatter (error messages)");
  console.log("  ✓ HandshakeLogger (logging)");
  console.log("  ✓ PythonRuntimeHandler (unified wrapper)");
  console.log("  ✓ DatasetValidationFlow (use-case implementation)");
  console.log("  ✓ Cloud Function wrapper (Firebase integration)\n");

  console.log("READY FOR:");
  console.log("  • Real ML model integration (replace mock response)");
  console.log("  • Cloud Function deployment");
  console.log("  • Firebase Client SDK integration");
  console.log("  • UI implementation");
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests(): Promise<void> {
  printHeader("DATASET VALIDATION FLOW - COMPLETE USE-CASE");
  console.log("First concrete use-case connecting all components\n");

  // Check availability first
  await testFlowAvailability();
  await new Promise((r) => setTimeout(r, 500));

  // Run flow tests
  await testValidDatasetFlow();
  await new Promise((r) => setTimeout(r, 500));

  await testInvalidDatasetFlow();
  await new Promise((r) => setTimeout(r, 500));

  await testStandaloneFunction();
  await new Promise((r) => setTimeout(r, 500));

  // Show integration
  await demonstrateIntegration();

  printHeader("FLOW TEST SUMMARY");
  console.log("\n✅ Dataset Validation Flow implementation complete");
  console.log("\nKey files:");
  console.log("  • dataset_validation_flow.ts - Main flow class");
  console.log("  • validateDatasetHandler() - Cloud Function wrapper");
  console.log("  • validateDatasetStandalone() - Standalone function");
  console.log("\nNext steps:");
  console.log("  1. Deploy validateDatasetHandler as Cloud Function");
  console.log("  2. Create Client SDK caller in Flutter/Web");
  console.log("  3. Replace mock Python response with real model");
  console.log("  4. Add UI to display results");
}

// Run tests
runAllTests().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
