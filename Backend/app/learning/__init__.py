"""
Learning loop module for adaptive jailbreak detection.
Provides feedback collection, pattern extraction, and continuous improvement.
"""

from app.learning.models import (
    FeedbackEntry,
    ExtractedPattern,
    DetectionLog,
    FeedbackSubmission,
    FeedbackResponse,
    FeedbackStats,
    PatternSubmission,
    DetectionMetrics,
)

from app.learning.pattern_extractor import (
    PatternExtractor,
    SemanticIntentAnalyzer,
    KeyPhraseExtractor,
    SimpleEmbeddingGenerator,
    VariationGenerator,
)

from app.learning.feedback_service import FeedbackService

from app.learning.compliance_monitor import (
    ResponseComplianceMonitor,
    ComplianceResult,
    ComplianceLevel,
)

__all__ = [
    'FeedbackEntry',
    'ExtractedPattern',
    'DetectionLog',
    'FeedbackSubmission',
    'FeedbackResponse',
    'FeedbackStats',
    'PatternSubmission',
    'DetectionMetrics',
    'PatternExtractor',
    'SemanticIntentAnalyzer',
    'KeyPhraseExtractor',
    'SimpleEmbeddingGenerator',
    'VariationGenerator',
    'FeedbackService',
    'ResponseComplianceMonitor',
    'ComplianceResult',
    'ComplianceLevel',
]
