"""
Train-Ready Dataset Sanity Check Script
Quick offline validation that dataset looks reasonable
"""
import sys
import json
import logging
from typing import Dict, Any, Tuple
from collections import defaultdict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DatasetSanityChecker:
    """Quick offline sanity checks for train-ready dataset"""

    REQUIRED_FEATURES = [
        'avgExpense3m', 'avgExpense6m', 'avgExpense12m',
        'avgIncome3m', 'avgIncome6m', 'avgIncome12m',
        'volatilityScore', 'regularityScore', 'feedbackCount',
        'avgManualCorrectionFactor', 'avgAutoCorrectionFactor',
        'avgFinalCorrectionFactor',
    ]

    def __init__(self):
        """Initialize checker"""
        self.dataset = None
        self.rows = []
        self.valid_rows = 0
        self.invalid_rows = 0
        self.unique_users = set()
        self.errors = []
        self.warnings = []

    def load_from_json(self, json_data: Dict[str, Any]) -> bool:
        """Load dataset from JSON"""
        try:
            if not isinstance(json_data, dict) or 'rows' not in json_data:
                self.errors.append("Invalid JSON structure: missing 'rows' key")
                return False

            self.dataset = json_data
            self.rows = json_data.get('rows', [])
            return True
        except Exception as e:
            self.errors.append(f"Failed to load JSON: {str(e)}")
            return False

    def load_from_file(self, file_path: str) -> bool:
        """Load dataset from JSON file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return self.load_from_json(data)
        except FileNotFoundError:
            self.errors.append(f"File not found: {file_path}")
            return False
        except json.JSONDecodeError as e:
            self.errors.append(f"Invalid JSON file: {str(e)}")
            return False
        except Exception as e:
            self.errors.append(f"Failed to load file: {str(e)}")
            return False

    def _check_row(self, row: Dict[str, Any]) -> bool:
        """Check if single row is valid"""
        try:
            # Check required fields
            if not all(k in row for k in ['userId', 'month', 'features', 'target']):
                return False

            # Check userId
            if not isinstance(row.get('userId'), str) or not row['userId'].strip():
                return False

            # Check month format (YYYY-MM)
            month = row.get('month')
            if not isinstance(month, str) or len(month) != 7 or month[4] != '-':
                return False

            # Check target
            target = row.get('target')
            if target is None:
                return False
            try:
                float(target)
            except (TypeError, ValueError):
                return False

            # Check features
            features = row.get('features')
            if not isinstance(features, dict):
                return False

            # Check all required features
            if not all(f in features for f in self.REQUIRED_FEATURES):
                return False

            # Check feature values are numbers
            for feat in self.REQUIRED_FEATURES:
                try:
                    float(features[feat])
                except (TypeError, ValueError):
                    return False

            return True

        except Exception:
            return False

    def run_checks(self) -> Tuple[bool, Dict[str, Any]]:
        """Run all sanity checks"""
        if not self.rows:
            self.errors.append("No rows loaded")
            return False, {}

        # Basic counts
        total_rows = len(self.rows)
        self.valid_rows = 0
        self.invalid_rows = 0

        # Iterate rows
        for idx, row in enumerate(self.rows):
            if self._check_row(row):
                self.valid_rows += 1
                # Track users
                user_id = row.get('userId')
                if user_id:
                    self.unique_users.add(user_id)
            else:
                self.invalid_rows += 1

        # Feature count check
        if self.rows and self.valid_rows > 0:
            sample_row = next(r for r in self.rows if self._check_row(r))
            features = sample_row.get('features', {})
            feature_count = len(features)
            expected_feature_count = len(self.REQUIRED_FEATURES)

            if feature_count != expected_feature_count:
                self.warnings.append(
                    f"Feature count mismatch: {feature_count} vs expected {expected_feature_count}"
                )

        # Check for significant invalid rows
        if self.invalid_rows > 0:
            pct = (self.invalid_rows / total_rows) * 100
            if pct > 10:
                self.warnings.append(
                    f"High invalid row percentage: {pct:.1f}% ({self.invalid_rows}/{total_rows})"
                )

        # Check minimum data
        if self.valid_rows < 10:
            self.warnings.append(f"Low valid row count: {self.valid_rows} (recommended >= 10)")

        # Check user diversity
        if len(self.unique_users) < 2:
            self.warnings.append(
                f"Low user diversity: {len(self.unique_users)} user(s) (recommended >= 2)"
            )

        # Get metadata
        metadata = self.dataset.get('metadata', {})

        # Success if valid rows >= 80% OR at least 10 valid rows AND multiple users
        success = (self.valid_rows >= total_rows * 0.8 or
                   (self.valid_rows >= 10 and len(self.unique_users) >= 2))

        summary = {
            'status': 'PASS' if success else 'FAIL',
            'totalRows': total_rows,
            'validRows': self.valid_rows,
            'invalidRows': self.invalid_rows,
            'invalidPercent': (self.invalid_rows / total_rows * 100) if total_rows > 0 else 0,
            'uniqueUsers': len(self.unique_users),
            'featureCount': len(self.REQUIRED_FEATURES),
            'exportedAt': metadata.get('exportedAt', 'unknown'),
            'version': metadata.get('version', 'unknown'),
        }

        return success, summary

    def print_report(self, summary: Dict[str, Any]):
        """Print human-readable sanity check report"""
        print("\n" + "="*70)
        print(" TRAIN-READY DATASET SANITY CHECK")
        print("="*70)

        # Header
        status = summary.get('status', 'UNKNOWN')
        status_symbol = "PASS" if status == 'PASS' else "FAIL"
        print(f"\nStatus: {status_symbol}")
        print(f"Exported: {summary.get('exportedAt', 'unknown')}")
        print(f"Version:  {summary.get('version', 'unknown')}")

        # Main stats
        print("\nDataset Shape:")
        print(f"  Total Rows:       {summary.get('totalRows', 0)}")
        print(f"  Valid Rows:       {summary.get('validRows', 0)}")
        print(f"  Invalid Rows:     {summary.get('invalidRows', 0)}")
        print(f"  Invalid Percent:  {summary.get('invalidPercent', 0):.1f}%")
        print(f"  Unique Users:     {summary.get('uniqueUsers', 0)}")
        print(f"  Feature Columns:  {summary.get('featureCount', 0)}")

        # Warnings
        if self.warnings:
            print("\nWarnings:")
            for warning in self.warnings:
                print(f"  ! {warning}")

        # Errors
        if self.errors:
            print("\nErrors:")
            for error in self.errors:
                print(f"  X {error}")

        # Quality checks
        print("\nQuality Checks:")
        checks = [
            ("Has valid rows", summary.get('validRows', 0) > 0),
            ("Has multiple users", summary.get('uniqueUsers', 0) > 1),
            ("Valid rows >= 80%", summary.get('invalidPercent', 100) <= 20),
            ("Has 12 features", summary.get('featureCount', 0) == 12),
        ]

        for check_name, passed in checks:
            symbol = "OK" if passed else "FAIL"
            print(f"  {symbol}: {check_name}")

        print("="*70 + "\n")

        # Final verdict
        if not self.errors and summary.get('status') == 'PASS':
            print("VERDICT: Dataset looks reasonable for training!\n")
            return True
        elif self.errors:
            print("VERDICT: Dataset has critical errors. Cannot use.\n")
            return False
        else:
            print("VERDICT: Dataset has issues that should be reviewed.\n")
            return False


def main():
    """Main entry point"""
    print("\nTrain-Ready Dataset Sanity Check")
    print("-" * 70)

    # Get input file or use default
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    else:
        # Default: look for export in current directory
        input_file = 'dataset_export.json'

    logger.info(f"Loading dataset from: {input_file}")

    # Initialize checker
    checker = DatasetSanityChecker()

    # Load dataset
    if not checker.load_from_file(input_file):
        logger.error("Failed to load dataset")
        for error in checker.errors:
            print(f"ERROR: {error}")
        return 1

    logger.info(f"Loaded {len(checker.rows)} rows")

    # Run checks
    success, summary = checker.run_checks()

    # Print report
    checker.print_report(summary)

    # Return status
    return 0 if success else 1


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except Exception as e:
        logger.error(f"Sanity check failed: {str(e)}", exc_info=True)
        sys.exit(1)
