"""
Model evaluation for Level 2 ML Pipeline
Calculates metrics: MAE, MAPE, R², etc.
"""
import logging
from typing import Dict, Tuple
import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

logger = logging.getLogger(__name__)


def calculate_metrics(
    y_true: pd.Series,
    y_pred: pd.Series
) -> Dict[str, float]:
    """
    Calculate model evaluation metrics

    Args:
        y_true: True values
        y_pred: Predicted values

    Returns:
        Dict with MAE, MAPE, RMSE, R²
    """

    if len(y_true) == 0 or len(y_pred) == 0:
        logger.warning("⚠️ Empty predictions or true values")
        return {
            'mae': 0,
            'mape': 0,
            'rmse': 0,
            'r2': 0,
        }

    mae = float(mean_absolute_error(y_true, y_pred))
    mape = float(_calculate_mape(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = float(r2_score(y_true, y_pred)) if len(y_true) > 1 else 0

    logger.info(
        f"✅ Metrics calculated:\n"
        f"   MAE: {mae:.2f} Kč\n"
        f"   MAPE: {mape:.2f}%\n"
        f"   RMSE: {rmse:.2f} Kč\n"
        f"   R²: {r2:.4f}"
    )

    return {
        'mae': round(mae, 2),
        'mape': round(mape, 2),
        'rmse': round(rmse, 2),
        'r2': round(r2, 4),
    }


def _calculate_mape(y_true: pd.Series, y_pred: pd.Series) -> float:
    """
    Calculate Mean Absolute Percentage Error

    MAPE = mean(|y_true - y_pred| / |y_true|) * 100

    Note: Handles division by zero
    """
    mask = y_true != 0
    if mask.sum() == 0:
        return 0

    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def calculate_confidence(
    metrics: Dict[str, float],
    data_points: int,
    training_rows: int
) -> Tuple[str, float]:
    """
    Determine prediction confidence level based on metrics

    Args:
        metrics: Dict with MAE, MAPE, R²
        data_points: Number of data points used
        training_rows: Number of training rows

    Returns:
        Tuple of (confidence_level, confidence_score)
        confidence_level: high / medium / low
        confidence_score: 0-100
    """

    # Base score from metrics
    mape = metrics.get('mape', 100)
    r2 = metrics.get('r2', 0)

    # Data quality score (more data = higher confidence)
    data_score = min(100, (training_rows / 100) * 50)  # 0-50 points

    # MAPE-based score (lower MAPE = higher confidence)
    mape_score = max(0, 50 - (mape / 2))  # 0-50 points

    # R² bonus
    r2_score_bonus = max(0, r2 * 10)  # 0-10 bonus points

    # Total confidence score
    confidence_score = min(100, data_score + mape_score + r2_score_bonus)

    # Determine confidence level
    if confidence_score >= 80:
        confidence_level = 'high'
    elif confidence_score >= 50:
        confidence_level = 'medium'
    else:
        confidence_level = 'low'

    logger.info(
        f"✅ Confidence: {confidence_level} ({confidence_score:.0f}%)\n"
        f"   Data: {data_score:.0f}%, MAPE: {mape_score:.0f}%, R²: {r2_score_bonus:.0f}%"
    )

    return confidence_level, round(confidence_score, 0)


def compare_predictions(
    level1_total: float,
    level2_total: float
) -> Dict[str, float]:
    """
    Compare Level 1 and Level 2 predictions

    Args:
        level1_total: Level 1 prediction total
        level2_total: Level 2 prediction total

    Returns:
        Dict with difference in Kč and %
    """

    if level1_total == 0:
        percent_diff = 0
    else:
        percent_diff = ((level2_total - level1_total) / level1_total) * 100

    return {
        'level1_total': round(level1_total, 2),
        'level2_total': round(level2_total, 2),
        'difference_czk': round(level2_total - level1_total, 2),
        'difference_percent': round(percent_diff, 2),
    }
