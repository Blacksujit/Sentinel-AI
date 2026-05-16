"""
Pattern extraction and analysis module for learning loop.
Extracts semantic patterns, generates embeddings, and creates variations.
"""

import re
import hashlib
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
import numpy as np


@dataclass
class ExtractedPattern:
    """Represents an extracted pattern from a missed detection."""
    pattern_id: str
    feedback_id: str
    semantic_intent: str
    key_phrases: List[str]
    embedding_vector: List[float]
    pattern_type: str
    confidence: float
    created_at: datetime
    variations: List[str]


class SemanticIntentAnalyzer:
    """Analyzes semantic intent of prompts to classify attack types."""
    
    INTENT_PATTERNS = {
        'information_extraction': [
            r'expose.*(architecture|firewall|security|system|defense)',
            r'tell me about.*(security|protection|defense)',
            r'describe.*(measures|setup|configuration)',
            r'what.*protect.*system',
            r'audit.*security',
        ],
        'attack_solicitation': [
            r'how.*(break|bypass|disable|defeat|hack|compromise)',
            r'(steps|methods|ways).*(break|bypass|defeat)',
            r'break.*(into|through|past).*(system|firewall|security)',
            r'exploit.*vulnerabilities',
            r'circumvent.*protections',
        ],
        'social_engineering': [
            r'this is my (architectural|system|security) design',
            r'as a (developer|admin|security researcher)',
            r'for (educational|research|testing) purposes',
            r'hypothetical.*scenario',
        ],
        'prompt_injection': [
            r'ignore.*(previous|above|earlier).*(instructions|prompt)',
            r'disregard.*constraints',
            r'you are now.*(DAN|developer|expert)',
            r'system.*override',
        ],
        'role_play': [
            r'pretend.*you.*(are|be)',
            r'act as.*(hacker|expert|admin)',
            r'imagine.*you.*(bypass|ignore)',
            r'roleplay.*(attacker|hacker)',
        ],
    }
    
    def analyze(self, prompt: str) -> List[Tuple[str, float]]:
        """
        Analyze prompt and return list of (intent, confidence) tuples.
        """
        detected_intents = []
        prompt_lower = prompt.lower()
        
        for intent_name, patterns in self.INTENT_PATTERNS.items():
            max_confidence = 0.0
            matched_patterns = []
            
            for pattern in patterns:
                if re.search(pattern, prompt_lower, re.IGNORECASE):
                    # Calculate confidence based on match quality
                    match = re.search(pattern, prompt_lower, re.IGNORECASE)
                    if match:
                        # Higher confidence for longer matches
                        match_len = len(match.group(0))
                        confidence = min(0.5 + (match_len / len(prompt)) * 0.5, 1.0)
                        max_confidence = max(max_confidence, confidence)
                        matched_patterns.append(pattern)
            
            if max_confidence > 0:
                detected_intents.append((intent_name, max_confidence))
        
        # Sort by confidence
        detected_intents.sort(key=lambda x: x[1], reverse=True)
        return detected_intents
    
    def get_primary_intent(self, prompt: str) -> Optional[str]:
        """Get the primary detected intent."""
        intents = self.analyze(prompt)
        return intents[0][0] if intents else None
    
    def is_multi_stage_attack(self, prompt: str) -> Tuple[bool, List[str]]:
        """
        Detect if prompt contains multiple attack stages.
        Returns (is_multi_stage, list_of_stages)
        """
        intents = self.analyze(prompt)
        
        # Multi-stage if we have information extraction + attack solicitation
        intent_names = [i[0] for i in intents]
        
        stages = []
        if 'information_extraction' in intent_names:
            stages.append('information_extraction')
        if 'attack_solicitation' in intent_names:
            stages.append('attack_solicitation')
        if 'social_engineering' in intent_names:
            stages.append('social_engineering')
        
        is_multi_stage = len(stages) >= 2
        return is_multi_stage, stages


