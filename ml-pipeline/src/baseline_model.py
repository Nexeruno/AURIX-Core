"""
Baseline model for Level 2 ML Pipeline fallback
Used when there's not enough data for ML model training
"""
import logging
from typing import Dict, List, Tuple
import pandas as pd
import numpy as np

import config

logger = logging.getLogger(__name__)


def calculate_baseline_prediction(
    transactions: List[Dict],
    months_back: int = 3
) -> Tuple[float, Dict[str, float], str]:
    """
    Calculate baseline prediction using simple average

    When there's not enough data for ML model, use baseline:
    - Last 3-6 months average
    - By category
    - Safe and simple

    Args:
        transactions: List of transaction dicts
        months_back: How many months back to average

    Returns:
        Tuple of (total_predicted, categories_dict, confidence)
    """

    if not transactions:
        logger.warning("⚠️ No transactions for baseline prediction")
        return 0, {}, 'low'

    # Filter only wydaje (expenses)
    transactions = [t for t in transactions if t.get('type') == 'vydaj']

    if not transactions:
        logger.warning("⚠️ No wydaje (expenses) for baseline prediction")
        return 0, {}, 'low'

    df = pd.DataFrame(transactions)

    # Ensure proper types
    df['castka'] = pd.to_numeric(df['castka'], errors='coerce')
    df['kategorie'] = df['kategorie'].fillna('ostatni')
    df['datum'] = pd.to_datetime(df['datum'], errors='coerce')

    df = df.dropna(subset=['castka', 'datum', 'kategorie'])

    if len(df) < config.MIN_TRANSACTIONS_FOR_ML:
        logger.warning(
            f"⚠️ Not enough transactions for baseline: "
            f"{len(df)} < {config.MIN_TRANSACTIONS_FOR_ML}"
        )
        return 0, {}, 'low'

    # Group by month and category
    df['year_month'] = df['datum'].dt.to_period('M')
    monthly = df.groupby(['year_month', 'kategorie'])['castka'].sum().reset_index()

    # Get last N months
    latest_months = monthly['year_month'].unique()[-months_back:]

    if len(latest_months) < 2:
        logger.warning(f"⚠️ Not enough months for baseline: {len(latest_months)}")
        return 0, {}, 'low'

    # Calculate average by category
    recent = monthly[monthly['year_month'].isin(latest_months)]
    category_averages = recent.groupby('kategorie')['castka'].mean()

    # Normalize to known categories
    category_totals = {}
    total = 0

    for category in config.KATEGORIE_VYDAJ:
        avg = float(category_averages.get(category, 0))
        category_totals[category] = round(max(0, avg), 0)  # No negative
        total += category_totals[category]

    # Determine confidence based on data consistency
    if len(latest_months) >= 6:
        confidence = 'high'
    elif len(latest_months) >= 3:
        confidence = 'medium'
    else:
        confidence = 'low'

    logger.info(
        f"✅ Baseline prediction calculated:\n"
        f"   Total: {total:.0f} Kč\n"
        f"   Months: {len(latest_months)}\n"
        f"   Confidence: {confidence}"
    )

    return float(total), category_totals, confidence


def check_should_use_baseline(
    transactions: List[Dict],
    training_rows: int
) -> Tuple[bool, str]:
    """
    Determine if baseline should be used instead of ML model

    Uses baseline if:
    - Not enough transactions
    - Not enough training data for model
    - Not enough months of history

    Args:
        transactions: List of transaction dicts
        training_rows: Number of training rows from ML

    Returns:
        Tuple of (should_use_baseline, reason)
    """

    # Filter only wydaje
    wydaje = [t for t in transactions if t.get('type') == 'vydaj']

    if not wydaje:
        return True, 'no_transactions'

    if len(wydaje) < config.MIN_TRANSACTIONS_FOR_ML:
        return True, 'not_enough_transactions'

    # Check months of history
    df = pd.DataFrame(wydaje)
    df['datum'] = pd.to_datetime(df['datum'], errors='coerce')
    df_clean = df.dropna(subset=['datum'])

    if len(df_clean) > 0:
        date_range = (df_clean['datum'].max() - df_clean['datum'].min()).days
        months_of_history = date_range / 30

        if months_of_history < config.MIN_TRAINING_DATA_MONTHS:
            return True, 'not_enough_history'

    if training_rows < 10:
        return True, 'not_enough_training_data'

    return False, ''


def explain_confidence(confidence: str) -> str:
    """Get human-readable explanation of confidence level"""
    explanations = {
        'high': 'Dostatek dat, konzistentní trend',
        'medium': 'Přiměřené množství dat',
        'low': 'Málo dat, vysoká nejistota',
    }
    return explanations.get(confidence, 'Neznámá jistota')
