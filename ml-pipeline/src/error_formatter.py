"""
Validation Error Formatter

Converts ValidationError objects into human-readable error messages.
Used for API responses, logging, and user-facing error reporting.
"""

from typing import List
from validation import ValidationError


class ValidationErrorFormatter:
    """Formats validation errors into readable messages."""

    @staticmethod
    def format_single_error(error: ValidationError) -> str:
        """
        Format a single validation error into a readable message.

        Examples:
            "Field 'dataset_path' is required"
            "Field 'status' must be string, got number"
            "Field 'accuracy' must be between 0 and 1"
            "Field 'validation_level' must be 'quick' or 'full'"

        Returns:
            Formatted error message string
        """
        field = error.field
        message = error.message

        # Build field reference
        if "." in field:
            # Nested field (e.g., "dataset_stats.total_rows")
            field_ref = f"Field '{field}'"
        else:
            # Simple field
            field_ref = f"Field '{field}'"

        # Determine type of error and format accordingly
        if "is required" in message.lower():
            return f"{field_ref} is required"

        if "must be" in message.lower() and "got" in message.lower():
            # Type mismatch error
            # Message format: "Must be string, got number"
            return f"{field_ref} {message.lower()}"

        if "must be" in message.lower() and ("or" in message.lower() or "(" in message):
            # Enum/choice error
            # Message format: "Must be 'quick' or 'full'"
            return f"{field_ref} {message.lower()}"

        if "must be between" in message.lower() or "must be" in message.lower():
            # Range error or other constraint
            return f"{field_ref} {message.lower()}"

        if "cannot be" in message.lower():
            # Negative/zero/empty constraint
            return f"{field_ref} {message.lower()}"

        if "invalid" in message.lower():
            # General invalid error
            return f"{field_ref} is invalid: {message}"

        # Default: just use the message as-is
        return f"{field_ref}: {message}"

    @staticmethod
    def format_all_errors(errors: List[ValidationError]) -> str:
        """
        Format multiple validation errors into a multi-line message.

        Examples:
            "Validation failed (2 errors):
            - Field 'dataset_path' is required
            - Field 'status' must be 'PASS', 'FAIL', or 'WARNING'"

        Returns:
            Formatted error message with all errors listed
        """
        if not errors:
            return "No errors"

        if len(errors) == 1:
            return f"Validation failed: {ValidationErrorFormatter.format_single_error(errors[0])}"

        error_lines = [f"Validation failed ({len(errors)} errors):"]
        for error in errors:
            formatted = ValidationErrorFormatter.format_single_error(error)
            error_lines.append(f"  - {formatted}")

        return "\n".join(error_lines)

    @staticmethod
    def format_as_json(errors: List[ValidationError]) -> dict:
        """
        Format validation errors as JSON response.

        Returns:
            Dict with 'error' key and list of error messages
        """
        return {
            "error": "Validation failed",
            "error_count": len(errors),
            "errors": [
                {
                    "field": error.field,
                    "message": ValidationErrorFormatter.format_single_error(error)
                }
                for error in errors
            ]
        }

    @staticmethod
    def format_as_string_list(errors: List[ValidationError]) -> List[str]:
        """
        Format validation errors as a list of strings.

        Returns:
            List of formatted error messages
        """
        return [ValidationErrorFormatter.format_single_error(error) for error in errors]


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    # Example 1: Single error
    error1 = ValidationError(
        field="dataset_path",
        message="Field is required"
    )
    print("Example 1 - Single error:")
    print(ValidationErrorFormatter.format_single_error(error1))
    print()

    # Example 2: Type mismatch
    error2 = ValidationError(
        field="timeout_seconds",
        message="Must be integer, got float",
        value=30.5
    )
    print("Example 2 - Type mismatch:")
    print(ValidationErrorFormatter.format_single_error(error2))
    print()

    # Example 3: Enum error
    error3 = ValidationError(
        field="status",
        message="Must be 'PASS', 'FAIL', or 'WARNING'",
        value="UNKNOWN"
    )
    print("Example 3 - Enum error:")
    print(ValidationErrorFormatter.format_single_error(error3))
    print()

    # Example 4: Range error
    error4 = ValidationError(
        field="accuracy",
        message="Must be between 0 and 1",
        value=1.5
    )
    print("Example 4 - Range error:")
    print(ValidationErrorFormatter.format_single_error(error4))
    print()

    # Example 5: Multiple errors
    errors = [error1, error2, error3, error4]
    print("Example 5 - Multiple errors:")
    print(ValidationErrorFormatter.format_all_errors(errors))
    print()

    # Example 6: JSON format
    print("Example 6 - JSON format:")
    import json
    json_response = ValidationErrorFormatter.format_as_json(errors)
    print(json.dumps(json_response, indent=2))
    print()

    # Example 7: String list format
    print("Example 7 - String list format:")
    for i, msg in enumerate(ValidationErrorFormatter.format_as_string_list(errors), 1):
        print(f"  {i}. {msg}")
