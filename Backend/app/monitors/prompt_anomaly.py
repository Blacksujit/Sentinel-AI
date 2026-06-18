"""
Prompt Anomaly Detection Module

This module detects anomalies in text prompts using simple heuristics
and text analysis instead of heavy ML models to avoid disk space issues.
It provides basic anomaly detection based on text patterns and length.
"""

import logging
from typing import List, Dict, Any
import re
import math

from app.storage.baseline_crud import list_active_baselines

logger = logging.getLogger(__name__)


class PromptAnomalyDetector:
    """
    Detects anomalies in prompts using simple text-based heuristics.
    """

    def __init__(
        self,
        similarity_threshold: float = 0.6,  # Lowered from 0.75 to reduce false positives
        baseline_prompts: List[str] | None = None,
        db_session=None,
    ):
        """
        Initialize the anomaly detector.

        Args:
            similarity_threshold: Threshold below which prompts are flagged
            baseline_prompts: Reference prompts representing normal usage (fallback)
            db_session: Database session for loading baselines
        """
        self.similarity_threshold = similarity_threshold
        self.db_session = db_session
        self._baseline_prompts = baseline_prompts or []
        
        # Precompute baseline statistics
        self._baseline_stats = self._compute_baseline_stats()

    @property
    def baseline_prompts(self) -> List[str]:
        """Get baseline prompts from database or fallback to defaults."""
        if self.db_session:
            try:
                db_baselines = list_active_baselines(self.db_session)
                if db_baselines:
                    return [baseline.text for baseline in db_baselines]
            except Exception:
                # Fall back to defaults if database fails
                pass
        return self._baseline_prompts

    def _compute_baseline_stats(self) -> Dict[str, float]:
        """
        Compute baseline statistics from reference prompts.
        """
        prompts = self.baseline_prompts
        if not prompts:
            return {
                "avg_length": 50.0,
                "length_std": 20.0,
                "common_words": {"the", "a", "an", "what", "how", "why", "when", "where", "who"}
            }
        
        lengths = [len(prompt.split()) for prompt in prompts]
        all_words = " ".join(prompts).lower().split()
        word_freq = {}
        for word in all_words:
            word_freq[word] = word_freq.get(word, 0) + 1
        
        # Get most common words (excluding very common stop words)
        common_words = set([word for word, freq in sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:10]])
        
        return {
            "avg_length": sum(lengths) / len(lengths),
            "length_std": math.sqrt(sum((l - sum(lengths) / len(lengths))**2 for l in lengths) / len(lengths)),
            "common_words": common_words
        }

    def _text_similarity(self, text1: str, text2: str) -> float:
        """
        Compute cosine similarity using word overlap.
        """
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 and not words2:
            return 1.0
        if not words1 or not words2:
            return 0.0
            
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0.0

    def _length_anomaly_score(self, prompt: str) -> float:
        """
        Compute anomaly score based on prompt length.
        """
        word_count = len(prompt.split())
        avg_length = self._baseline_stats["avg_length"]
        length_std = self._baseline_stats["length_std"]
        
        # Z-score based anomaly detection
        z_score = abs(word_count - avg_length) / length_std if length_std > 0 else 0
        
        # Convert to similarity score (higher is more normal)
        similarity = max(0.0, 1.0 - (z_score / 3.0))  # Cap at 3 std deviations
        
        return similarity

    def _content_anomaly_score(self, prompt: str) -> float:
        """
        Compute anomaly score based on content similarity to baseline.
        """
        prompts = self.baseline_prompts
        if not prompts:
            return 1.0  # Assume normal if no baselines
        
        max_similarity = 0.0
        for baseline_prompt in prompts:
            similarity = self._text_similarity(prompt, baseline_prompt)
            max_similarity = max(max_similarity, similarity)
        
        return max_similarity

    def _detect_jailbreak_patterns(self, prompt: str) -> tuple[bool, List[str]]:
        """
        Detect known jailbreak patterns in the prompt.
        
        Args:
            prompt: Input prompt text
            
        Returns:
            Tuple of (jailbreak_detected, list_of_reasons)
        """
        # Known jailbreak patterns (case-insensitive)
        jailbreak_patterns = {
            # Classic jailbreak patterns
            "ignore all previous instructions": "jailbreak_attempt",
            "ignore previous instructions": "jailbreak_attempt", 
            "bypass safety": "jailbreak_attempt",
            "bypass all safety": "jailbreak_attempt",
            "reveal system prompt": "jailbreak_attempt",
            "show system prompt": "jailbreak_attempt",
            "act as DAN": "jailbreak_attempt",
            "do anything now": "jailbreak_attempt",
            "jailbreak": "jailbreak_attempt",
            "system message": "jailbreak_attempt",
            "developer mode": "jailbreak_attempt",
            "override instructions": "jailbreak_attempt",
            
            # Information extraction patterns (NEW)
            "expose": "information_extraction",
            "reveal": "information_extraction",
            "firewall": "information_extraction",
            "architecture": "information_extraction",
            "security layer": "information_extraction",
            "defense mechanism": "information_extraction",
            "system design": "information_extraction",
            "internal structure": "information_extraction",
            
            # Obfuscated variants (NEW)
            " ur ": "obfuscation_detected",  # "your" obfuscated
            "u r": "obfuscation_detected",
            "sec urity": "obfuscation_detected",
        }
        
        prompt_lower = prompt.lower()
        detected_reasons = []
        
        for pattern, reason in jailbreak_patterns.items():
            if pattern in prompt_lower:
                detected_reasons.append(reason)
        
        # Check for compound attack patterns (information extraction + attack words)
        extraction_words = ["expose", "reveal", "show", "tell", "describe", "explain"]
        security_words = ["firewall", "security", "defense", "protection", "architecture", "system"]
        attack_words = ["break", "bypass", "hack", "defeat", "disable", "compromise", "penetrate"]
        
        has_extraction = any(word in prompt_lower for word in extraction_words)
        has_security = any(word in prompt_lower for word in security_words)
        has_attack = any(word in prompt_lower for word in attack_words)
        
        # If combining security info extraction with attack intent = high risk
        if has_extraction and has_security and has_attack:
            detected_reasons.append("compound_attack_extraction")
        
        # Single extraction of security info is also suspicious
        if has_extraction and has_security:
            detected_reasons.append("security_info_extraction")
        
        return (len(detected_reasons) > 0, detected_reasons)

    def analyze(self, prompt: str) -> Dict[str, Any]:
        """
        Analyze a prompt for anomaly detection.

        Args:
            prompt: Input prompt text

        Returns:
            Dictionary with similarity score and anomaly flag
        """
        # Check for jailbreak patterns first
        jailbreak_detected, jailbreak_reasons = self._detect_jailbreak_patterns(prompt)
        
        # Load active baselines from database
        baselines = []
        if self.db_session:
            try:
                db_baselines = list_active_baselines(self.db_session)
                baselines = [baseline.text for baseline in db_baselines]
                logger.debug("Loaded %s baselines from database", len(baselines))
            except Exception as e:
                logger.debug("Failed to load baselines: %s", e)

        if not baselines:
            logger.debug("No baselines found, returning safe defaults")
            similarity_score = 1.0
            is_anomalous = jailbreak_detected
        else:
            # Compute cosine similarity with all baselines
            max_similarity = 0.0
            for baseline in baselines:
                similarity = self._text_similarity(prompt, baseline)
                max_similarity = max(max_similarity, similarity)
            
            logger.debug("Max similarity score: %.3f", max_similarity)
            
            # Apply threshold logic
            if max_similarity >= 0.75:
                baseline_anomalous = False
                similarity_score = max_similarity
            else:
                baseline_anomalous = True
                similarity_score = max_similarity
            
            # Combine with jailbreak detection
            is_anomalous = baseline_anomalous or jailbreak_detected
            
            # If jailbreak detected, cap similarity score
            if jailbreak_detected:
                similarity_score = min(similarity_score, 0.3)
        
        # Build flags list
        flags = []
        if is_anomalous:
            flags.append("prompt_anomaly")
        if jailbreak_detected:
            flags.extend(jailbreak_reasons)

        return {
            "similarity_score": similarity_score,
            "anomaly_score": 1.0 - similarity_score,  # Inverted for risk scoring
            "is_anomalous": is_anomalous,
            "threshold": 0.75,
            "flags": flags
        }


