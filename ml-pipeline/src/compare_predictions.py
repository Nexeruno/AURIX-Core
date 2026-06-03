"""
Compare Level 1 and Level 2 predictions
Analyzes differences and stores comparison data
"""
import logging
from typing import Dict, Optional, List

import config

logger = logging.getLogger(__name__)


def compare_level1_vs_level2(
    level1_prediction: Optional[Dict],
    level2_data: Dict
) -> Dict:
    """
    Compare Level 1 and Level 2 predictions

    Args:
        level1_prediction: Level 1 prediction dict or None
        level2_data: Level 2 prediction data

    Returns:
        Comparison dict
    """

    comparison = {
        'level1_available': level1_prediction is not None,
        'level2_total': level2_data.get('total_predicted', 0),
    }

    if not level1_prediction:
        logger.info("ℹ️ No Level 1 prediction to compare")
        return comparison

    level1_total = level1_prediction.get('totalPredictedExpense', 0)
    level2_total = level2_data.get('total_predicted', 0)

    if level1_total == 0:
        difference_percent = 0
    else:
        difference_percent = ((level2_total - level1_total) / level1_total) * 100

    difference_czk = level2_total - level1_total

    comparison.update({
        'level1_total': round(level1_total, 2),
        'level2_total': round(level2_total, 2),
        'difference_czk': round(difference_czk, 2),
        'difference_percent': round(difference_percent, 2),
        'level1_confidence': level1_prediction.get('confidence', 'unknown'),
        'level1_confidence_score': level1_prediction.get('confidenceScore', 0),
    })

    # Category-level comparison
    if 'categories' in level1_prediction and 'categories' in level2_data:
        comparison['category_differences'] = _compare_categories(
            level1_prediction['categories'],
            level2_data['categories']
        )

    logger.info(
        f"✅ Predictions compared:\n"
        f"   Level 1: {level1_total:.0f} Kč\n"
        f"   Level 2: {level2_total:.0f} Kč\n"
        f"   Difference: {difference_czk:.0f} Kč ({difference_percent:.1f}%)"
    )

    return comparison


def _compare_categories(
    level1_categories: Dict[str, float],
    level2_categories: Dict[str, float]
) -> Dict[str, Dict]:
    """
    Compare predictions by category

    Returns:
        Dict with category-level differences
    """

    result = {}

    for category in config.KATEGORIE_VYDAJ:
        l1 = level1_categories.get(category, 0)
        l2 = level2_categories.get(category, 0)

        if l1 == 0:
            diff_percent = 0
        else:
            diff_percent = ((l2 - l1) / l1) * 100

        result[category] = {
            'level1': round(l1, 2),
            'level2': round(l2, 2),
            'difference_czk': round(l2 - l1, 2),
            'difference_percent': round(diff_percent, 2),
        }

    return result


def generate_comparison_summary(
    comparison: Dict,
    fallback_used: bool
) -> str:
    """
    Generate human-readable comparison summary

    Args:
        comparison: Comparison dict
        fallback_used: Whether fallback was used

    Returns:
        Formatted summary text
    """

    summary = []

    if fallback_used:
        summary.append("🔄 Fallback (málo dat)")
    else:
        summary.append("🤖 ML Model")

    if not comparison.get('level1_available'):
        summary.append("⚠️ Bez srovnání s Level 1 (nedostupné)")
        return " • ".join(summary)

    level1 = comparison.get('level1_total', 0)
    level2 = comparison.get('level2_total', 0)
    diff = comparison.get('difference_czk', 0)
    diff_pct = comparison.get('difference_percent', 0)

    if abs(diff) < 100:
        summary.append("✅ Téměř stejné jako Level 1")
    elif diff > 0:
        summary.append(f"⬆️ O {abs(diff):.0f} Kč vyšší ({abs(diff_pct):.1f}%)")
    else:
        summary.append(f"⬇️ O {abs(diff):.0f} Kč nižší ({abs(diff_pct):.1f}%)")

    return " • ".join(summary)


def should_raise_alert(comparison: Dict) -> Tuple[bool, Optional[str]]:
    """
    Determine if there's a significant divergence worth investigating

    Args:
        comparison: Comparison dict

    Returns:
        Tuple of (should_alert, alert_reason)
    """

    if not comparison.get('level1_available'):
        return False, None

    diff_percent = abs(comparison.get('difference_percent', 0))

    # Alert if difference > 30%
    if diff_percent > 30:
        return True, f"Velký rozdíl od Level 1: {diff_percent:.1f}%"

    # Alert if Level 1 confidence is high but Level 2 differs significantly
    level1_conf = comparison.get('level1_confidence_score', 0)
    if level1_conf > 80 and diff_percent > 15:
        return True, f"Level 1 je jistý, ale Level 2 se liší o {diff_percent:.1f}%"

    return False, None
