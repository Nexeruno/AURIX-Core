"""
Feature Engineering for Level 2 ML Pipeline
Prepares transaction data for RandomForestRegressor training
"""
import logging
from datetime import datetime
from typing import Dict, List, Tuple
import pandas as pd
import numpy as np

import config

logger = logging.getLogger(__name__)


def prepare_features(transactions: List[Dict], uid: str) -> pd.DataFrame:
    """
    Prepare feature engineering for ML model

    Input transactions structure:
    {
        'castka': float,
        'kategorie': str,
        'datum': 'YYYY-MM-DD' or datetime,
        'nazev': str,
        'type': 'vydaj' or 'prijem',
        'createdAt': timestamp
    }

    Returns:
        DataFrame with engineered features ready for model
    """

    if not transactions:
        logger.warning(f"⚠️ No transactions for {uid}")
        return pd.DataFrame()

    # Filter only wydaje (expenses) for training
    transactions = [t for t in transactions if t.get('type') == 'vydaj']

    if not transactions:
        logger.warning(f"⚠️ No wydaje (expenses) for {uid}")
        return pd.DataFrame()

    # Create DataFrame
    df = pd.DataFrame(transactions)

    # Ensure proper column names and types
    df['castka'] = pd.to_numeric(df['castka'], errors='coerce')
    df['kategorie'] = df['kategorie'].fillna('ostatni')

    # Convert date
    if 'datum' in df.columns:
        df['datum'] = pd.to_datetime(df['datum'], errors='coerce')

    # Remove rows with missing critical data
    df = df.dropna(subset=['castka', 'datum', 'kategorie'])

    if len(df) < config.MIN_TRANSACTIONS_FOR_ML:
        logger.warning(
            f"⚠️ Not enough transactions for {uid}: "
            f"{len(df)} < {config.MIN_TRANSACTIONS_FOR_ML}"
        )
        return pd.DataFrame()

    # Extract date features
    df['year'] = df['datum'].dt.year
    df['month'] = df['datum'].dt.month
    df['dayOfWeek'] = df['datum'].dt.dayofweek  # 0=Monday, 6=Sunday
    df['isWeekend'] = df['dayOfWeek'].isin([5, 6]).astype(int)
    df['monthIndex'] = df['year'] * 12 + df['month']

    # Calculate category-based features
    df = _add_category_features(df)

    # Calculate trend features
    df = _add_trend_features(df)

    # Calculate time-based aggregations
    df = _add_temporal_aggregations(df)

    logger.info(f"✅ Prepared {len(df)} feature rows for {uid}")
    logger.debug(f"   Features: {list(df.columns)}")

    return df


def _add_category_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add category-based features"""

    # Total monthly expense by category
    df['categoryMonthlyTotal'] = df.groupby(['year', 'month', 'kategorie'])['castka'].transform('sum')

    # Number of transactions by category in month
    df['categoryTransactionCount'] = df.groupby(['year', 'month', 'kategorie']).cumcount() + 1

    # Average transaction in category (monthly)
    df['categoryAverageTransaction'] = (
        df['categoryMonthlyTotal'] / df['categoryTransactionCount']
    )

    # Total expense in month
    df['totalMonthlyExpense'] = df.groupby(['year', 'month'])['castka'].transform('sum')

    # Category share of total monthly expense
    df['categoryShareOfTotal'] = (
        df['categoryMonthlyTotal'] / df['totalMonthlyExpense'] * 100
    )

    return df


def _add_trend_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add trend and historical features"""

    # Previous month category total (lag feature)
    df_sorted = df.sort_values(['kategorie', 'year', 'month'])
    df_sorted['previousMonthCategoryTotal'] = (
        df_sorted.groupby('kategorie')['categoryMonthlyTotal'].shift(1)
    )

    # Last 3 months average by category
    df_sorted['last3MonthsCategoryAverage'] = (
        df_sorted.groupby('kategorie')['categoryMonthlyTotal']
        .rolling(window=3, min_periods=1)
        .mean()
        .reset_index(level=0, drop=True)
    )

    # Last 6 months average by category
    df_sorted['last6MonthsCategoryAverage'] = (
        df_sorted.groupby('kategorie')['categoryMonthlyTotal']
        .rolling(window=6, min_periods=1)
        .mean()
        .reset_index(level=0, drop=True)
    )

    # Trend compared to previous month (% change)
    df_sorted['trendComparedToPreviousMonth'] = (
        (df_sorted['categoryMonthlyTotal'] - df_sorted['previousMonthCategoryTotal']) /
        df_sorted['previousMonthCategoryTotal'] * 100
    )
    df_sorted['trendComparedToPreviousMonth'] = (
        df_sorted['trendComparedToPreviousMonth'].fillna(0)
    )

    # Re-index to original order
    df = df.join(df_sorted[
        ['previousMonthCategoryTotal', 'last3MonthsCategoryAverage',
         'last6MonthsCategoryAverage', 'trendComparedToPreviousMonth']
    ])

    return df


