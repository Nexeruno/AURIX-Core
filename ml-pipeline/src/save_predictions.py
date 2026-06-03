"""
Save Level 2 predictions to Firestore
Handles prediction storage with metadata
"""
import logging
from datetime import datetime
from typing import Dict, Optional

import config
from firestore_client import FirestoreClient

logger = logging.getLogger(__name__)


def save_level2_prediction_and_run(
    firestore_client: FirestoreClient,
    uid: str,
    month: str,
    total_predicted: float,
    categories: Dict[str, float],
    metrics: Dict,
    comparison: Dict,
    fallback_used: bool = False,
    fallback_reason: Optional[str] = None,
    error_message: Optional[str] = None
) -> bool:
    """
    Save Level 2 prediction to Firestore

    Args:
        firestore_client: FirestoreClient instance
        uid: User ID
        month: Prediction month (YYYY-MM)
        total_predicted: Total predicted amount
        categories: Dict of category: amount
        metrics: Dict with MAE, MAPE, etc.
        comparison: Dict with Level 1 vs Level 2 comparison
        fallback_used: Whether fallback was used
        fallback_reason: Reason for fallback (if any)
        error_message: Error message (if any)

    Returns:
        True if saved successfully, False otherwise
    """

    try:
        # Determine confidence
        if fallback_used:
            confidence = 'low'
            confidence_score = 50
        else:
            mape = metrics.get('mape', 100)
            r2 = metrics.get('r2', 0)

            # Calculate confidence score
            if mape < 10 and r2 > 0.7:
                confidence = 'high'
                confidence_score = 85
            elif mape < 20 and r2 > 0.5:
                confidence = 'medium'
                confidence_score = 70
            else:
                confidence = 'low'
                confidence_score = 50

        # Prepare prediction data
        prediction_data = {
            'month': month,
            'total_predicted': total_predicted,
            'categories': categories,
            'confidence': confidence,
            'confidence_score': confidence_score,
            'metrics': metrics,
            'comparison': comparison,
            'fallback_used': fallback_used,
            'fallback_reason': fallback_reason,
        }

        # Save to Firestore
        pred_id = firestore_client.save_level2_prediction(
            uid=uid,
            month=month,
            total_predicted=total_predicted,
            categories=categories,
            confidence=confidence,
            confidence_score=confidence_score,
            metrics=metrics,
            model_type=(
                config.MODEL_TYPE if not fallback_used
                else 'baseline-fallback'
            ),
            model_version=(
                config.MODEL_VERSION if not fallback_used
                else config.BASELINE_MODEL_VERSION
            ),
            fallback_used=fallback_used,
            fallback_reason=fallback_reason,
        )

        logger.info(f"✅ Prediction saved for {uid}: {pred_id}")
        return True

    except Exception as e:
        logger.error(f"❌ Error saving prediction: {e}")
        return False


def save_ml_run(
    firestore_client: FirestoreClient,
    status: str,
    users_processed: int,
    predictions_created: int,
    metrics: Optional[Dict] = None,
    fallback_used: bool = False,
    comparison_available: bool = False,
    average_difference: Optional[float] = None,
    error_message: Optional[str] = None,
    error_code: Optional[str] = None
) -> bool:
    """
    Save ML run record to Firestore

    Args:
        firestore_client: FirestoreClient instance
        status: success / success_with_fallback / error
        users_processed: Number of users processed
        predictions_created: Number of predictions created
        metrics: Dict with MAE, MAPE, RMSE, R²
        fallback_used: Whether fallback was used
        comparison_available: Whether Level 1 comparison was done
        average_difference: Average difference from Level 1
        error_message: Error message (if any)
        error_code: Error code (if any)

    Returns:
        True if saved successfully, False otherwise
    """

    try:
        if metrics is None:
            metrics = {}

        # Save to Firestore
        run_id = firestore_client.save_ml_run(
            status=status,
            users_processed=users_processed,
            predictions_created=predictions_created,
            error_message=error_message,
            model_type=config.MODEL_TYPE,
            model_version=config.MODEL_VERSION,
            training_rows=metrics.get('training_rows', 0),
            test_rows=metrics.get('test_rows', 0),
            mae=metrics.get('mae'),
            mape=metrics.get('mape'),
            fallback_used=fallback_used,
            level1_comparison_available=comparison_available,
            average_difference_from_level1=average_difference,
            error_code=error_code,
        )

        status_emoji = '✅' if status == 'success' else '⚠️'
        logger.info(
            f"{status_emoji} ML run saved: {run_id}\n"
            f"   Status: {status}\n"
            f"   Users: {users_processed}\n"
            f"   Predictions: {predictions_created}"
        )

        return True

    except Exception as e:
        logger.error(f"❌ Error saving ML run: {e}")
        return False


def format_prediction_for_display(
    prediction: Dict,
    level1: Optional[Dict] = None
) -> Dict:
    """
    Format prediction data for display/logging

    Args:
        prediction: Prediction dict
        level1: Level 1 prediction (optional)

    Returns:
        Formatted dict
    """

    formatted = {
        'month': prediction.get('month'),
        'total_predicted': f"{prediction.get('total_predicted', 0):,.0f} Kč",
        'confidence': f"{prediction.get('confidence')} ({prediction.get('confidence_score')}%)",
        'metrics': {
            'mae': f"{prediction.get('metrics', {}).get('mae', 0):.0f} Kč",
            'mape': f"{prediction.get('metrics', {}).get('mape', 0):.1f}%",
        },
        'fallback_used': prediction.get('fallback_used', False),
    }

    if level1:
        formatted['level1_total'] = f"{level1.get('totalPredictedExpense', 0):,.0f} Kč"
        formatted['level1_confidence'] = f"{level1.get('confidence')} ({level1.get('confidenceScore')}%)"

    return formatted
