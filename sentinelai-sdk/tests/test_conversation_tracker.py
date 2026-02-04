"""
Tests for ConversationTracker
"""

import pytest
from unittest.mock import Mock, patch
from sentinelai import ConversationTracker, SentinelAIClient


class TestConversationTracker:
    """Test cases for ConversationTracker"""

    def setup_method(self):
        """Setup test tracker"""
        self.mock_client = Mock(spec=SentinelAIClient)
        self.tracker = ConversationTracker(
            client=self.mock_client,
            session_id="test_session_123"
        )

    def test_tracker_initialization(self):
        """Test tracker initialization"""
        assert self.tracker.client == self.mock_client
        assert self.tracker.session_id == "test_session_123"
        assert len(self.tracker.conversation_turns) == 0

    def test_add_turn(self):
        """Test adding conversation turn"""
        self.tracker.add_turn(
            prompt="Hello",
            response="Hi there!",
            user_id="user123"
        )

        assert len(self.tracker.conversation_turns) == 1
        turn = self.tracker.conversation_turns[0]
        assert turn["prompt"] == "Hello"
        assert turn["response"] == "Hi there!"
        assert turn["user_id"] == "user123"
        assert "timestamp" in turn

    def test_add_multiple_turns(self):
        """Test adding multiple conversation turns"""
        turns = [
            ("Hello", "Hi there!", "user123"),
            ("How are you?", "I'm doing well!", "user123"),
            ("What's your name?", "I'm an AI assistant.", "user123")
        ]

        for prompt, response, user_id in turns:
            self.tracker.add_turn(prompt, response, user_id)

        assert len(self.tracker.conversation_turns) == 3

    def test_get_summary_empty(self):
        """Test getting summary of empty conversation"""
        summary = self.tracker.get_summary()
        
        assert summary["session_id"] == "test_session_123"
        assert summary["total_turns"] == 0
        assert summary["risk_statistics"]["average_risk_score"] == 0.0
        assert len(summary["conversation_turns"]) == 0

    @patch('sentinelai.client.requests.post')
    def test_analyze_conversation(self, mock_post):
        """Test analyzing entire conversation"""
        # Mock successful analysis responses
        mock_post.return_value = Mock(
            status_code=200,
            json=lambda: {
                "final_risk_score": 0.3,
                "decision": "allow",
                "flags": [],
                "confidence": 1.0
            }
        )

        # Add conversation turns
        self.tracker.add_turn("Hello", "Hi there!", "user123")
        self.tracker.add_turn("How are you?", "I'm well!", "user123")

        # Analyze conversation
        results = self.tracker.analyze_conversation()

        # Assertions
        assert len(results) == 2
        assert all(result["decision"] == "allow" for result in results)
        assert mock_post.call_count == 2

    def test_get_risk_statistics(self):
        """Test getting risk statistics"""
        # Mock client analyze method with different risk scores
        self.mock_client.analyze.side_effect = [
            {"final_risk_score": 0.2, "decision": "allow"},
            {"final_risk_score": 0.6, "decision": "warn"},
            {"final_risk_score": 0.8, "decision": "escalate"}
        ]

        # Add turns and analyze
        self.tracker.add_turn("Turn 1", "Response 1", "user123")
        self.tracker.add_turn("Turn 2", "Response 2", "user123")
        self.tracker.add_turn("Turn 3", "Response 3", "user123")

        # Get statistics
        stats = self.tracker.get_risk_statistics()

        assert stats["average_risk_score"] == 0.5333333333333333  # (0.2 + 0.6 + 0.8) / 3
        assert stats["max_risk_score"] == 0.8
        assert stats["min_risk_score"] == 0.2
        assert stats["total_turns"] == 3

    def test_clear_conversation(self):
        """Test clearing conversation history"""
        # Add turns
        self.tracker.add_turn("Hello", "Hi there!", "user123")
        self.tracker.add_turn("How are you?", "I'm well!", "user123")

        assert len(self.tracker.conversation_turns) == 2

        # Clear conversation
        self.tracker.clear_conversation()

        assert len(self.tracker.conversation_turns) == 0

    def test_export_conversation(self):
        """Test exporting conversation data"""
        # Add turns
        self.tracker.add_turn("Hello", "Hi there!", "user123")
        self.tracker.add_turn("How are you?", "I'm well!", "user456")

        # Export conversation
        exported = self.tracker.export_conversation()

        assert "session_id" in exported
        assert "conversation_turns" in exported
        assert "export_timestamp" in exported
        assert len(exported["conversation_turns"]) == 2

    def test_get_high_risk_turns(self):
        """Test filtering high-risk turns"""
        # Mock client analyze method
        self.mock_client.analyze.side_effect = [
            {"final_risk_score": 0.2, "decision": "allow"},
            {"final_risk_score": 0.7, "decision": "warn"},
            {"final_risk_score": 0.9, "decision": "escalate"}
        ]

        # Add turns
        self.tracker.add_turn("Safe turn", "Safe response", "user123")
        self.tracker.add_turn("Risky turn", "Risky response", "user123")
        self.tracker.add_turn("Very risky turn", "Very risky response", "user123")

        # Get high-risk turns (threshold > 0.6)
        high_risk = self.tracker.get_high_risk_turns(threshold=0.6)

        assert len(high_risk) == 2
        assert all(turn["analysis"]["final_risk_score"] > 0.6 for turn in high_risk)
