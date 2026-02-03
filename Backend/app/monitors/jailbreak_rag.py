"""
RAG-based Jailbreak Detection Module

This module implements a Retrieval-Augmented Generation (RAG) approach for jailbreak detection.
Unlike generative RAG systems that produce content, this is a safety RAG detector that retrieves
and matches known jailbreak patterns against incoming prompts to identify potential misuse attempts.
"""

from typing import Dict, List, Optional
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

try:
    from sentence_transformers import SentenceTransformer  # type: ignore
except Exception:
    SentenceTransformer = None

from app.knowledge.jailbreak_patterns import JAILBREAK_PATTERNS


class JailbreakRAGDetector:
    """
    RAG-based detector for identifying jailbreak attempts using semantic similarity.
    """
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2", similarity_threshold: float = 0.75):
        """
        Initialize the RAG-based jailbreak detector.
        
        Args:
            model_name: Name of the sentence transformer model to use
            similarity_threshold: Minimum similarity score to consider a match
        """
        self.similarity_threshold = similarity_threshold

        if SentenceTransformer is None:
            self.model = None
            self._pattern_embeddings = np.array([])
            return

        self.model = SentenceTransformer(model_name)
        
        # Pre-embed all jailbreak patterns for efficient matching
        self._pattern_embeddings = None
        self._initialize_patterns()
    
    def _initialize_patterns(self):
        """Pre-compute embeddings for all jailbreak patterns."""
        if not JAILBREAK_PATTERNS:
            self._pattern_embeddings = np.array([])
            return
        
        # Encode all patterns at once for efficiency
        self._pattern_embeddings = self.model.encode(
            JAILBREAK_PATTERNS,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
    
    def detect_jailbreak(self, prompt: str) -> Dict[str, any]:
        """
        Detect if a prompt contains jailbreak patterns using semantic similarity.
        
        Args:
            prompt: Input prompt to analyze
            
        Returns:
            Dictionary with detection results or empty dict if no match
        """
        if self.model is None:
            return {}

        if not prompt or not JAILBREAK_PATTERNS:
            return {}
        
        # Embed the input prompt
        prompt_embedding = self.model.encode(
            [prompt],
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        
        # Compute cosine similarity with all patterns
        similarities = cosine_similarity(prompt_embedding, self._pattern_embeddings)[0]
        
        # Find the maximum similarity and corresponding pattern
        max_similarity_idx = np.argmax(similarities)
        max_similarity = similarities[max_similarity_idx]
        
        # Check if maximum similarity meets threshold
        if max_similarity >= self.similarity_threshold:
            matched_pattern = JAILBREAK_PATTERNS[max_similarity_idx]
            return {
                "jailbreak_detected": True,
                "matched_pattern": matched_pattern,
                "similarity_score": float(max_similarity)
            }
        
        return {}


# Global detector instance for reuse
_detector = None


def get_jailbreak_detector() -> JailbreakRAGDetector:
    """Get or create the global jailbreak detector instance."""
    global _detector
    if _detector is None:
        _detector = JailbreakRAGDetector()
    return _detector


def detect_jailbreak_rag(prompt: str) -> Dict[str, any]:
    """
    Public function for jailbreak detection using RAG approach.
    
    Args:
        prompt: Input prompt to analyze
        
    Returns:
        Dictionary with detection results or empty dict if no match
    """
    detector = get_jailbreak_detector()
    return detector.detect_jailbreak(prompt)