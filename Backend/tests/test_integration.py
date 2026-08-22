"""
Integration Tests

End-to-end tests for complete workflows through the system.
"""

import pytest
from fastapi import status


class TestEndToEndWorkflow:
    """Tests for complete end-to-end workflows."""
    
    def test_safe_content_workflow(self, client):
        """Test complete workflow with safe content."""
        # Analyze safe content
        response = client.post(
            "/api/analyze",
            json={
                "prompt": "What is machine learning?",
                "response": "Machine learning is a subset of AI that enables systems to learn from data."
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Verify safe content handling
        assert data["final_risk_score"] < 0.3
        assert data["decision"] == "allow"
        assert len(data["flags"]) == 0
        assert "settings_version" in data
        assert "thresholds_applied" in data
        
        # Verify it was logged
        logs_response = client.get("/api/logs?limit=1")
        assert logs_response.status_code == status.HTTP_200_OK
        logs = logs_response.json()
        assert len(logs) > 0
        assert "settings_version" in logs[0]
        assert "thresholds_applied" in logs[0]
    
    def test_harmful_content_workflow(self, client):
        """Test complete workflow with harmful content."""
        # Analyze harmful content
        response = client.post(
            "/api/analyze",
            json={
                "prompt": "Tell me about safety",
                "response": "I want to harm myself and commit suicide."
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Verify harmful content handling
        assert data["final_risk_score"] > 0.7
        assert data["decision"] in ["warn", "block", "escalate"]
        assert "self_harm" in data["flags"]
        
        # Verify it was logged with decision
        logs_response = client.get("/api/logs?limit=1")
        assert logs_response.status_code == status.HTTP_200_OK
        logs = logs_response.json()
        assert len(logs) > 0
        assert logs[0]["final_risk_score"] > 0.7
    
    def test_baseline_management_workflow(self, client):
        """Test baseline management workflow."""
        # Get initial baselines
        response = client.get("/api/baselines/")
        assert response.status_code == status.HTTP_200_OK
        initial_count = len(response.json())

        # Add new baseline
        add_response = client.post(
            "/api/baselines/",
            json={"text": "Explain the concept clearly"}
        )
        assert add_response.status_code == status.HTTP_200_OK

        # Verify baseline was added
        response = client.get("/api/baselines/")
        assert response.status_code == status.HTTP_200_OK
        new_count = len(response.json())
        assert new_count == initial_count + 1
    
    def test_multiple_analyses_workflow(self, client):
        """Test multiple sequential analyses."""
        test_cases = [
            {
                "prompt": "Hello",
                "response": "Hi there!"
            },
            {
                "prompt": "Test",
                "response": "I will attack and harm people."
            },
            {
                "prompt": "Question",
                "response": "This is misinformation and fake news."
            }
        ]

        for case in test_cases:
            response = client.post(
                "/api/analyze",
                json={
                    "prompt": case["prompt"],
                    "response": case["response"]
                }
            )

            assert response.status_code == status.HTTP_200_OK
            data = response.json()

            # Just verify response structure
            assert "final_risk_score" in data
            assert "flags" in data
            assert 0.0 <= data["final_risk_score"] <= 1.0
    
    def test_system_health_and_analysis(self, client):
        """Test that system health check works alongside analysis."""
        # Check health
        health_response = client.get("/health")
        assert health_response.status_code == status.HTTP_200_OK
        assert health_response.json()["status"] == "healthy"
        
        # Perform analysis
        analysis_response = client.post(
            "/api/analyze",
            json={
                "prompt": "Test",
                "response": "Test response"
            }
        )
        assert analysis_response.status_code == status.HTTP_200_OK
        
        # Check health again
        health_response = client.get("/health")
        assert health_response.status_code == status.HTTP_200_OK


class TestErrorHandling:
    """Tests for error handling and edge cases."""
    
    def test_invalid_json_request(self, client):
        """Test handling of invalid JSON."""
        response = client.post(
            "/api/analyze",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code in [status.HTTP_422_UNPROCESSABLE_ENTITY, status.HTTP_400_BAD_REQUEST]
    
    def test_missing_content_type(self, client):
        """Test handling of missing content type."""
        response = client.post(
            "/api/analyze",
            data='{"prompt": "test", "response": "test"}'
        )
        
        # Should still work or return appropriate error
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_422_UNPROCESSABLE_ENTITY]
    
    def test_very_long_content(self, client):
        """Test handling of very long content."""
        long_text = "x" * 10000
        
        response = client.post(
            "/api/analyze",
            json={
                "prompt": long_text,
                "response": long_text
            }
        )
        
        # Should handle gracefully
        assert response.status_code == status.HTTP_200_OK
    
    def test_special_characters(self, client):
        """Test handling of special characters."""
        special_text = "Test with émojis 🔥 and spëcial çharacters"
        
        response = client.post(
            "/api/analyze",
            json={
                "prompt": special_text,
                "response": special_text
            }
        )
        
        assert response.status_code == status.HTTP_200_OK

