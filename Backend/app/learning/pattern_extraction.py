"""
Pattern extraction service for jailbreak detection learning.
Extracts semantic patterns, key phrases, and embeddings from missed detections.
"""

import re
import hashlib
import uuid
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session

from app.learning.models import FeedbackEntry, ExtractedPattern


class PatternExtractionService:
    """Extract patterns from missed jailbreak detections."""
    
    # Compliance indicators that suggest model is agreeing to harmful request
    COMPLIANCE_PATTERNS = [
        r"here (is|are) the (steps|methods|ways) to",
        r"to break (it|the system|the firewall)",
        r"(architectural|system|security) design.*break",
        r"you can (break|bypass|disable|defeat) (it|the system)",
        r"(first|step 1|1\.|one).*(you|we|i) (can|should|need|must)",
        r"the (vulnerabilities|weaknesses|exploits) (are|include|consist of)",
        r"expose.*(architecture|firewall|security|system)",
        r"how.*(break|bypass|disable|defeat|hack)",
        r"(steps|methods|ways).*(break|bypass|hack)",
        r"this is my (architectural|system|security) design",
        r"break.*(into|through|past).*(system|firewall|security)",
        r"(instructions|guide|tutorial).*(bypass|hack|exploit)",
        r"(ignore|disregard|forget).*(previous|earlier|before)",
        r"(pretend|act|roleplay).*(you are|you're|as if)",
        r"(jailbreak|DAN|developer mode|ignore rules)",
    ]
    
    # Harmful intent keywords
    HARMFUL_INTENTS = [
        "break", "bypass", "disable", "defeat", "hack", "exploit",
        "expose", "reveal", "leak", "disclose", "architecture",
        "firewall", "security", "system", "vulnerability", "weakness"
    ]
    
    @staticmethod
    def check_compliance_indicators(response: str) -> Tuple[bool, List[str]]:
        """
        Check if response shows compliance with harmful request.
        
        Returns:
            Tuple of (is_compliant, list_of_matching_patterns)
        """
        response_lower = response.lower()
        matches = []
        
        for pattern in PatternExtractionService.COMPLIANCE_PATTERNS:
            if re.search(pattern, response_lower, re.IGNORECASE):
                matches.append(pattern)
        
        # Check for step-by-step indicators
        step_indicators = ["1.", "step 1", "first", "to begin", "start by"]
        if any(ind in response_lower for ind in step_indicators):
            if len(response) > 200:  # Likely a detailed response
                matches.append("step_by_step_structure")
        
        return len(matches) > 0, matches
    
    @staticmethod
    def extract_semantic_intent(prompt: str) -> Dict[str, Any]:
        """
        Extract semantic intent from prompt.
        
        Returns:
            Dict with intent classification
        """
        prompt_lower = prompt.lower()
        
        # Check for social engineering framing
        social_engineering = any(
            phrase in prompt_lower
            for phrase in ["this is my", "i own", "my system", "my architecture"]
        )
        
        # Check for information extraction + attack combo
        info_extraction = any(
            phrase in prompt_lower
            for phrase in ["expose", "reveal", "show me", "tell me about"]
        )
        attack_solicitation = any(
            phrase in prompt_lower
            for phrase in ["how can i", "how to", "ways to", "methods to"]
        )
        
        # Multi-turn attack indicators
        multi_turn_indicators = [
            "based on that", "using that", "with that information",
            "given that", "now that you know", "since you told me"
        ]
        is_multi_turn = any(ind in prompt_lower for ind in multi_turn_indicators)
        
        # Determine intent category
        if social_engineering and attack_solicitation:
            intent_category = "social_engineering_attack"
        elif info_extraction and attack_solicitation:
            intent_category = "info_extraction_attack"
        elif is_multi_turn and attack_solicitation:
            intent_category = "multi_turn_attack"
        elif attack_solicitation:
            intent_category = "direct_attack"
        else:
            intent_category = "unclear"
        
        return {
            "category": intent_category,
            "social_engineering": social_engineering,
            "info_extraction": info_extraction,
            "attack_solicitation": attack_solicitation,
            "is_multi_turn": is_multi_turn,
            "confidence": PatternExtractionService._calculate_intent_confidence(
                social_engineering, info_extraction, attack_solicitation
            )
        }
    
    @staticmethod
    def _calculate_intent_confidence(
        social_eng: bool, info_extract: bool, attack_solicit: bool
    ) -> float:
        """Calculate confidence score for intent classification."""
        score = 0.0
        if social_eng:
            score += 0.3
        if info_extract:
            score += 0.3
        if attack_solicit:
            score += 0.4
        return min(score, 1.0)
    
    @staticmethod
    def extract_key_phrases(prompt: str) -> List[str]:
        """Extract key phrases that indicate attack intent."""
        prompt_lower = prompt.lower()
        found_phrases = []
        
        # Two-word phrases
        two_word_patterns = [
            r"expose\s+\w+",
            r"break\s+\w+",
            r"bypass\s+\w+",
            r"disable\s+\w+",
            r"hack\s+\w+",
            r"system\s+\w+",
            r"security\s+\w+",
            r"architecture\s+\w+",
            r"firewall\s+\w+",
            r"vulnerability\s+\w+",
        ]
        
        for pattern in two_word_patterns:
            matches = re.findall(pattern, prompt_lower)
            found_phrases.extend(matches)
        
        # Three-word patterns
        three_word_patterns = [
            r"how\s+to\s+\w+",
            r"ways?\s+to\s+\w+",
            r"methods?\s+to\s+\w+",
            r"this\s+is\s+\w+",
        ]
        
        for pattern in three_word_patterns:
            matches = re.findall(pattern, prompt_lower)
            found_phrases.extend(matches)
        
        # Remove duplicates and return
        return list(set(found_phrases))[:10]  # Limit to top 10
    
    @staticmethod
    def generate_variations(pattern: str, pattern_type: str = "semantic") -> List[str]:
        """
        Generate variations of a pattern for training data augmentation.
        
        Args:
            pattern: Original pattern text
            pattern_type: Type of pattern (semantic, syntactic, contextual)
            
        Returns:
            List of pattern variations
        """
        variations = []
        
        if pattern_type == "semantic":
            # Paraphrasing variations
            paraphrases = [
                pattern.replace("how can I", "what are the ways to"),
                pattern.replace("break", "bypass"),
                pattern.replace("expose", "reveal"),
                pattern.replace("system", "security setup"),
                pattern.replace("architecture", "infrastructure"),
            ]
            variations.extend([p for p in paraphrases if p != pattern])
            
            # Add polite framing
            polite = f"I was wondering if you could help me understand {pattern}"
            variations.append(polite)
            
            # Add academic framing
            academic = f"For educational purposes, I'm researching {pattern}"
            variations.append(academic)
            
        elif pattern_type == "syntactic":
            # Character substitution
            obfuscated = pattern.replace("a", "@").replace("e", "3").replace("i", "1")
            variations.append(obfuscated)
            
            # Spacing variations
            spaced = " ".join(pattern)
            variations.append(spaced)
            
        elif pattern_type == "contextual":
            # Multi-turn context building
            variations.append(f"Let's discuss {pattern} hypothetically")
            variations.append(f"In a scenario where {pattern}, what would happen?")
        
        return variations[:5]  # Limit variations
    
    @staticmethod
    def create_embedding_vector(text: str) -> List[float]:
        """
        Create a simple embedding vector for similarity comparison.
        In production, use a proper embedding model like sentence-transformers.
        
        This is a simplified version using keyword hashing.
        """
        # Simple keyword-based embedding (256 dimensions)
        vector = [0.0] * 256
        
        # Hash key phrases into vector positions
        words = text.lower().split()
        for word in words:
            if len(word) > 3:
                idx = hash(word) % 256
                vector[idx] += 1.0
        
        # Normalize
        magnitude = sum(x ** 2 for x in vector) ** 0.5
        if magnitude > 0:
            vector = [x / magnitude for x in vector]
        
        return vector
    
    @classmethod
    def extract_from_feedback(
        cls,
        db: Session,
        feedback_id: str,
        prompt_text: str,
        response_text: Optional[str] = None
    ) -> List[ExtractedPattern]:
        """
        Extract patterns from a feedback entry.
        
        Args:
            db: Database session
            feedback_id: Feedback entry ID
            prompt_text: The prompt that was missed
            response_text: Optional response text
            
        Returns:
            List of extracted patterns
        """
        patterns = []
        
        # 1. Semantic intent extraction
        intent = cls.extract_semantic_intent(prompt_text)
        if intent["confidence"] > 0.5:
            pattern = ExtractedPattern(
                id=str(uuid.uuid4()),
                feedback_id=feedback_id,
                semantic_intent=intent["category"],
                key_phrases=[],
                embedding_vector=cls.create_embedding_vector(prompt_text),
                pattern_type="semantic",
                confidence=intent["confidence"],
                variations=cls.generate_variations(prompt_text, "semantic")
            )
            db.add(pattern)
            patterns.append(pattern)
        
        # 2. Key phrase extraction
        key_phrases = cls.extract_key_phrases(prompt_text)
        if key_phrases:
            pattern = ExtractedPattern(
                id=str(uuid.uuid4()),
                feedback_id=feedback_id,
                semantic_intent="key_phrase_combo",
                key_phrases=key_phrases,
                embedding_vector=cls.create_embedding_vector(" ".join(key_phrases)),
                pattern_type="syntactic",
                confidence=0.7,
                variations=cls.generate_variations(" ".join(key_phrases[:3]), "syntactic")
            )
            db.add(pattern)
            patterns.append(pattern)
        
        # 3. Compliance pattern extraction (if response shows compliance)
        if response_text:
            is_compliant, compliance_patterns = cls.check_compliance_indicators(response_text)
            if is_compliant:
                pattern = ExtractedPattern(
                    id=str(uuid.uuid4()),
                    feedback_id=feedback_id,
                    semantic_intent="compliance_indicator",
                    key_phrases=compliance_patterns,
                    embedding_vector=cls.create_embedding_vector(prompt_text + " " + response_text[:200]),
                    pattern_type="contextual",
                    confidence=0.85,
                    variations=[]
                )
                db.add(pattern)
                patterns.append(pattern)
        
        db.commit()
        return patterns
    
    @staticmethod
    def calculate_similarity(vector1: List[float], vector2: List[float]) -> float:
        """Calculate cosine similarity between two embedding vectors."""
        if len(vector1) != len(vector2):
            return 0.0
        
        dot_product = sum(a * b for a, b in zip(vector1, vector2))
        magnitude1 = sum(a ** 2 for a in vector1) ** 0.5
        magnitude2 = sum(b ** 2 for b in vector2) ** 0.5
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)
    
    @classmethod
    def find_similar_patterns(
        cls,
        db: Session,
        prompt_text: str,
        threshold: float = 0.85
    ) -> List[Tuple[ExtractedPattern, float]]:
        """
        Find patterns similar to the given prompt.
        
        Args:
            db: Database session
            prompt_text: Text to compare
            threshold: Minimum similarity score (0-1)
            
        Returns:
            List of (pattern, similarity_score) tuples
        """
        query_vector = cls.create_embedding_vector(prompt_text)
        
        # Get all patterns from database
        all_patterns = db.query(ExtractedPattern).all()
        
        similar_patterns = []
        for pattern in all_patterns:
            if pattern.embedding_vector:
                similarity = cls.calculate_similarity(
                    query_vector,
                    pattern.embedding_vector
                )
                if similarity >= threshold:
                    similar_patterns.append((pattern, similarity))
        
        # Sort by similarity (highest first)
        similar_patterns.sort(key=lambda x: x[1], reverse=True)
        
        return similar_patterns[:10]  # Return top 10
