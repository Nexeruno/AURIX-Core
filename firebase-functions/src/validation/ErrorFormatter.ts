/**
 * Validation Error Formatter
 *
 * Converts ValidationError objects into human-readable error messages.
 * Used for API responses, logging, and user-facing error reporting.
 */

import { ValidationError } from "./RequestValidator";


export class ValidationErrorFormatter {
  /**
   * Format a single validation error into a readable message.
   *
   * Examples:
   *   "Field 'dataset_path' is required"
   *   "Field 'status' must be string, got number"
   *   "Field 'accuracy' must be between 0 and 1"
   *   "Field 'validation_level' must be 'quick' or 'full'"
   *
   * @param error - The ValidationError to format
   * @returns Formatted error message string
   */
  static formatSingleError(error: ValidationError): string {
    const field = error.field;
    const message = error.message;

    // Build field reference
    const fieldRef = `Field '${field}'`;

    // Determine type of error and format accordingly
    if (message.toLowerCase().includes("is required")) {
      return `${fieldRef} is required`;
    }

    if (
      message.toLowerCase().includes("must be") &&
      message.toLowerCase().includes("got")
    ) {
      // Type mismatch error
      // Message format: "Must be string, got number"
      return `${fieldRef} ${message.toLowerCase()}`;
    }

    if (
      message.toLowerCase().includes("must be") &&
      (message.toLowerCase().includes("or") || message.includes("("))
    ) {
      // Enum/choice error
      // Message format: "Must be 'quick' or 'full'"
      return `${fieldRef} ${message.toLowerCase()}`;
    }

    if (
      message.toLowerCase().includes("must be between") ||
      message.toLowerCase().includes("must be")
    ) {
      // Range error or other constraint
      return `${fieldRef} ${message.toLowerCase()}`;
    }

    if (message.toLowerCase().includes("cannot be")) {
      // Negative/zero/empty constraint
      return `${fieldRef} ${message.toLowerCase()}`;
    }

    if (message.toLowerCase().includes("invalid")) {
      // General invalid error
      return `${fieldRef} is invalid: ${message}`;
    }

    // Default: just use the message as-is
    return `${fieldRef}: ${message}`;
  }

  /**
   * Format multiple validation errors into a multi-line message.
   *
   * Examples:
   *   "Validation failed (2 errors):
   *   - Field 'dataset_path' is required
   *   - Field 'status' must be 'PASS', 'FAIL', or 'WARNING'"
   *
   * @param errors - List of ValidationErrors
   * @returns Formatted error message with all errors listed
   */
  static formatAllErrors(errors: ValidationError[]): string {
    if (errors.length === 0) {
      return "No errors";
    }

    if (errors.length === 1) {
      return `Validation failed: ${this.formatSingleError(errors[0])}`;
    }

    const errorLines = [`Validation failed (${errors.length} errors):`];
    for (const error of errors) {
      const formatted = this.formatSingleError(error);
      errorLines.push(`  - ${formatted}`);
    }

    return errorLines.join("\n");
  }

  /**
   * Format validation errors as JSON response.
   *
   * @param errors - List of ValidationErrors
   * @returns Object with error details for API response
   */
  static formatAsJson(errors: ValidationError[]): {
    error: string;
    error_count: number;
    errors: Array<{ field: string; message: string }>;
  } {
    return {
      error: "Validation failed",
      error_count: errors.length,
      errors: errors.map((error) => ({
        field: error.field,
        message: this.formatSingleError(error)
      }))
    };
  }

  /**
   * Format validation errors as a list of strings.
   *
   * @param errors - List of ValidationErrors
   * @returns List of formatted error messages
   */
  static formatAsStringList(errors: ValidationError[]): string[] {
    return errors.map((error) => this.formatSingleError(error));
  }

  /**
   * Get HTTP status code based on error type.
   *
   * @param errors - List of ValidationErrors
   * @returns HTTP status code (400 for most validation errors, 422 for semantic errors)
   */
  static getHttpStatus(errors: ValidationError[]): number {
    if (errors.length === 0) {
      return 200;
    }

    // Check if any errors are about missing fields vs semantic errors
    const hasMissingRequired = errors.some((e) =>
      e.message.toLowerCase().includes("required")
    );
    const hasTypeErrors = errors.some((e) =>
      e.message.toLowerCase().includes("must be") &&
      e.message.toLowerCase().includes("got")
    );

    // Missing required fields or type errors → 400 Bad Request
    if (hasMissingRequired || hasTypeErrors) {
      return 400;
    }

    // Semantic/business logic errors → 422 Unprocessable Entity
    return 422;
  }
}


// ============================================================================
// EXAMPLE USAGE
// ============================================================================

if (require.main === module) {
  // Example 1: Single error
  const error1: ValidationError = {
    field: "dataset_path",
    message: "Field is required"
  };
  console.log("Example 1 - Single error:");
  console.log(ValidationErrorFormatter.formatSingleError(error1));
  console.log();

  // Example 2: Type mismatch
  const error2: ValidationError = {
    field: "timeout_seconds",
    message: "Must be integer, got float",
    value: 30.5
  };
  console.log("Example 2 - Type mismatch:");
  console.log(ValidationErrorFormatter.formatSingleError(error2));
  console.log();

  // Example 3: Enum error
  const error3: ValidationError = {
    field: "status",
    message: "Must be 'PASS', 'FAIL', or 'WARNING'",
    value: "UNKNOWN"
  };
  console.log("Example 3 - Enum error:");
  console.log(ValidationErrorFormatter.formatSingleError(error3));
  console.log();

  // Example 4: Range error
  const error4: ValidationError = {
    field: "accuracy",
    message: "Must be between 0 and 1",
    value: 1.5
  };
  console.log("Example 4 - Range error:");
  console.log(ValidationErrorFormatter.formatSingleError(error4));
  console.log();

  // Example 5: Multiple errors
  const errors = [error1, error2, error3, error4];
  console.log("Example 5 - Multiple errors:");
  console.log(ValidationErrorFormatter.formatAllErrors(errors));
  console.log();

  // Example 6: JSON format
  console.log("Example 6 - JSON format:");
  const jsonResponse = ValidationErrorFormatter.formatAsJson(errors);
  console.log(JSON.stringify(jsonResponse, null, 2));
  console.log();

  // Example 7: String list format
  console.log("Example 7 - String list format:");
  ValidationErrorFormatter.formatAsStringList(errors).forEach((msg, i) => {
    console.log(`  ${i + 1}. ${msg}`);
  });
  console.log();

  // Example 8: HTTP status codes
  console.log("Example 8 - HTTP status codes:");
  console.log(
    `For ${errors.length} errors → HTTP ${ValidationErrorFormatter.getHttpStatus(errors)}`
  );
}
