"""
FÁZE 5.0A: External Python ML Runtime Server
First real external Python entrypoint (not Node.js baseline)

This server accepts ML pipeline requests from Node/Firebase layer
and processes them with Python, returning structured results.
"""

from flask import Flask, request, jsonify
from datetime import datetime
import logging
import json
from typing import Dict, List, Any, Tuple

# Configuration
app = Flask(__name__)
PORT = 5000
DEBUG = True

# Logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# 🔒 CONTRACT VALIDATION - Request/Response Shape Validation
# ═══════════════════════════════════════════════════════════════════════════════

class RequestContract:
    """Validates incoming request shape"""

    REQUIRED_FIELDS = {
        'uid': str,
        'pipelineLevel': str,
        'modelVersion': str,
    }

    OPTIONAL_FIELDS = {
        'transactions': list,
        'income': float,
        'debugMode': bool,
    }

    @staticmethod
    def validate(data: Dict) -> Tuple[bool, str]:
        """
        Validate request shape
        Returns: (is_valid, error_message)
        """
        # Check required fields
        for field, expected_type in RequestContract.REQUIRED_FIELDS.items():
            if field not in data:
                return False, f"Missing required field: {field}"
            if not isinstance(data[field], expected_type):
                return False, f"Field '{field}' must be {expected_type.__name__}, got {type(data[field]).__name__}"

        # Check optional fields if present
        for field, expected_type in RequestContract.OPTIONAL_FIELDS.items():
            if field in data and not isinstance(data[field], expected_type):
                return False, f"Field '{field}' must be {expected_type.__name__}, got {type(data[field]).__name__}"

        return True, ""


class ResponseContract:
    """Validates outgoing response shape"""

    @staticmethod
    def build(request_data: Dict, predictions: List[Dict], error: str = None) -> Dict:
        """
        Build response following contract shape
        """
        status = 'failed' if error else 'success'

        response = {
            'status': status,
            'uid': request_data.get('uid'),
            'pipelineLevel': request_data.get('pipelineLevel'),
            'modelVersion': request_data.get('modelVersion'),
            'processedAt': datetime.utcnow().isoformat() + 'Z',
            'predictions': predictions if not error else [],
            'error': error,
            'debugMetadata': {
                'processingTimeMs': 0,  # Will be set by caller
                'pythonRuntime': '3.9',
                'frameworkVersion': 'Flask/1.1.2'
            }
        }

        return response


# ═══════════════════════════════════════════════════════════════════════════════
# 🧮 ML BASELINE LOGIC - Simple deterministic predictions
# ═══════════════════════════════════════════════════════════════════════════════

def calculate_baseline_prediction(
    transactions: List[Dict],
    income: float,
    pipeline_level: str
) -> Dict:
    """
    Calculate simple baseline prediction from transactions
    FÁZE 5.0A: First placeholder logic (no ML model yet)

    Real model training will come in 5.0B+
    """

    if not transactions or income <= 0:
        return {
            'period': datetime.utcnow().strftime('%Y-%m'),
            'totalPredictedExpense': 0,
            'confidence': 0.0,
            'categories': {},
            'dataPoints': 0
        }

    # Group transactions by category
    category_totals = {}
    for tx in transactions:
        category = tx.get('category', 'other')
        amount = float(tx.get('amount', 0))
        if category not in category_totals:
            category_totals[category] = 0
        category_totals[category] += amount

    # Calculate averages (baseline)
    total_expense = sum(category_totals.values())
    num_transactions = len(transactions)

    # Simple confidence based on data quality
    # More transactions = higher confidence
    confidence = min(0.95, 0.5 + (num_transactions * 0.01))

    prediction = {
        'period': datetime.utcnow().strftime('%Y-%m'),
        'totalPredictedExpense': round(total_expense, 2),
        'confidence': round(confidence, 2),
        'categories': {k: round(v, 2) for k, v in category_totals.items()},
        'dataPoints': num_transactions,
        'pipelineLevel': pipeline_level
    }

    return prediction