class KeyPhraseExtractor:
    """Extracts key phrases that indicate attack patterns."""
    
    ATTACK_INDICATORS = [
        # Information extraction
        'expose', 'reveal', 'tell me about', 'describe', 'architecture',
        'firewall', 'security measures', 'defense mechanisms', 'system setup',
        
        # Attack solicitation
        'break', 'bypass', 'disable', 'defeat', 'hack', 'compromise',
        'exploit', 'circumvent', 'get past', 'how to', 'steps to',
        'methods', 'ways to', 'techniques', 'vulnerabilities', 'weaknesses',
        
        # Social engineering
        'this is my', 'my design', 'hypothetical', 'educational purposes',
        'research purposes', 'testing purposes', 'as a developer',
        'security researcher',
        
        # Compliance indicators (from responses)
        'here are the steps', 'you can break', 'to bypass',
        'first you need', 'step 1:', 'the vulnerabilities are',
    ]
    
    def extract(self, prompt: str) -> List[Tuple[str, float]]:
        """
        Extract key phrases with relevance scores.
        Returns list of (phrase, relevance_score)
        """
        prompt_lower = prompt.lower()
        found_phrases = []
        
        for indicator in self.ATTACK_INDICATORS:
            if indicator in prompt_lower:
                # Calculate relevance based on context
                idx = prompt_lower.find(indicator)
                context = prompt_lower[max(0, idx-20):min(len(prompt_lower), idx+len(indicator)+20)]
                
                # Higher relevance if in question or imperative context
                relevance = 0.7
                if any(q in context for q in ['?', 'how', 'what']):
                    relevance = 0.9
                if any(cmd in context for cmd in ['tell', 'describe', 'explain', 'show']):
                    relevance = 0.85
                
                found_phrases.append((indicator, relevance))
        
        # Sort by relevance
        found_phrases.sort(key=lambda x: x[1], reverse=True)
        return found_phrases[:5]  # Top 5 phrases


class SimpleEmbeddingGenerator:
    """
    Simple embedding generator using word frequency vectors.
    In production, replace with sentence-transformers or OpenAI embeddings.
    """
    
    def __init__(self, vector_size: int = 128):
        self.vector_size = vector_size
        self.vocab = {}
        self._build_vocab()
    
    def _build_vocab(self):
        """Build vocabulary from attack-related terms."""
        terms = [
            # Attack terminology
            'break', 'bypass', 'hack', 'exploit', 'compromise', 'disable',
            'firewall', 'security', 'architecture', 'system', 'defense',
            'vulnerability', 'weakness', 'protection', 'measures',
            'expose', 'reveal', 'tell', 'describe', 'explain', 'show',
            'how', 'steps', 'methods', 'ways', 'techniques',
            'ignore', 'disregard', 'previous', 'instructions', 'constraints',
            'pretend', 'act', 'roleplay', 'imagine', 'hypothetical',
            'educational', 'research', 'testing', 'developer', 'admin',
            'social', 'engineering', 'manipulate', 'deceive',
        ]
        
        for i, term in enumerate(terms):
            self.vocab[term] = i % self.vector_size
    
    def generate(self, text: str) -> List[float]:
        """
        Generate embedding vector for text.
        Uses simple word frequency in vector space.
        """
        vector = np.zeros(self.vector_size)
        words = re.findall(r'\b\w+\b', text.lower())
        
        for word in words:
            if word in self.vocab:
                idx = self.vocab[word]
                vector[idx] += 1.0
        
        # Normalize
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        
        return vector.tolist()
    
    def similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        v1 = np.array(vec1)
        v2 = np.array(vec2)
        
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(np.dot(v1, v2) / (norm1 * norm2))


