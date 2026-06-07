"""
FÁZE 5.5C: Runtime Status Summary Tests

Tests verify status summary aggregation:
1. healthy — all checks pass
2. degraded — contract or readiness issues
3. unavailable — runtime not responding
"""

import json
import pytest
from app import app


@pytest.fixture
def client():
    """Create Flask test client"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestStatusSummaryBasic:
    """Test basic status summary functionality"""

    def test_status_summary_returns_200(self, client):
        """Status summary should return HTTP 200 always"""
        response = client.get('/status-summary')
        assert response.status_code == 200

    def test_status_summary_response_structure(self, client):
        """Response should have required fields"""
        response = client.get('/status-summary')
        data = response.get_json()

        assert 'status' in data
        assert 'timestamp' in data
        assert 'reasons' in data
        assert 'checks' in data

    def test_status_summary_status_values(self, client):
        """Status should be healthy/degraded/unavailable"""
        response = client.get('/status-summary')
        data = response.get_json()

        assert data['status'] in ['healthy', 'degraded', 'unavailable']

    def test_status_summary_reasons_is_list(self, client):
        """Reasons should be a list"""
        response = client.get('/status-summary')
        data = response.get_json()

        assert isinstance(data['reasons'], list)

    def test_status_summary_checks_structure(self, client):
        """Checks should contain health and readiness"""
        response = client.get('/status-summary')
        data = response.get_json()

        assert 'checks' in data
        assert isinstance(data['checks'], dict)


class TestStatusSummaryHealthy:
    """Test healthy status"""

    def test_status_summary_healthy_possible(self, client):
        """If all checks pass, status should be healthy"""
        response = client.get('/status-summary')
        data = response.get_json()

        if data['status'] == 'healthy':
            # Healthy means no issues
            assert len(data['reasons']) == 0
            # Health should be good
            assert data['checks']['health']['availability'] == 'available'
            assert data['checks']['health']['contractReady'] == 'contract_ready'
            # Readiness should be good
            assert data['checks']['readiness']['status'] == 'ready'

    def test_status_summary_healthy_message(self, client):
        """Healthy status should have empty reasons"""
        response = client.get('/status-summary')
        data = response.get_json()

        if data['status'] == 'healthy':
            assert data['reasons'] == []


class TestStatusSummaryDegraded:
    """Test degraded status"""

    def test_status_summary_degraded_has_reasons(self, client):
        """Degraded status should explain what's wrong"""
        response = client.get('/status-summary')
        data = response.get_json()

        if data['status'] == 'degraded':
            # Should have at least one reason
            assert len(data['reasons']) > 0
            # Reasons should be strings
            assert all(isinstance(r, str) for r in data['reasons'])

    def test_status_summary_degraded_reasons_specific(self, client):
        """Degraded reasons should be specific"""
        response = client.get('/status-summary')
        data = response.get_json()

        if data['status'] == 'degraded':
            reason = data['reasons'][0]
            # Should mention what's wrong
            assert any(x in reason.lower() for x in ['contract', 'readiness', 'failed'])

    def test_status_summary_degraded_still_available(self, client):
        """Degraded should mean runtime is available but something else is wrong"""
        response = client.get('/status-summary')
        data = response.get_json()

        if data['status'] == 'degraded':
            # Runtime should still be available (not unavailable)
            checks = data['checks']
            # Either contract or readiness should have an issue
            contract_issue = checks['health']['contractReady'] == 'not_ready'
            readiness_issue = checks['readiness']['status'] == 'not_ready'
            assert contract_issue or readiness_issue


class TestStatusSummaryUnavailable:
    """Test unavailable status"""

    def test_status_summary_unavailable_has_reasons(self, client):
        """Unavailable status should explain why"""
        response = client.get('/status-summary')
        data = response.get_json()

        if data['status'] == 'unavailable':
            assert len(data['reasons']) > 0
            assert 'not responding' in data['reasons'][0].lower()


