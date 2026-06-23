"""
Train-Ready Dataset Loader
Loads and validates the exported train-ready dataset from Cloud Functions
"""
import logging
import json
from typing import Dict, List, Any, Tuple, Optional
from dataclasses import dataclass
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class DatasetRow:
    """Structured representation of a train-ready dataset row"""
    user_id: str
    month: str
    features: Dict[str, float]
    target: float
    metadata: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'user_id': self.user_id,
            'month': self.month,
            'features': self.features,
            'target': self.target,
            'metadata': self.metadata,
        }


class TrainReadyDatasetLoader:
    """
    Loader for train-ready dataset exported from Cloud Functions
    Validates shape and structure before use
    """

    REQUIRED_FEATURES = [
        'avgExpense3m', 'avgExpense6m', 'avgExpense12m',
        'avgIncome3m', 'avgIncome6m', 'avgIncome12m',
        'volatilityScore', 'regularityScore', 'feedbackCount',
        'avgManualCorrectionFactor', 'avgAutoCorrectionFactor',
        'avgFinalCorrectionFactor',
    ]

    REQUIRED_ROW_FIELDS = ['userId', 'month', 'features', 'target', 'metadata']

    def __init__(self):
        """Initialize loader"""
        self.logger = logger
        self.loaded_data = None
        self.validated_rows = []
        self.validation_errors = []

    def load_from_json(self, json_data: Dict[str, Any]) -> bool:
        """
        Load dataset from JSON export (as returned from HTTP endpoint)

        Args:
            json_data: Dictionary with 'metadata' and 'rows' keys

        Returns:
            bool: True if loaded successfully
        """
        try:
            if not isinstance(json_data, dict):
                raise TypeError(f"Expected dict, got {type(json_data)}")

            if 'rows' not in json_data:
                raise KeyError("Missing 'rows' key in dataset")

            if not isinstance(json_data['rows'], list):
                raise TypeError(f"'rows' should be list, got {type(json_data['rows'])}")

            self.loaded_data = json_data
            self.logger.info(f"✅ Loaded {len(json_data['rows'])} rows from JSON")
            return True

        except Exception as e:
            self.logger.error(f"❌ Failed to load JSON: {str(e)}")
            return False

    def load_from_file(self, file_path: str) -> bool:
        """
        Load dataset from JSON file

        Args:
            file_path: Path to JSON file

        Returns:
            bool: True if loaded successfully
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return self.load_from_json(data)
        except Exception as e:
            self.logger.error(f"❌ Failed to load file {file_path}: {str(e)}")
            return False

    def _validate_row(self, row: Dict[str, Any], row_index: int) -> Optional[DatasetRow]:
        """
        Validate a single dataset row

        Args:
            row: Row dictionary
            row_index: Row index (for error reporting)

        Returns:
            DatasetRow if valid, None if invalid
        """
        errors = []

        # Check required fields
        for field in self.REQUIRED_ROW_FIELDS:
            if field not in row:
                errors.append(f"Missing field '{field}'")

        if errors:
            error_msg = f"Row {row_index}: {'; '.join(errors)}"
            self.validation_errors.append(error_msg)
            self.logger.warning(f"⚠️  {error_msg}")
            return None

        # Validate userId
        if not isinstance(row['userId'], str) or not row['userId'].strip():
            error_msg = f"Row {row_index}: userId must be non-empty string"
            self.validation_errors.append(error_msg)
            self.logger.warning(f"⚠️  {error_msg}")
            return None

        # Validate month (YYYY-MM format)
        if not isinstance(row['month'], str) or len(row['month']) != 7:
            error_msg = f"Row {row_index}: month must be YYYY-MM format"
            self.validation_errors.append(error_msg)
            self.logger.warning(f"⚠️  {error_msg}")
            return None

        # Validate target
        if row['target'] is None:
            error_msg = f"Row {row_index}: target is null (expected number)"
            self.validation_errors.append(error_msg)
            self.logger.warning(f"⚠️  {error_msg}")
            return None

        try:
            target = float(row['target'])
            if not np.isfinite(target):
                error_msg = f"Row {row_index}: target is not finite ({target})"
                self.validation_errors.append(error_msg)
                self.logger.warning(f"⚠️  {error_msg}")
                return None
        except (TypeError, ValueError) as e:
            error_msg = f"Row {row_index}: target is not a number: {str(e)}"
            self.validation_errors.append(error_msg)
            self.logger.warning(f"⚠️  {error_msg}")
            return None

        # Validate features
        features = row['features']
        if not isinstance(features, dict):
            error_msg = f"Row {row_index}: features must be dictionary"
            self.validation_errors.append(error_msg)
            self.logger.warning(f"⚠️  {error_msg}")
            return None

        # Check all required features present
        missing_features = [f for f in self.REQUIRED_FEATURES if f not in features]
        if missing_features:
            error_msg = f"Row {row_index}: missing features {missing_features}"
            self.validation_errors.append(error_msg)
            self.logger.warning(f"⚠️  {error_msg}")
            return None

        # Validate feature values are finite numbers
        feature_errors = []
        for feat_name in self.REQUIRED_FEATURES:
            feat_value = features[feat_name]
            try:
                num_val = float(feat_value)
                if not np.isfinite(num_val):
                    feature_errors.append(f"{feat_name}={num_val}")
            except (TypeError, ValueError):
                feature_errors.append(f"{feat_name}={feat_value} (not a number)")

        if feature_errors:
            error_msg = f"Row {row_index}: invalid feature values: {', '.join(feature_errors)}"
            self.validation_errors.append(error_msg)
            self.logger.warning(f"⚠️  {error_msg}")
            return None

        # Validate metadata (optional but should exist)
        metadata = row.get('metadata', {})
        if not isinstance(metadata, dict):
            metadata = {}

        # Create validated row
        validated_row = DatasetRow(
            user_id=row['userId'],
            month=row['month'],
            features={name: float(features[name]) for name in self.REQUIRED_FEATURES},
            target=target,
            metadata=metadata,
        )

        return validated_row

    def validate(self) -> Tuple[bool, int]:
        """
        Validate all loaded rows

        Returns:
            Tuple[success: bool, valid_row_count: int]
        """
        if self.loaded_data is None:
            self.logger.error("❌ No data loaded. Call load_from_json() first")
            return False, 0

        rows = self.loaded_data.get('rows', [])
        self.validated_rows = []
        self.validation_errors = []

        self.logger.info(f"Validating {len(rows)} rows...")

        for idx, row in enumerate(rows):
            validated_row = self._validate_row(row, idx)
            if validated_row:
                self.validated_rows.append(validated_row)

        valid_count = len(self.validated_rows)
        invalid_count = len(rows) - valid_count

        self.logger.info(f"✅ Validation complete: {valid_count}/{len(rows)} valid, {invalid_count} invalid")

        if self.validation_errors:
            self.logger.warning(f"⚠️  {len(self.validation_errors)} validation errors:")
            for error in self.validation_errors[:10]:  # Show first 10
                self.logger.warning(f"   {error}")
            if len(self.validation_errors) > 10:
                self.logger.warning(f"   ... and {len(self.validation_errors) - 10} more")

        return valid_count > 0, valid_count

    def get_validated_rows(self) -> List[DatasetRow]:
        """Get all validated rows"""
        return self.validated_rows

    def to_dataframe(self) -> pd.DataFrame:
        """
        Convert validated rows to pandas DataFrame

        Features are flattened as individual columns

        Returns:
            DataFrame with columns: user_id, month, target, [feature columns], metadata
        """
        if not self.validated_rows:
            self.logger.warning("⚠️  No validated rows to convert")
            return pd.DataFrame()

        # Flatten features into individual columns
        data = []
        for row in self.validated_rows:
            row_dict = {
                'user_id': row.user_id,
                'month': row.month,
                'target': row.target,
            }
            # Add all features as individual columns
            row_dict.update(row.features)
            # Add metadata as JSON string (for reference)
            row_dict['metadata'] = json.dumps(row.metadata)
            data.append(row_dict)

        df = pd.DataFrame(data)
        self.logger.info(f"✅ Created DataFrame: {df.shape[0]} rows, {df.shape[1]} columns")
        return df

    def get_summary(self) -> Dict[str, Any]:
        """Get summary statistics of validated dataset"""
        if not self.loaded_data:
            return {}

        metadata = self.loaded_data.get('metadata', {})

        summary = {
            'exportedAt': metadata.get('exportedAt'),
            'version': metadata.get('version', 'unknown'),
            'format': metadata.get('format', 'unknown'),
            'totalRecords': metadata.get('totalRecords', 0),
            'trainReadyRecords': metadata.get('trainReadyRecords', 0),
            'excludedRecords': metadata.get('excludedRecords', 0),
            'validatedRows': len(self.validated_rows),
            'validationErrors': len(self.validation_errors),
        }

        # Add feature statistics if validated
        if self.validated_rows:
            features_data = [row.features for row in self.validated_rows]
            df_features = pd.DataFrame(features_data)
            summary['featureStats'] = {
                col: {
                    'mean': float(df_features[col].mean()),
                    'std': float(df_features[col].std()),
                    'min': float(df_features[col].min()),
                    'max': float(df_features[col].max()),
                }
                for col in df_features.columns
            }

        return summary

    def print_summary(self):
        """Print human-readable summary"""
        summary = self.get_summary()

        print("\n" + "="*60)
        print("TRAIN-READY DATASET SUMMARY")
        print("="*60)
        print(f"Exported At:      {summary.get('exportedAt', 'N/A')}")
        print(f"Format:           {summary.get('format', 'N/A')}")
        print(f"Version:          {summary.get('version', 'N/A')}")
        print(f"\nRecords:")
        print(f"  Total:          {summary.get('totalRecords', 0)}")
        print(f"  Train-Ready:    {summary.get('trainReadyRecords', 0)}")
        print(f"  Excluded:       {summary.get('excludedRecords', 0)}")
        print(f"\nValidation:")
        print(f"  Valid Rows:     {summary.get('validatedRows', 0)}")
        print(f"  Errors:         {summary.get('validationErrors', 0)}")
        print("="*60 + "\n")


# Example usage function
def load_and_validate_dataset(json_data: Dict[str, Any]) -> Tuple[bool, TrainReadyDatasetLoader]:
    """
    Convenience function to load and validate dataset in one call

    Args:
        json_data: Dataset JSON from HTTP endpoint

    Returns:
        Tuple[success: bool, loader: TrainReadyDatasetLoader]
    """
    loader = TrainReadyDatasetLoader()

    if not loader.load_from_json(json_data):
        return False, loader

    success, count = loader.validate()

    if not success:
        logger.warning(f"⚠️  No valid rows found in dataset")
        return False, loader

    loader.print_summary()
    return True, loader
