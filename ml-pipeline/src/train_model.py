"""
Model training for Level 2 ML Pipeline
Trains RandomForestRegressor on prepared features
"""
import logging
from typing import Tuple, Optional
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler

import config

logger = logging.getLogger(__name__)


class MLModel:
    """
    RandomForestRegressor wrapper for expense prediction
    """

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = None
        self.is_trained = False

    def train(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series
    ) -> bool:
        """
        Train RandomForest model

        Args:
            X_train: Training features
            y_train: Training target (next month's total)

        Returns:
            True if training succeeded, False otherwise
        """

        if len(X_train) < 5:
            logger.warning(f"⚠️ Not enough training data: {len(X_train)} rows")
            return False

        try:
            # Store feature names
            self.feature_names = X_train.columns.tolist()

            # Scale features
            X_scaled = self.scaler.fit_transform(X_train)

            # Create and train model
            self.model = RandomForestRegressor(
                n_estimators=config.RANDOM_FOREST_N_ESTIMATORS,
                max_depth=config.RANDOM_FOREST_MAX_DEPTH,
                random_state=config.RANDOM_FOREST_RANDOM_STATE,
                n_jobs=-1,  # Use all CPUs
                min_samples_split=2,
                min_samples_leaf=1,
            )

            self.model.fit(X_scaled, y_train)
            self.is_trained = True

            logger.info(f"✅ Model trained successfully")
            logger.info(
                f"   Feature importance (top 5):\n"
                f"   {self._get_feature_importance_str()}"
            )

            return True

        except Exception as e:
            logger.error(f"❌ Training failed: {e}")
            return False

    def predict(self, X_test: pd.DataFrame) -> pd.Series:
        """
        Make predictions on test data

        Args:
            X_test: Test features

        Returns:
            Predicted values
        """

        if not self.is_trained:
            logger.error("❌ Model not trained")
            return pd.Series()

        try:
            X_scaled = self.scaler.transform(X_test)
            predictions = self.model.predict(X_scaled)
            return pd.Series(predictions, index=X_test.index)

        except Exception as e:
            logger.error(f"❌ Prediction failed: {e}")
            return pd.Series()

    def predict_next_month(
        self,
        X_latest: pd.DataFrame
    ) -> Optional[float]:
        """
        Predict next month's total expense

        Args:
            X_latest: Latest features for next month

        Returns:
            Predicted amount or None if failed
        """

        if not self.is_trained:
            logger.error("❌ Model not trained")
            return None

        try:
            if len(X_latest) == 0:
                logger.warning("⚠️ No features for next month prediction")
                return None

            # Take average of all category predictions
            X_scaled = self.scaler.transform(X_latest)
            predictions = self.model.predict(X_scaled)

            if len(predictions) > 0:
                next_month_total = float(predictions[-1])
                logger.info(f"✅ Next month prediction: {next_month_total:.0f}")
                return next_month_total
            else:
                return None

        except Exception as e:
            logger.error(f"❌ Next month prediction failed: {e}")
            return None

    def _get_feature_importance_str(self) -> str:
        """Get feature importance as formatted string"""
        if not self.is_trained or self.model is None:
            return "N/A"

        importances = self.model.feature_importances_
        feature_names = self.feature_names or []

        if len(importances) == 0:
            return "N/A"

        # Sort by importance
        importance_df = pd.DataFrame({
            'feature': feature_names,
            'importance': importances
        }).sort_values('importance', ascending=False)

        top_5 = importance_df.head(5)
        return "\n   ".join(
            f"{row['feature']}: {row['importance']:.3f}"
            for _, row in top_5.iterrows()
        )

    def get_params(self) -> dict:
        """Get model parameters for logging"""
        return {
            'model_type': config.MODEL_TYPE,
            'n_estimators': config.RANDOM_FOREST_N_ESTIMATORS,
            'max_depth': config.RANDOM_FOREST_MAX_DEPTH,
            'features': self.feature_names or [],
            'is_trained': self.is_trained,
        }
