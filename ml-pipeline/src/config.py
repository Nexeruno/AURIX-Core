"""
Configuration and constants for Level 2 ML Pipeline
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Firebase
GOOGLE_APPLICATION_CREDENTIALS = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
FIRESTORE_PROJECT_ID = os.getenv('FIRESTORE_PROJECT_ID', 'your-project-id')
FIRESTORE_COLLECTION_PREFIX = os.getenv('FIRESTORE_COLLECTION_PREFIX', 'users')

# ML Configuration
MIN_TRAINING_DATA_MONTHS = int(os.getenv('MIN_TRAINING_DATA_MONTHS', '3'))
MIN_TRANSACTIONS_FOR_ML = int(os.getenv('MIN_TRANSACTIONS_FOR_ML', '30'))
TEST_TRAIN_SPLIT = float(os.getenv('TEST_TRAIN_SPLIT', '0.2'))

# RandomForest hyperparameters
RANDOM_FOREST_N_ESTIMATORS = int(os.getenv('RANDOM_FOREST_N_ESTIMATORS', '100'))
RANDOM_FOREST_MAX_DEPTH = int(os.getenv('RANDOM_FOREST_MAX_DEPTH', '10'))
RANDOM_FOREST_RANDOM_STATE = 42

# Pipeline mode
PIPELINE_MODE = os.getenv('PIPELINE_MODE', 'shadow')
PIPELINE_LEVEL = 2
SHADOW_MODE = PIPELINE_MODE == 'shadow'
ACTIVE = PIPELINE_MODE == 'production'

# Model info
MODEL_TYPE = 'random-forest-regressor'
MODEL_VERSION = 'expense-predictor-ml-v1'
BASELINE_MODEL_VERSION = 'expense-predictor-baseline-fallback-v1'

# Category mappings (same as frontend)
KATEGORIE_VYDAJ = ['doprava', 'jidlo', 'bydleni', 'sporeni', 'zabava', 'ostatni']
KATEGORIE_PRIJEM = ['prace', 'brigada', 'prodej', 'prispevky', 'ostatni']

# Category labels for display
CATEGORY_LABELS = {
    'doprava': 'Doprava',
    'jidlo': 'Jídlo',
    'bydleni': 'Bydlení',
    'sporeni': 'Spoření',
    'zabava': 'Zábava',
    'ostatni': 'Ostatní',
    'prace': 'Práce',
    'brigada': 'Brigáda',
    'prodej': 'Prodej',
    'prispevky': 'Příspěvky',
}

# Logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

# Feature Engineering
INCLUDE_INCOME_DATA = os.getenv('INCLUDE_INCOME_DATA', 'false').lower() == 'true'

# Confidence thresholds (based on data consistency)
CONFIDENCE_HIGH_THRESHOLD = 0.8  # > 80% consistency
CONFIDENCE_MEDIUM_THRESHOLD = 0.5  # > 50% consistency
# Below 50% = low confidence

print(f"""
✅ Config Loaded:
   Pipeline Mode: {PIPELINE_MODE}
   Shadow Mode: {SHADOW_MODE}
   Active: {ACTIVE}
   Model Version: {MODEL_VERSION}
""")
