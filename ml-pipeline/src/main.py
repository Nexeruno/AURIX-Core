"""
Level 2 ML Pipeline - Main Entry Point
Runs shadow mode ML predictions alongside Level 1
"""
import logging
import sys
from datetime import datetime, timedelta
from typing import Dict, List

import config
from firestore_client import FirestoreClient
from feature_engineering import prepare_features, prepare_training_data
from train_model import MLModel
from evaluate_model import calculate_metrics, calculate_confidence
from baseline_model import calculate_baseline_prediction, check_should_use_baseline
from compare_predictions import compare_level1_vs_level2
from save_predictions import (
    save_level2_prediction_and_run,
    save_ml_run,
    format_prediction_for_display
)

# Configure logging
logging.basicConfig(
    level=config.LOG_LEVEL,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class Level2Pipeline:
    """
    Level 2 ML Pipeline - Shadow Mode
    Runs ML predictions alongside Level 1, stores in Firestore
    """

    def __init__(self):
        """Initialize pipeline"""
        self.firestore_client = FirestoreClient()
        self.stats = {
            'users_processed': 0,
            'predictions_created': 0,
            'fallbacks_used': 0,
            'errors': 0,
            'average_difference_from_level1': 0,
        }

    def run(self) -> bool:
        """
        Run Level 2 pipeline for all users

        Returns:
            True if completed successfully, False if errors occurred
        """

        start_time = datetime.now()
        logger.info(f"🚀 Starting Level 2 ML Pipeline (Shadow Mode)")
        logger.info(f"   Mode: {config.PIPELINE_MODE}")
        logger.info(f"   Active: {config.ACTIVE}")
        logger.info(f"   Shadow Mode: {config.SHADOW_MODE}")

        try:
            # Get all users
            user_ids = self.firestore_client.get_all_users()
            logger.info(f"📊 Found {len(user_ids)} users")

            if not user_ids:
                logger.warning("⚠️ No users found")
                self._save_run_record(start_time, "success_with_fallback", "Žádní uživatelé")
                return True

            # Process each user
            differences = []

            for uid in user_ids:
                logger.info(f"\n{'='*60}")
                logger.info(f"Processing user: {uid}")
                logger.info(f"{'='*60}")

                try:
                    success, difference = self._process_user(uid)

                    if success:
                        self.stats['predictions_created'] += 1
                        if difference is not None:
                            differences.append(difference)
                    else:
                        self.stats['errors'] += 1

                    self.stats['users_processed'] += 1

                except Exception as e:
                    logger.error(f"❌ Error processing {uid}: {e}")
                    self.stats['users_processed'] += 1
                    self.stats['errors'] += 1
                    continue

            # Calculate averages
            if differences:
                self.stats['average_difference_from_level1'] = sum(differences) / len(differences)

            # Save run record
            duration = (datetime.now() - start_time).total_seconds() * 1000
            self._save_run_record(
                start_time,
                "success",
                None,
                duration
            )

            logger.info(f"\n{'='*60}")
            logger.info("✅ Pipeline completed successfully")
            logger.info(f"{'='*60}")
            logger.info(f"📊 Summary:")
            logger.info(f"   Users processed: {self.stats['users_processed']}")
            logger.info(f"   Predictions created: {self.stats['predictions_created']}")
            logger.info(f"   Fallbacks used: {self.stats['fallbacks_used']}")
            logger.info(f"   Errors: {self.stats['errors']}")
            if self.stats['average_difference_from_level1'] != 0:
                logger.info(f"   Avg diff from Level 1: {self.stats['average_difference_from_level1']:.0f} Kč")

            return self.stats['errors'] == 0

        except Exception as e:
            logger.error(f"❌ Pipeline failed: {e}")
            self._save_run_record(start_time, "error", str(e))
            return False

    def _process_user(self, uid: str) -> tuple:
        """
        Process one user - create Level 2 prediction

        Returns:
            Tuple of (success, difference_from_level1)
        """

        try:
            # Load transactions
            transactions = self.firestore_client.get_transactions(uid, months=12)

            if not transactions:
                logger.warning(f"⚠️ No transactions for {uid}")
                return False, None

            logger.info(f"📥 Loaded {len(transactions)} transactions")

            # Prepare features
            df = prepare_features(transactions, uid)

            if df.empty:
                logger.warning(f"⚠️ Feature engineering failed for {uid}")
                return False, None

            # Check if should use baseline
            should_baseline, reason = check_should_use_baseline(transactions, len(df))

            if should_baseline:
                logger.info(f"📊 Using baseline fallback: {reason}")
                return self._create_baseline_prediction(uid, transactions)

            # Prepare training data
            X_train, X_test, y_train, y_test = prepare_training_data(df)

            if X_train.empty or X_test.empty:
                logger.warning(f"⚠️ Could not prepare training data for {uid}")
                return self._create_baseline_prediction(uid, transactions)

            # Train model
            model = MLModel()
            if not model.train(X_train, y_train):
                logger.error(f"❌ Model training failed for {uid}")
                return self._create_baseline_prediction(uid, transactions)

            # Make predictions
            y_pred = model.predict(X_test)

            if y_pred.empty:
                logger.error(f"❌ Predictions failed for {uid}")
                return self._create_baseline_prediction(uid, transactions)

            # Evaluate model
            metrics = calculate_metrics(y_test, y_pred)
            confidence, confidence_score = calculate_confidence(
                metrics,
                len(df),
                len(X_train)
            )

            # Get next month's total
            next_month = (datetime.now() + timedelta(days=30)).strftime('%Y-%m')
            total_predicted = _estimate_total_from_metrics(df, metrics)

            # Category predictions
            categories = _estimate_categories(df)

            # Load Level 1 for comparison
            level1_pred = self.firestore_client.get_level1_prediction(uid)
            comparison = compare_level1_vs_level2(
                level1_pred,
                {
                    'total_predicted': total_predicted,
                    'categories': categories,
                }
            )

            # Prepare prediction data
            prediction_data = {
                'month': next_month,
                'total_predicted': total_predicted,
                'categories': categories,
                'confidence': confidence,
                'confidence_score': confidence_score,
                'metrics': {
                    'mae': metrics.get('mae', 0),
                    'mape': metrics.get('mape', 0),
                    'training_rows': len(X_train),
                    'test_rows': len(X_test),
                },
                'comparison': comparison,
            }

            # Save prediction
            save_level2_prediction_and_run(
                self.firestore_client,
                uid,
                next_month,
                total_predicted,
                categories,
                metrics,
                comparison,
                fallback_used=False,
            )

            # Log
            logger.info(f"✅ Prediction created for {uid}")
            logger.info(f"   Total: {total_predicted:,.0f} Kč")
            logger.info(f"   Confidence: {confidence}")
            logger.info(f"   MAE: {metrics.get('mae', 0):.0f} Kč")

            difference = comparison.get('difference_czk', 0) if level1_pred else None

            return True, difference

        except Exception as e:
            logger.error(f"❌ Error processing user {uid}: {e}")
            return False, None

    def _create_baseline_prediction(self, uid: str, transactions: List[Dict]) -> tuple:
        """Create baseline prediction when ML model can't be used"""

        try:
            total, categories, confidence = calculate_baseline_prediction(transactions)

            # Load Level 1 for comparison
            level1_pred = self.firestore_client.get_level1_prediction(uid)
            comparison = compare_level1_vs_level2(
                level1_pred,
                {
                    'total_predicted': total,
                    'categories': categories,
                }
            )

            next_month = (datetime.now() + timedelta(days=30)).strftime('%Y-%m')

            # Save prediction with fallback flag
            save_level2_prediction_and_run(
                self.firestore_client,
                uid,
                next_month,
                total,
                categories,
                {'mae': 0, 'mape': 0, 'training_rows': 0, 'test_rows': 0},
                comparison,
                fallback_used=True,
                fallback_reason='not_enough_training_data',
            )

            self.stats['fallbacks_used'] += 1

            logger.info(f"✅ Baseline prediction created for {uid}")
            logger.info(f"   Total: {total:,.0f} Kč")

            difference = comparison.get('difference_czk', 0) if level1_pred else None

            return True, difference

        except Exception as e:
            logger.error(f"❌ Baseline creation failed for {uid}: {e}")
            return False, None

    def _save_run_record(
        self,
        start_time: datetime,
        status: str,
        error_message: str = None,
        duration_ms: float = None
    ):
        """Save ML run record to Firestore"""

        try:
            if duration_ms is None:
                duration_ms = (datetime.now() - start_time).total_seconds() * 1000

            save_ml_run(
                self.firestore_client,
                status=status,
                users_processed=self.stats['users_processed'],
                predictions_created=self.stats['predictions_created'],
                metrics={
                    'mae': 0,
                    'mape': 0,
                    'training_rows': 0,
                    'test_rows': 0,
                },
                fallback_used=self.stats['fallbacks_used'] > 0,
                comparison_available=True,
                average_difference=self.stats['average_difference_from_level1'],
                error_message=error_message,
            )

        except Exception as e:
            logger.error(f"❌ Error saving run record: {e}")


def _estimate_total_from_metrics(df, metrics) -> float:
    """Estimate total expense from metrics"""
    if df.empty:
        return 0
    return df.groupby(['year', 'month'])['castka'].sum().mean()


def _estimate_categories(df) -> Dict[str, float]:
    """Estimate category breakdown from data"""
    categories = {}
    for cat in config.KATEGORIE_VYDAJ:
        cat_df = df[df['kategorie'] == cat]
        if not cat_df.empty:
            categories[cat] = cat_df['castka'].sum()
        else:
            categories[cat] = 0
    return categories


if __name__ == '__main__':
    try:
        pipeline = Level2Pipeline()
        success = pipeline.run()
        sys.exit(0 if success else 1)

    except KeyboardInterrupt:
        logger.info("\n⏸️ Pipeline interrupted by user")
        sys.exit(130)

    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        sys.exit(1)