def _add_temporal_aggregations(df: pd.DataFrame) -> pd.DataFrame:
    """Add temporal aggregation features"""

    # Hour of day (if available)
    if 'createdAt' in df.columns:
        df['hourOfDay'] = pd.to_datetime(df['createdAt'], errors='coerce').dt.hour
    else:
        df['hourOfDay'] = 12  # Default noon

    # Season (simplified)
    df['season'] = df['month'].apply(
        lambda m: 'winter' if m in [12, 1, 2]
        else 'spring' if m in [3, 4, 5]
        else 'summer' if m in [6, 7, 8]
        else 'autumn'
    )

    return df


def get_feature_columns() -> List[str]:
    """Return list of feature columns used by the model"""
    return [
        'castka',
        'year', 'month', 'dayOfWeek', 'isWeekend', 'monthIndex',
        'categoryMonthlyTotal', 'categoryTransactionCount', 'categoryAverageTransaction',
        'totalMonthlyExpense', 'categoryShareOfTotal',
        'previousMonthCategoryTotal', 'last3MonthsCategoryAverage',
        'last6MonthsCategoryAverage', 'trendComparedToPreviousMonth',
        'hourOfDay'
    ]


def prepare_training_data(
    df: pd.DataFrame,
    target_months_ahead: int = 1
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """
    Prepare training and test data for model

    Target: Next month's total expense in each category

    Args:
        df: Feature-engineered DataFrame
        target_months_ahead: How many months ahead to predict

    Returns:
        X_train, X_test, y_train, y_test
    """

    if len(df) < config.MIN_TRANSACTIONS_FOR_ML * 2:
        logger.warning("⚠️ Not enough data for train/test split")
        return pd.DataFrame(), pd.DataFrame(), pd.Series(), pd.Series()

    # Group by month and category to get monthly totals
    monthly = df.groupby(['year', 'month', 'kategorie']).agg({
        'castka': 'sum',
        'categoryMonthlyTotal': 'first',
        'categoryTransactionCount': 'sum',
        'totalMonthlyExpense': 'first',
        'last3MonthsCategoryAverage': 'mean',
        'last6MonthsCategoryAverage': 'mean',
    }).reset_index()

    monthly = monthly.sort_values(['kategorie', 'year', 'month'])

    # Shift target (next month's total)
    monthly['target'] = monthly.groupby('kategorie')['castka'].shift(-target_months_ahead)

    # Remove rows without target
    monthly = monthly.dropna(subset=['target'])

    if len(monthly) < 10:
        logger.warning("⚠️ Not enough monthly data points after shifting")
        return pd.DataFrame(), pd.DataFrame(), pd.Series(), pd.Series()

    # Feature columns
    feature_cols = [
        'categoryMonthlyTotal', 'categoryTransactionCount',
        'totalMonthlyExpense', 'last3MonthsCategoryAverage',
        'last6MonthsCategoryAverage'
    ]

    X = monthly[feature_cols].fillna(0)
    y = monthly['target']

    # Train/test split
    split_idx = int(len(X) * (1 - config.TEST_TRAIN_SPLIT))
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    logger.info(
        f"✅ Prepared training data: "
        f"train={len(X_train)}, test={len(X_test)}"
    )

    return X_train, X_test, y_train, y_test
