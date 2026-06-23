"""
ML Runtime Contract App - Minimal Python Entrypoint

Provides HTTP endpoints for ML contract communication with Firebase.
- POST /api/ml/validate-dataset
- POST /api/ml/evaluate

This is a CONTRACT-FIRST implementation:
- Accepts request in contract shape
- Validates request against schema
- Returns mock response in contract shape
- Validates response against schema

NO ML LOGIC YET - just contract/shape validation.
"""

import json
import logging
from typing import Tuple, Dict, Any
from datetime import datetime
from flask import Flask, request, jsonify

from validation import RequestValidator, ResponseValidator, ValidationError
from error_formatter import ValidationErrorFormatter
from real_ml_computation import get_computation


# ============================================================================
# Flask App Setup
# ============================================================================

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================================================
# Helper Functions
# ============================================================================

def create_error_response(errors: list, status_code: int = 400) -> Tuple[Dict, int]:
    """
    Create standardized error response.

    Args:
        errors: List of ValidationError objects
        status_code: HTTP status code (400 or 422)

    Returns:
        (response_dict, http_status_code)
    """
    error_list = [{"field": e.field, "message": e.message} for e in errors]

    return {
        "status": "error",
        "error": "Validation failed",
        "error_count": len(errors),
        "errors": error_list,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }, status_code


def create_success_response(response_data: Dict[str, Any], status_code: int = 200) -> Tuple[Dict, int]:
    """
    Create standardized success response.

    Args:
        response_data: Response dict from contract
        status_code: HTTP status code

    Returns:
        (response_dict, http_status_code)
    """
    return response_data, status_code


# ============================================================================
# Health Check
# ============================================================================

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "ml-runtime",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }, 200


# ============================================================================
# Contract Endpoints
# ============================================================================

@app.route("/api/ml/validate-dataset", methods=["POST"])
def validate_dataset():
    """
    Endpoint: POST /api/ml/validate-dataset

    Contract:
    - Request: ValidateDatasetRequest
    - Response: ValidateDatasetResponse

    Flow:
    1. Extract JSON from request
    2. Validate request against schema
    3. If invalid: return error response
    4. If valid: return mock ValidateDatasetResponse
    5. Validate response against schema
    """
    try:
        # Step 1: Extract JSON
        if not request.is_json:
            return {
                "status": "error",
                "error": "Request must be JSON",
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }, 400

        request_data = request.get_json()
        logger.info(f"[POST /api/ml/validate-dataset] Request received: {json.dumps(request_data)}")

        # Step 2: Validate request
        is_valid, errors = RequestValidator.validate_dataset_request(request_data)

        if not is_valid:
            logger.warning(f"[POST /api/ml/validate-dataset] Request validation failed: {[e.field for e in errors]}")
            return create_error_response(errors, 400)

        logger.info("[POST /api/ml/validate-dataset] Request validation passed")

        # Step 3: Generate real response (deterministic computation)
        response_data = get_computation().validate_dataset(
            dataset_path=request_data.get("dataset_path"),
            run_id=request_data.get("run_id"),
            validation_level=request_data.get("validation_level", "full")
        )
        logger.info(f"[POST /api/ml/validate-dataset] Real response generated: {json.dumps(response_data)}")

        # Step 4: Validate response
        resp_is_valid, resp_errors = ResponseValidator.validate_dataset_response(response_data)

        if not resp_is_valid:
            logger.error(f"[POST /api/ml/validate-dataset] Response validation failed: {[e.field for e in resp_errors]}")
            return create_error_response(resp_errors, 500)

        logger.info("[POST /api/ml/validate-dataset] Response validation passed")

        # Step 5: Return valid response
        logger.info("[POST /api/ml/validate-dataset] SUCCESS")
        return create_success_response(response_data, 200)

    except Exception as e:
        logger.error(f"[POST /api/ml/validate-dataset] Unexpected error: {str(e)}")
        return {
            "status": "error",
            "error": "Internal server error",
            "details": str(e),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }, 500


@app.route("/api/ml/evaluate", methods=["POST"])
def evaluate_model():
    """
    Endpoint: POST /api/ml/evaluate

    Contract:
    - Request: EvaluateModelRequest
    - Response: EvaluateModelResponse

    Flow:
    1. Extract JSON from request
    2. Validate request against schema
    3. If invalid: return error response
    4. If valid: return mock EvaluateModelResponse
    5. Validate response against schema
    """
    try:
        # Step 1: Extract JSON
        if not request.is_json:
            return {
                "status": "error",
                "error": "Request must be JSON",
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }, 400

        request_data = request.get_json()
        logger.info(f"[POST /api/ml/evaluate] Request received: {json.dumps(request_data)}")

        # Step 2: Validate request
        is_valid, errors = RequestValidator.validate_evaluate_request(request_data)

        if not is_valid:
            logger.warning(f"[POST /api/ml/evaluate] Request validation failed: {[e.field for e in errors]}")
            return create_error_response(errors, 400)

        logger.info("[POST /api/ml/evaluate] Request validation passed")

        # Step 3: Generate real response (deterministic computation)
        response_data = get_computation().evaluate_model(
            model_path=request_data.get("model_path"),
            validation_data_path=request_data.get("validation_data_path"),
            run_id=request_data.get("run_id")
        )
        logger.info(f"[POST /api/ml/evaluate] Real response generated: {json.dumps(response_data)}")

        # Step 4: Validate response
        resp_is_valid, resp_errors = ResponseValidator.validate_evaluate_response(response_data)

        if not resp_is_valid:
            logger.error(f"[POST /api/ml/evaluate] Response validation failed: {[e.field for e in resp_errors]}")
            return create_error_response(resp_errors, 500)

        logger.info("[POST /api/ml/evaluate] Response validation passed")

        # Step 5: Return valid response
        logger.info("[POST /api/ml/evaluate] SUCCESS")
        return create_success_response(response_data, 200)

    except Exception as e:
        logger.error(f"[POST /api/ml/evaluate] Unexpected error: {str(e)}")
        return {
            "status": "error",
            "error": "Internal server error",
            "details": str(e),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }, 500


# ============================================================================
# Contract Info Endpoint
# ============================================================================

@app.route("/api/ml/contract-info", methods=["GET"])
def contract_info():
    """
    Return contract info/documentation.

    Useful for debugging and client integration.
    """
    return {
        "service": "ml-runtime",
        "version": "4.5.0",
        "contract_version": "1.0.0",
        "computation": "deterministic (not ML model)",
        "endpoints": [
            {
                "method": "POST",
                "path": "/api/ml/validate-dataset",
                "description": "Validate a training dataset",
                "request_schema": "ValidateDatasetRequest",
                "response_schema": "ValidateDatasetResponse"
            },
            {
                "method": "POST",
                "path": "/api/ml/evaluate",
                "description": "Evaluate a trained model",
                "request_schema": "EvaluateModelRequest",
                "response_schema": "EvaluateModelResponse"
            }
        ],
        "status": "real deterministic computation (no ML models yet)",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }, 200


# ============================================================================
# Error Handlers
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return {
        "status": "error",
        "error": "Endpoint not found",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }, 404


@app.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 errors."""
    return {
        "status": "error",
        "error": "Method not allowed",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }, 405


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    logger.info("Starting ML Runtime Contract App...")
    logger.info("Listening on http://localhost:5000")
    logger.info("Endpoints:")
    logger.info("  POST /api/ml/validate-dataset")
    logger.info("  POST /api/ml/evaluate")
    logger.info("  GET  /api/ml/contract-info")
    logger.info("  GET  /health")

    # Run Flask app
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
        use_reloader=False
    )