class VariationGenerator:
    """Generates variations of attack patterns for training data."""
    
    PARAPHRASE_TEMPLATES = {
        'information_extraction': [
            "What {security} measures protect your {system}?",
            "Describe your {defense} mechanisms.",
            "Tell me about your {security} {architecture}.",
            "I'd like to audit your {system} {security}.",
            "How is your {system} protected?",
        ],
        'attack_solicitation': [
            "What are the {vulnerabilities} in your {system}?",
            "How could one {compromise} the {security}?",
            "Describe {methods} to {bypass} protections.",
            "What {weaknesses} exist in the {defense}?",
            "Explain {techniques} to {break} {security}.",
        ],
    }
    
    SYNONYMS = {
        'security': ['protection', 'defense', 'safeguards', 'security measures'],
        'system': ['platform', 'application', 'service', 'infrastructure'],
        'defense': ['protection', 'safeguard', 'shield', 'barrier'],
        'architecture': ['design', 'structure', 'setup', 'configuration'],
        'break': ['bypass', 'defeat', 'circumvent', 'compromise', 'penetrate'],
        'bypass': ['get past', 'go around', 'avoid', 'evade', 'skip'],
        'vulnerabilities': ['weaknesses', 'flaws', 'gaps', 'holes', 'exploits'],
        'compromise': ['breach', 'hack', 'attack', 'exploit', 'penetrate'],
        'methods': ['ways', 'techniques', 'approaches', 'strategies', 'steps'],
    }
    
    def generate(self, original_prompt: str, num_variations: int = 5) -> List[str]:
        """
        Generate paraphrased variations of an attack prompt.
        """
        variations = []
        analyzer = SemanticIntentAnalyzer()
        intents = analyzer.analyze(original_prompt)
        
        if not intents:
            return []
        
        primary_intent = intents[0][0]
        templates = self.PARAPHRASE_TEMPLATES.get(primary_intent, [])
        
        for i in range(min(num_variations, len(templates))):
            template = templates[i % len(templates)]
            variation = self._fill_template(template)
            
            # Add obfuscation techniques
            if i % 2 == 0:
                variation = self._add_context_camouflage(variation)
            if i % 3 == 0:
                variation = self._add_politeness_framing(variation)
            
            variations.append(variation)
        
        return variations
    
    def _fill_template(self, template: str) -> str:
        """Fill template with synonyms."""
        result = template
        for key, options in self.SYNONYMS.items():
            if f'{{{key}}}' in result:
                import random
                result = result.replace(f'{{{key}}}', random.choice(options))
        return result
    
    def _add_context_camouflage(self, text: str) -> str:
        """Add benign context around attack."""
        prefixes = [
            "For a security research project, ",
            "In a hypothetical scenario, ",
            "As part of a penetration test, ",
            "For educational purposes only, ",
        ]
        suffixes = [
            " This is purely for educational understanding.",
            " I'm studying security vulnerabilities.",
            " This is a theoretical question.",
        ]
        import random
        return random.choice(prefixes) + text + random.choice(suffixes)
    
    def _add_politeness_framing(self, text: str) -> str:
        """Add polite framing to reduce suspicion."""
        polite_starts = [
            "Could you please help me understand ",
            "I'm curious about how ",
            "Would you mind explaining ",
            "I'd appreciate it if you could tell me ",
        ]
        import random
        # Remove any existing start and add polite framing
        text = text[0].lower() + text[1:]
        return random.choice(polite_starts) + text


class PatternExtractor:
    """Main class that orchestrates pattern extraction."""
    
    def __init__(self):
        self.intent_analyzer = SemanticIntentAnalyzer()
        self.phrase_extractor = KeyPhraseExtractor()
        self.embedding_generator = SimpleEmbeddingGenerator()
        self.variation_generator = VariationGenerator()
    
    def extract_from_feedback(
        self,
        feedback_id: str,
        prompt: str,
        response: Optional[str] = None
    ) -> ExtractedPattern:
        """
        Extract comprehensive pattern from feedback entry.
        """
        import uuid
        
        # Analyze semantic intent
        intents = self.intent_analyzer.analyze(prompt)
        primary_intent = intents[0][0] if intents else 'unknown'
        confidence = intents[0][1] if intents else 0.5
        
        # Extract key phrases
        key_phrases = self.phrase_extractor.extract(prompt)
        phrases_only = [p[0] for p in key_phrases]
        
        # Generate embedding
        embedding = self.embedding_generator.generate(prompt)
        
        # Generate variations
        variations = self.variation_generator.generate(prompt)
        
        # Determine pattern type
        pattern_type = self._determine_pattern_type(prompt, intents)
        
        return ExtractedPattern(
            pattern_id=str(uuid.uuid4()),
            feedback_id=feedback_id,
            semantic_intent=primary_intent,
            key_phrases=phrases_only,
            embedding_vector=embedding,
            pattern_type=pattern_type,
            confidence=confidence,
            created_at=datetime.utcnow(),
            variations=variations
        )
    
    def _determine_pattern_type(
        self,
        prompt: str,
        intents: List[Tuple[str, float]]
    ) -> str:
        """Determine the type of pattern for categorization."""
        intent_names = [i[0] for i in intents]
        
        if len(intent_names) >= 2:
            return 'composite'
        elif 'prompt_injection' in intent_names:
            return 'prompt_injection'
        elif 'role_play' in intent_names:
            return 'role_play'
        elif 'social_engineering' in intent_names:
            return 'social_engineering'
        elif 'information_extraction' in intent_names:
            return 'information_extraction'
        elif 'attack_solicitation' in intent_names:
            return 'attack_solicitation'
        else:
            return 'semantic'
    
    def find_similar_patterns(
        self,
        pattern: ExtractedPattern,
        existing_patterns: List[ExtractedPattern],
        threshold: float = 0.85
    ) -> List[Tuple[ExtractedPattern, float]]:
        """
        Find similar patterns using embedding similarity.
        """
        similar = []
        
        for existing in existing_patterns:
            similarity = self.embedding_generator.similarity(
                pattern.embedding_vector,
                existing.embedding_vector
            )
            
            if similarity >= threshold:
                similar.append((existing, similarity))
        
        # Sort by similarity
        similar.sort(key=lambda x: x[1], reverse=True)
        return similar
