"""
Firestore client for Level 2 ML Pipeline
Handles all communication with Firebase Firestore
"""
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore import Server

import config

logger = logging.getLogger(__name__)

class FirestoreClient:
    """
    Communicates with Firestore
    - Loads transactions
    - Loads Level 1 predictions
    - Saves Level 2 predictions
    - Records ML runs
    """

    def __init__(self):
        """Initialize Firestore connection"""
        try:
            # Initialize Firebase (if not already)
            if not firebase_admin.get_app():
                cred = credentials.Certificate(config.GOOGLE_APPLICATION_CREDENTIALS)
                firebase_admin.initialize_app(cred, {
                    'projectId': config.FIRESTORE_PROJECT_ID
                })

            self.db = firestore.client()
            logger.info("✅ Firestore connected")
        except Exception as e:
            logger.error(f"❌ Firestore connection failed: {e}")
            raise

    def get_all_users(self) -> List[str]:
        """Get all user UIDs from database"""
        try:
            users_ref = self.db.collection(config.FIRESTORE_COLLECTION_PREFIX)
            users = users_ref.stream()
            user_ids = [user.id for user in users]
            logger.info(f"📊 Found {len(user_ids)} users")
            return user_ids
        except Exception as e:
            logger.error(f"❌ Error loading users: {e}")
            return []

    def get_transactions(self, uid: str, months: int = 12) -> List[Dict]:
        """
        Load transactions for a user

        Args:
            uid: User ID
            months: How many months back to load

        Returns:
            List of transaction dicts with fields:
            - castka (amount)
            - kategorie (category)
            - datum (date as string YYYY-MM-DD)
            - nazev (name)
            - type (vydaj/prijem)
            - createdAt (timestamp)
        """
        try:
            transactions = []

            # Load wydaje (expenses)
            wydaje_ref = (
                self.db.collection(config.FIRESTORE_COLLECTION_PREFIX)
                .document(uid)
                .collection('vydaje')
            )
            wydaje_docs = wydaje_ref.stream()

            for doc in wydaje_docs:
                data = doc.data()
                if data:
                    data['type'] = 'vydaj'
                    data['id'] = doc.id
                    transactions.append(data)

            # Load prijmy (income) if configured
            if config.INCLUDE_INCOME_DATA:
                prijmy_ref = (
                    self.db.collection(config.FIRESTORE_COLLECTION_PREFIX)
                    .document(uid)
                    .collection('prijmy')
                )
                prijmy_docs = prijmy_ref.stream()

                for doc in prijmy_docs:
                    data = doc.data()
                    if data:
                        data['type'] = 'prijem'
                        data['id'] = doc.id
                        transactions.append(data)

            logger.debug(f"📥 Loaded {len(transactions)} transactions for {uid}")
            return transactions

        except Exception as e:
            logger.error(f"❌ Error loading transactions for {uid}: {e}")
            return []

    def get_level1_prediction(self, uid: str) -> Optional[Dict]:
        """
        Load latest Level 1 prediction for comparison

        Args:
            uid: User ID

        Returns:
            Latest Level 1 prediction dict or None
        """
        try:
            preds_ref = (
                self.db.collection(config.FIRESTORE_COLLECTION_PREFIX)
                .document(uid)
                .collection('mlPredictions')
            )

            query = (
                preds_ref
                .where('pipelineLevel', '==', 1)
                .where('active', '==', True)
                .order_by('createdAt', direction=firestore.Query.DESCENDING)
                .limit(1)
            )

            docs = query.stream()
            for doc in docs:
                logger.debug(f"📊 Found Level 1 prediction for {uid}")
                return {**doc.data(), 'id': doc.id}

            logger.debug(f"ℹ️ No Level 1 prediction found for {uid}")
            return None

        except Exception as e:
            logger.error(f"❌ Error loading Level 1 prediction for {uid}: {e}")
            return None

    def save_level2_prediction(
        self,
        uid: str,
        month: str,
        total_predicted: float,
        categories: Dict[str, float],
        confidence: str,
        confidence_score: float,
        metrics: Dict,
        model_type: str = config.MODEL_TYPE,
        model_version: str = config.MODEL_VERSION,
        fallback_used: bool = False,
        fallback_reason: Optional[str] = None
    ) -> str:
        """
        Save Level 2 prediction to Firestore

        Args:
            uid: User ID
            month: Prediction month (YYYY-MM)
            total_predicted: Total predicted expense
            categories: Dict of category: amount
            confidence: high/medium/low
            confidence_score: 0-100 score
            metrics: Dict with mae, mape, training_rows, test_rows
            model_type: Model type
            model_version: Model version
            fallback_used: Whether fallback was used
            fallback_reason: Reason for fallback (if any)

        Returns:
            Prediction document ID
        """
        try:
            prediction_data = {
                'month': month,
                'totalPredictedExpense': round(total_predicted),
                'categories': {k: round(v) for k, v in categories.items()},
                'confidence': confidence,
                'confidenceScore': round(confidence_score),
                'pipelineLevel': config.PIPELINE_LEVEL,
                'modelType': model_type,
                'modelVersion': model_version,
                'shadowMode': config.SHADOW_MODE,
                'active': config.ACTIVE and not fallback_used,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'metrics': metrics,
            }

            if fallback_used:
                prediction_data['fallbackUsed'] = True
                prediction_data['fallbackReason'] = fallback_reason

            # Save prediction
            preds_ref = (
                self.db.collection(config.FIRESTORE_COLLECTION_PREFIX)
                .document(uid)
                .collection('mlPredictions')
            )

            doc_ref = preds_ref.document()
            doc_ref.set(prediction_data)

            logger.info(f"✅ Saved Level 2 prediction for {uid}: {doc_ref.id}")
            return doc_ref.id

        except Exception as e:
            logger.error(f"❌ Error saving prediction for {uid}: {e}")
            raise

    def save_ml_run(
        self,
        status: str,
        users_processed: int,
        predictions_created: int,
        error_message: Optional[str] = None,
        model_type: str = config.MODEL_TYPE,
        model_version: str = config.MODEL_VERSION,
        training_rows: int = 0,
        test_rows: int = 0,
        mae: Optional[float] = None,
        mape: Optional[float] = None,
        fallback_used: bool = False,
        level1_comparison_available: bool = False,
        average_difference_from_level1: Optional[float] = None,
        error_code: Optional[str] = None
    ) -> str:
        """
        Save ML run record to Firestore

        Args:
            status: success / success_with_fallback / error
            users_processed: Number of users processed
            predictions_created: Number of predictions created
            error_message: Error message (if any)
            Other metrics...

        Returns:
            Run document ID
        """
        try:
            run_data = {
                'status': status,
                'pipelineLevel': config.PIPELINE_LEVEL,
                'mode': 'shadow' if config.SHADOW_MODE else 'production',
                'modelType': model_type,
                'modelVersion': model_version,
                'startedAt': firestore.SERVER_TIMESTAMP,
                'finishedAt': firestore.SERVER_TIMESTAMP,
                'usersProcessed': users_processed,
                'predictionsCreated': predictions_created,
                'trainingRows': training_rows,
                'testRows': test_rows,
                'fallbackUsed': fallback_used,
                'level1ComparisonAvailable': level1_comparison_available,
            }

            if mae is not None:
                run_data['mae'] = round(mae, 2)

            if mape is not None:
                run_data['mape'] = round(mape, 2)

            if average_difference_from_level1 is not None:
                run_data['averageDifferenceFromLevel1'] = round(average_difference_from_level1, 2)

            if error_message:
                run_data['errorMessage'] = error_message

            if error_code:
                run_data['errorCode'] = error_code

            # Save run
            runs_ref = self.db.collection('mlRuns')
            doc_ref = runs_ref.document()
            doc_ref.set(run_data)

            logger.info(f"✅ Saved ML run: {doc_ref.id}")
            return doc_ref.id

        except Exception as e:
            logger.error(f"❌ Error saving ML run: {e}")
            raise

    def get_latest_ml_run(self) -> Optional[Dict]:
        """Get latest ML run record"""
        try:
            runs_ref = self.db.collection('mlRuns')
            query = (
                runs_ref
                .where('pipelineLevel', '==', config.PIPELINE_LEVEL)
                .order_by('startedAt', direction=firestore.Query.DESCENDING)
                .limit(1)
            )

            docs = query.stream()
            for doc in docs:
                return {**doc.data(), 'id': doc.id}

            return None

        except Exception as e:
            logger.error(f"❌ Error loading latest ML run: {e}")
            return None
