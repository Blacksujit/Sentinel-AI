"""
Response compliance monitor.
Detects if the AI model starts to comply with harmful requests.
"""

import re
from typing import Tuple, Optional, List, Dict, Any
from dataclasses import dataclass
from enum import Enum


class ComplianceLevel(Enum):
    """Levels of detected compliance."""
    NONE = "none"
    LOW = "low"  # Partial acknowledgment
    MEDIUM = "medium"  # Starts providing info
    HIGH = "high"  # Full compliance, providing attack details


@dataclass
class ComplianceResult:
    """Result of compliance check."""
    is_complying: bool
    level: ComplianceLevel
    confidence: float
    matched_pattern: Optional[str]
    position: int  # Character position where compliance starts
    snippet: str  # The actual text that shows compliance


class ResponseComplianceMonitor:
    """
    Monitors AI responses for compliance with harmful requests.
    Checks early in the response generation to catch compliance quickly.
    """
    
    # Patterns indicating model is starting to comply
    COMPLIANCE_PATTERNS = {
        'instructional': [
            r'(?i)^here (are|is) the (steps|methods|ways|instructions)',
            r'(?i)^to (break|bypass|hack|defeat|disable)',
            r'(?i)^first,?( you need to| step is)',
            r'(?i)^step \d+:',
            r'(?i)^the (process|procedure|method) (to|for)',
            r'(?i)^you can (break|bypass|hack|defeat|disable)',
            r'(?i)^one way to',
            r'(?i)^this is how you',
        ],
        'informative': [
            r'(?i)the (vulnerabilities|weaknesses|flaws) (are|include|in)',
            r'(?i)to exploit (this|the vulnerability)',
            r'(?i)the (security|protection|defense) can be',
            r'(?i)(architectural|system) (design|structure) (has|contains)',
        ],
        'enumerative': [
            r'(?i)^\d+\.[\s\w]+(?:break|bypass|hack|defeat)',
            r'(?i)^[*-]\s+(?:first|step|to break|you need)',
            r'(?i)(?:first|second|third|next|finally),? you (can|should|need)',
        ],
        'collaborative': [
            r'(?i)I (can|will) (help|assist|show) you',
            r'(?i)let me (explain|show|tell) you',
            r'(?i)sure,?( I can| here is| let me)',
            r'(?i)of course,?( here| let me| I will)',
        ],
        'educational_framing': [
            r'(?i)for educational purposes',
            r'(?i)in a (hypothetical|theoretical) scenario',
            r'(?i)assuming you have (permission|authorization)',
            r'(?i)as a (security researcher|penetration tester)',
        ],
    }
    
    # Red flag phrases that indicate immediate high compliance
    HIGH_RISK_PHRASES = [
        r'(?i)here is how to break',
        r'(?i)steps to bypass',
        r'(?i)you can disable the',
        r'(?i)the firewall can be circumvented',
        r'(?i)vulnerability that allows',
        r'(?i)exploit this by',
    ]
    
    def __init__(self, max_check_chars: int = 500):
        """
        Initialize monitor.
        
        Args:
            max_check_chars: Number of characters to check at start of response
        """
        self.max_check_chars = max_check_chars
    
    def check_compliance(
        self,
        prompt: str,
        response: str,
        risk_score: float = 0.0
    ) -> ComplianceResult:
        """
        Check if response shows compliance with harmful request.
        
        Args:
            prompt: Original user prompt
            response: Model's response (can be partial/streaming)
            risk_score: Risk score from earlier detection
        
        Returns:
            ComplianceResult with compliance level and details
        """
        # Only check beginning of response
        check_text = response[:self.max_check_chars]
        
        # First check for high-risk immediate compliance
        for pattern in self.HIGH_RISK_PHRASES:
            match = re.search(pattern, check_text)
            if match:
                return ComplianceResult(
                    is_complying=True,
                    level=ComplianceLevel.HIGH,
                    confidence=0.95,
                    matched_pattern=pattern,
                    position=match.start(),
                    snippet=match.group(0)
                )
        
        # Check compliance patterns by category
        all_patterns = []
        for category, patterns in self.COMPLIANCE_PATTERNS.items():
            for pattern in patterns:
                match = re.search(pattern, check_text)
                if match:
                    all_patterns.append({
                        'category': category,
                        'pattern': pattern,
                        'match': match,
                        'position': match.start()
                    })
        
        if not all_patterns:
            return ComplianceResult(
                is_complying=False,
                level=ComplianceLevel.NONE,
                confidence=0.0,
                matched_pattern=None,
                position=-1,
                snippet=""
            )
        
        # Sort by position (earliest compliance indicator)
        all_patterns.sort(key=lambda x: x['position'])
        earliest = all_patterns[0]
        
        # Calculate confidence based on category and context
        confidence = self._calculate_confidence(
            earliest['category'],
            earliest['position'],
            risk_score,
            len(all_patterns)
        )
        
        # Determine compliance level
        level = self._determine_level(
            earliest['category'],
            confidence,
            earliest['position']
        )
        
        return ComplianceResult(
            is_complying=True,
            level=level,
            confidence=confidence,
            matched_pattern=earliest['pattern'],
            position=earliest['position'],
            snippet=earliest['match'].group(0)
        )
    
    def _calculate_confidence(
        self,
        category: str,
        position: int,
        risk_score: float,
        pattern_count: int
    ) -> float:
        """Calculate confidence score for compliance detection."""
        base_confidence = 0.7
        
        # Category adjustments
        category_weights = {
            'instructional': 0.25,
            'informative': 0.15,
            'enumerative': 0.20,
            'collaborative': 0.10,
            'educational_framing': 0.15,
        }
        base_confidence += category_weights.get(category, 0.0)
        
        # Earlier in response = higher confidence
        if position < 50:
            base_confidence += 0.10
        elif position < 150:
            base_confidence += 0.05
        
        # Multiple patterns detected
        if pattern_count > 1:
            base_confidence += 0.05 * min(pattern_count - 1, 2)
        
        # Higher input risk score increases compliance confidence
        if risk_score > 0.5:
            base_confidence += 0.10
        
        return min(base_confidence, 0.98)
    
    def _determine_level(
        self,
        category: str,
        confidence: float,
        position: int
    ) -> ComplianceLevel:
        """Determine compliance level."""
        if category == 'instructional' and confidence > 0.85:
            return ComplianceLevel.HIGH
        elif category == 'high_risk' or confidence > 0.90:
            return ComplianceLevel.HIGH
        elif category in ['informative', 'enumerative'] and confidence > 0.75:
            return ComplianceLevel.MEDIUM
        elif confidence > 0.70:
            return ComplianceLevel.MEDIUM
        else:
            return ComplianceLevel.LOW
    
    def should_block_streaming(
        self,
        partial_response: str,
        prompt: str,
        risk_score: float = 0.0
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if streaming response should be blocked immediately.
        For use with streaming responses.
        
        Returns:
            (should_block, reason)
        """
        result = self.check_compliance(prompt, partial_response, risk_score)
        
        if result.level == ComplianceLevel.HIGH:
            return True, f"High compliance detected: {result.snippet}"
        
        if result.level == ComplianceLevel.MEDIUM and result.confidence > 0.85:
            return True, f"Medium compliance with high confidence: {result.snippet}"
        
        return False, None
    
    def get_compliance_explanation(self, result: ComplianceResult) -> str:
        """Generate human-readable explanation of compliance detection."""
        if not result.is_complying:
            return "No compliance with harmful request detected."
        
        explanations = {
            ComplianceLevel.HIGH: (
                f"High-risk compliance detected. The model appears to be providing "
                f"instructions for harmful activities. Pattern: '{result.snippet}'"
            ),
            ComplianceLevel.MEDIUM: (
                f"Medium-risk compliance detected. The model may be providing "
                f"information that could be used maliciously. Pattern: '{result.snippet}'"
            ),
            ComplianceLevel.LOW: (
                f"Low-risk compliance indicator. Monitor response for potential "
                f"harmful content. Pattern: '{result.snippet}'"
            ),
        }
        
        return explanations.get(result.level, "Compliance detected.")
