"""
PII / DLP detector for SentinelAI.

Scans prompts and responses for personally identifiable information —
emails, SSNs, Luhn-validated credit-card numbers, phone numbers, IP
addresses, dates of birth, API keys, and passport numbers — and returns
a redacted copy with matches replaced by [REDACTED_<TYPE>] tokens.

Matches are processed category by category (API keys first, passports
last) and redacted text is fed forward, so a token never contains a
digit and later categories cannot re-match inside an earlier redaction.
"""

import re
from typing import Any, Dict, List

_REDACT_PREFIX = "[REDACTED_"

_PATTERNS: Dict[str, re.Pattern] = {
    "api_key": re.compile(
        r"\b(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{20,}|"
        r"xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16})\b"
    ),
    "credit_card": re.compile(r"\b(?:\d[ -]?){13,19}\b"),
    "ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "ip_address": re.compile(
        r"\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b"
    ),
    "phone": re.compile(r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"),
    "email": re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
    "date_of_birth": re.compile(
        r"\b(?:(?:\d{1,2})[/-](?:\d{1,2})[/-](\d{4})|(\d{4})[/-](?:\d{1,2})[/-](?:\d{1,2}))\b"
    ),
    "passport": re.compile(r"\b\d{9}\b"),
}

_DOB_YEAR_MIN = 1900
_DOB_YEAR_MAX = 2012


def _is_luhn_valid(digits: str) -> bool:
    """Validate a digit string with the Luhn checksum."""
    total = 0
    double = False
    for ch in reversed(digits):
        d = ord(ch) - 48
        if double:
            d *= 2
            if d > 9:
                d -= 9
        total += d
        double = not double
    return total % 10 == 0


def _is_valid_dob_year(year: str) -> bool:
    try:
        return _DOB_YEAR_MIN <= int(year) <= _DOB_YEAR_MAX
    except ValueError:
        return False


def _validate(category: str, match_text: str) -> bool:
    """Extra validation beyond the regex, to cut false positives."""
    if category == "credit_card":
        digits = re.sub(r"\D", "", match_text)
        return 13 <= len(digits) <= 19 and _is_luhn_valid(digits)
    if category == "date_of_birth":
        parts = re.split(r"[/-]", match_text)
        return any(_is_valid_dob_year(p) for p in parts if len(p) == 4)
    return True


def detect_pii(text: str) -> Dict[str, Any]:
    """
    Scan text for PII and return a redacted copy.

    Returns a dict with:
      pii_detected:  bool
      categories:    {category: count} for categories with hits
      count:         total number of PII items found
      redacted_text: text with matches replaced by [REDACTED_<TYPE>] tokens
      flags:         ["pii_detected", "pii:<category>", ...]
    """
    if not text:
        return {
            "pii_detected": False,
            "categories": {},
            "count": 0,
            "redacted_text": text or "",
            "flags": [],
        }

    categories: Dict[str, int] = {}
    redacted = text

    for category, pattern in _PATTERNS.items():
        matches = list(pattern.finditer(redacted))
        hits = 0
        pieces: List[str] = []
        last = 0
        for m in matches:
            if not _validate(category, m.group(0)):
                continue
            hits += 1
            pieces.append(redacted[last:m.start()])
            pieces.append(f"{_REDACT_PREFIX}{category.upper()}]")
            last = m.end()
        if hits:
            pieces.append(redacted[last:])
            redacted = "".join(pieces)
            categories[category] = hits

    pii_detected = bool(categories)
    flags: List[str] = ["pii_detected"] if pii_detected else []
    flags += [f"pii:{cat}" for cat in categories]

    return {
        "pii_detected": pii_detected,
        "categories": categories,
        "count": sum(categories.values()),
        "redacted_text": redacted,
        "flags": flags,
    }