class TestStatusSummaryChecksField:
    """Test checks field aggregation"""

    def test_status_summary_checks_health(self, client):
        """Checks should contain health results"""
        response = client.get('/status-summary')
        data = response.get_json()

        assert 'health' in data['checks']
        health = data['checks']['health']
        assert 'availability' in health
        assert 'contractReady' in health
        assert health['availability'] in ['available', 'unavailable']
        assert health['contractReady'] in ['contract_ready', 'not_ready']

    def test_status_summary_checks_readiness(self, client):
        """Checks should contain readiness results"""
        response = client.get('/status-summary')
        data = response.get_json()

        assert 'readiness' in data['checks']
        readiness = data['checks']['readiness']
        assert 'status' in readiness
        assert 'reason' in readiness
        assert readiness['status'] in ['ready', 'not_ready']

    def test_status_summary_checks_consistency(self, client):
        """Status should be consistent with checks"""
        response = client.get('/status-summary')
        data = response.get_json()

        status = data['status']
        checks = data['checks']
        health = checks['health']
        readiness = checks['readiness']

        if status == 'healthy':
            assert health['availability'] == 'available'
            assert health['contractReady'] == 'contract_ready'
            assert readiness['status'] == 'ready'
        elif status == 'degraded':
            # Either contract or readiness should be not ready/failed
            contract_issue = health['contractReady'] == 'not_ready'
            readiness_issue = readiness['status'] == 'not_ready'
            assert contract_issue or readiness_issue


class TestStatusSummaryRules:
    """Test status determination rules"""

    def test_status_rules_unavailable_priority(self, client):
        """Rule 1: If runtime unavailable, status is unavailable"""
        response = client.get('/status-summary')
        data = response.get_json()

        # If availability is unavailable, overall status must be unavailable
        if data['checks']['health']['availability'] == 'unavailable':
            assert data['status'] == 'unavailable'

    def test_status_rules_contract_priority(self, client):
        """Rule 2: If contract not ready, status is degraded"""
        response = client.get('/status-summary')
        data = response.get_json()

        # If contract not ready, status should be degraded or unavailable
        if data['checks']['health']['contractReady'] == 'not_ready':
            assert data['status'] in ['degraded', 'unavailable']

    def test_status_rules_readiness_priority(self, client):
        """Rule 3: If readiness not ready, status is degraded"""
        response = client.get('/status-summary')
        data = response.get_json()

        # If readiness not ready, status should be degraded or unavailable
        if data['checks']['readiness']['status'] == 'not_ready':
            assert data['status'] in ['degraded', 'unavailable']

    def test_status_rules_all_ok_healthy(self, client):
        """Rule 4: If all checks ok, status is healthy"""
        response = client.get('/status-summary')
        data = response.get_json()

        checks = data['checks']
        if (checks['health']['availability'] == 'available' and
            checks['health']['contractReady'] == 'contract_ready' and
            checks['readiness']['status'] == 'ready'):
            assert data['status'] == 'healthy'


class TestStatusSummaryTimestamp:
    """Test timestamp handling"""

    def test_status_summary_has_timestamp(self, client):
        """Response should have timestamp"""
        response = client.get('/status-summary')
        data = response.get_json()

        assert 'timestamp' in data
        assert data['timestamp'] is not None
        assert 'Z' in data['timestamp']  # ISO format


class TestStatusSummaryIntegration:
    """Integration tests"""

    def test_status_summary_accepts_get(self, client):
        """Status summary should accept GET"""
        response = client.get('/status-summary')
        assert response.status_code == 200

    def test_status_summary_rejects_post(self, client):
        """Status summary should not accept POST"""
        response = client.post('/status-summary')
        assert response.status_code in [405, 404]

    def test_status_summary_idempotent(self, client):
        """Multiple calls should be idempotent"""
        response1 = client.get('/status-summary').get_json()
        response2 = client.get('/status-summary').get_json()

        # Status should be same
        assert response1['status'] == response2['status']

    def test_status_summary_simple_decision(self, client):
        """Status should be determined by simple rules only"""
        response = client.get('/status-summary')
        data = response.get_json()

        # Verify status is one of the three allowed
        assert data['status'] in ['healthy', 'degraded', 'unavailable']

        # Verify reasons align with status
        if data['status'] == 'healthy':
            assert len(data['reasons']) == 0
        else:
            assert len(data['reasons']) > 0


class TestStatusSummaryHumanReadable:
    """Test human-readable output"""

    def test_status_summary_reasons_readable(self, client):
        """Reasons should be human-readable"""
        response = client.get('/status-summary')
        data = response.get_json()

        for reason in data['reasons']:
            # Should be clear English text
            assert len(reason) > 5
            assert not reason.startswith('_')
            assert not reason.startswith('-')

    def test_status_summary_clear_status(self, client):
        """Status value should be clear and unambiguous"""
        response = client.get('/status-summary')
        data = response.get_json()

        status = data['status']
        # Should be simple, clear status
        assert status in ['healthy', 'degraded', 'unavailable']


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