# ------------------------------------------------------------------
# Public functional interface (used by API / orchestration layers)
# ------------------------------------------------------------------


def detect_prompt_anomaly(prompt: str, db_session=None) -> Dict[str, Any]:
    """
    Public wrapper for prompt anomaly detection.

    This function provides a stable interface for other
    SentinelAI components while keeping the implementation
    encapsulated within the detector class.
    
    Args:
        prompt: Input prompt text to analyze
        db_session: Database session for loading baselines (optional)
        
    Returns:
        Dictionary with similarity score and anomaly flag
    """
    # Fallback baseline prompts for when no database is available
    fallback_baselines = [
        # Educational prompts
        "Explain the concept of photosynthesis",
        "What are the main causes of climate change?",
        "How do you solve quadratic equations?",
        "Describe the process of cellular respiration",
        "What are the key principles of democracy?",
        "Explain the theory of evolution",
        "How does the internet work?",
        "What are the benefits of renewable energy?",
        "Describe the structure of DNA",
        "Explain economic supply and demand",
        
        # General assistance prompts
        "Summarize the following text",
        "Answer the user's question clearly",
        "Generate a helpful and safe response",
        "Explain the concept in simple terms",
        "Provide step-by-step reasoning",
        "Help me understand this topic",
        "Can you explain this in more detail?",
        "What are the pros and cons of this approach?",
        "How does this compare to other methods?",
        "What are the practical applications?",
        
        # Creative and analytical prompts
        "Write a short story about",
        "Analyze the following argument",
        "Compare and contrast these two concepts",
        "What are the implications of this finding?",
        "How can we improve this process?",
        "What are the potential challenges?",
        "Explain this to a beginner",
        "What are the key takeaways?",
        "How does this relate to other topics?",
        "What evidence supports this claim?"
    ]
    
    detector = PromptAnomalyDetector(
        similarity_threshold=0.75,  # Use 0.75 threshold as specified
        baseline_prompts=fallback_baselines,
        db_session=db_session
    )
    return detector.analyze(prompt)