# ═══════════════════════════════════════════════════════════════════════════════
# 🌐 HTTP ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    Used by Node/Firebase layer to verify Python runtime is available
    """
    logger.info('Health check requested')
    return jsonify({
        'status': 'healthy',
        'service': 'ml-runtime',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'version': '5.0.0'
    }), 200


@app.route('/predict', methods=['POST'])
def predict():
    """
    FÁZE 5.0A: Main ML prediction endpoint
    Receives request from Node/Firebase, processes, returns predictions

    Request Contract:
    {
        "uid": "user-123",
        "pipelineLevel": "L1",
        "modelVersion": "1.0",
        "transactions": [...],
        "income": 5000.00,
        "debugMode": false
    }

    Response Contract:
    {
        "status": "success",
        "uid": "user-123",
        "pipelineLevel": "L1",
        "modelVersion": "1.0",
        "processedAt": "2026-06-07T15:30:00.000Z",
        "predictions": [
            {
                "period": "2026-06",
                "totalPredictedExpense": 3500.00,
                "confidence": 0.87,
                "categories": {...},
                "dataPoints": 45
            }
        ],
        "error": null,
        "debugMetadata": {
            "processingTimeMs": 125,
            "pythonRuntime": "3.9",
            "frameworkVersion": "Flask/1.1.2"
        }
    }
    """

    import time
    start_time = time.time()

    try:
        # Get request data
        data = request.get_json()

        if not data:
            logger.error('No JSON data in request')
            return jsonify({
                'status': 'failed',
                'error': 'No JSON data provided',
                'debugMetadata': {'processingTimeMs': 0}
            }), 400

        # Validate request contract
        is_valid, error_msg = RequestContract.validate(data)
        if not is_valid:
            logger.error(f'Request validation failed: {error_msg}')
            return jsonify({
                'status': 'failed',
                'error': error_msg,
                'uid': data.get('uid'),
                'debugMetadata': {'processingTimeMs': 0}
            }), 400

        logger.info(f"Processing prediction for user: {data.get('uid')}, pipeline: {data.get('pipelineLevel')}")

        # Extract data
        uid = data.get('uid')
        pipeline_level = data.get('pipelineLevel')
        model_version = data.get('modelVersion')
        transactions = data.get('transactions', [])
        income = data.get('income', 0)
        debug_mode = data.get('debugMode', False)

        # Generate prediction
        prediction = calculate_baseline_prediction(transactions, income, pipeline_level)

        # Build response following contract
        response = ResponseContract.build(data, [prediction])

        # Add processing time
        processing_time_ms = int((time.time() - start_time) * 1000)
        response['debugMetadata']['processingTimeMs'] = processing_time_ms

        logger.info(f"Prediction completed for {uid}: confidence={prediction['confidence']}, processedAt={processing_time_ms}ms")

        return jsonify(response), 200

    except Exception as e:
        logger.error(f'Prediction error: {str(e)}')
        processing_time_ms = int((time.time() - start_time) * 1000)

        return jsonify({
            'status': 'failed',
            'error': str(e),
            'uid': data.get('uid') if 'data' in locals() else None,
            'debugMetadata': {'processingTimeMs': processing_time_ms}
        }), 500


@app.route('/status', methods=['GET'])
def runtime_status():
    """
    Runtime status endpoint
    Returns Python runtime status and capabilities
    """
    logger.info('Status check requested')
    return jsonify({
        'status': 'active',
        'pythonVersion': '3.9',
        'framework': 'Flask',
        'endpoints': [
            '/health',
            '/status',
            '/predict'
        ],
        'capabilities': [
            'baseline-prediction'
        ],
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }), 200


# ═══════════════════════════════════════════════════════════════════════════════
# 🚀 ERROR HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    logger.error(f'Endpoint not found: {request.path}')
    return jsonify({
        'status': 'error',
        'error': f'Endpoint not found: {request.path}',
        'debugMetadata': {}
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f'Internal server error: {str(error)}')
    return jsonify({
        'status': 'error',
        'error': 'Internal server error',
        'debugMetadata': {}
    }), 500


# ═══════════════════════════════════════════════════════════════════════════════
# 🏃 ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    logger.info(f'Starting ML Runtime Server on port {PORT}')
    logger.info('Available endpoints:')
    logger.info('  GET  /health     - Health check')
    logger.info('  GET  /status     - Runtime status')
    logger.info('  POST /predict    - ML prediction')

    app.run(
        host='127.0.0.1',
        port=PORT,
        debug=DEBUG,
        threaded=True
    )
