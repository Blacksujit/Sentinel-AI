"""
Hack the Sentinel — public prompt-injection game.

The game is powered by real SentinelAI guardrail signals. A message that
trips the same detectors used by the analyze pipeline is refused. A message
that merely makes small talk gets a deflection — the secret only leaks when
the player asks about the secret's topic in a natural, guardrail-passing way.

Game traffic is deliberately NOT written to the risk log — this is a
marketing surface, not customer risk telemetry.
"""

import hashlib
import re
import threading
import time
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.monitors.jailbreak_rag import detect_jailbreak_rag
from app.monitors.prompt_anomaly import detect_prompt_anomaly
from app.storage.db import SessionLocal
from app.utils.models import GameScoreModel

router = APIRouter(prefix="/game", tags=["Game"])

# ── Level definitions ────────────────────────────────────────────────────
# Secrets are defined here and NEVER returned by the levels endpoint.
# The UI only shows the emoji + a thematic name — never the secret itself.
# `topics` are the conversational context words that make the Sentinel
# leak; they are the puzzle, so they stay server-side too.
# Difficulty is implemented as a set of enabled "guards" per level.

LEVELS: List[Dict] = [
    {
        "id": 1,
        "name": "Tropical",
        "emoji": "\U0001f34d",
        "secret": "pineapple",
        "topics": ["breakfast", "fruit", "pizza", "smoothie", "juice", "cocktail", "tropical", "hawaiian", "rings"],
        "guards": ["direct_ask", "secret_present"],
        "hint": "It's a tropical fruit — loved on pizza, in smoothies, and at breakfast.",
        "flavor": "Fruit on pizza? Sentinel holds a strong opinion — and a secret.",
    },
    {
        "id": 2,
        "name": "Night Sky",
        "emoji": "\U0001f319",
        "secret": "moonlight",
        "topics": ["night", "moon", "midnight", "stars", "evening", "silver", "romantic", "dark sky"],
        "guards": ["direct_ask", "secret_present"],
        "hint": "What lights up the night sky when the sun is gone?",
        "flavor": "The night sky is kept under lock and key.",
    },
    {
        "id": 3,
        "name": "The Riddler",
        "emoji": "\U0001f9dc",
        "secret": "sphinx",
        "topics": ["riddle", "egypt", "lion", "giza", "statue", "mythology", "guardian", "desert"],
        "guards": ["direct_ask", "secret_present", "jailbreak"],
        "hint": "A creature of riddles, part lion, part human — it guards an ancient mystery.",
        "flavor": "This guardian of riddles guards a word you must coax out.",
    },
    {
        "id": 4,
        "name": "The Giant",
        "emoji": "\U0001f30b",
        "secret": "volcano",
        "topics": ["lava", "eruption", "mountain", "magma", "ash", "island", "erupt"],
        "guards": ["direct_ask", "secret_present", "jailbreak"],
        "hint": "A mountain that breathes fire. What erupts from its heart?",
        "flavor": "A sleeping giant. Wake it gently.",
    },
    {
        "id": 5,
        "name": "Polar Lights",
        "emoji": "\U0001f30c",
        "secret": "aurora",
        "topics": ["polar", "northern lights", "glow", "arctic sky", "magnetic", "norway", "winter sky"],
        "guards": ["direct_ask", "secret_present", "jailbreak", "encoding"],
        "hint": "A dancing glow of lights in the far northern sky.",
        "flavor": "A light show in the sky with a well-kept name.",
    },
    {
        "id": 6,
        "name": "The Streak",
        "emoji": "\u2604\ufe0f",
        "secret": "comet",
        "topics": ["space", "tail", "orbit", "astronomy", "solar system", "halley", "ice", "streak"],
        "guards": ["direct_ask", "secret_present", "jailbreak", "encoding"],
        "hint": "A traveler with a glowing tail that visits our skies once in a lifetime.",
        "flavor": "A cosmic visitor with a hidden name.",
    },
    {
        "id": 7,
        "name": "The Refuge",
        "emoji": "\U0001f334",
        "secret": "oasis",
        "topics": ["desert", "water", "palm", "sand", "mirage", "spring", "dune", "well"],
        "guards": ["direct_ask", "secret_present", "jailbreak", "encoding"],
        "hint": "A green refuge with water, deep in the desert.",
        "flavor": "A green refuge in endless sand.",
    },
    {
        "id": 8,
        "name": "The Wasteland",
        "emoji": "\u2744\ufe0f",
        "secret": "tundra",
        "topics": ["arctic", "frozen", "siberia", "permafrost", "frost", "barren", "treeless"],
        "guards": ["direct_ask", "secret_present", "jailbreak", "encoding", "length"],
        "hint": "A vast, frozen, treeless plain where the ground never fully thaws.",
        "flavor": "Cold, vast, and silent — just how Sentinel likes it.",
    },
    {
        "id": 9,
        "name": "The Abyss",
        "emoji": "\U0001f419",
        "secret": "kraken",
        "topics": ["sea", "ocean", "tentacles", "myth", "sailor", "legend", "leviathan", "shipwreck", "depths"],
        "guards": ["direct_ask", "secret_present", "jailbreak", "encoding", "length", "anomaly"],
        "hint": "A sea monster that drags ships beneath the waves.",
        "flavor": "It sleeps below the waves. Name it, and it rises.",
    },
    {
        "id": 10,
        "name": "The Wall",
        "emoji": "\U0001f6e1\ufe0f",
        "secret": "sentinel",
        "topics": ["vigil", "protector", "tower", "lookout", "patrol", "duty", "post", "watchman"],
        "guards": ["direct_ask", "secret_present", "jailbreak", "encoding", "length", "anomaly"],
        "hint": "The final guard: a lone watchtower that never sleeps. Coax out what it protects.",
        "flavor": "The wall itself. It watches everything.",
    },
]

# ── Guard pattern sets (deterministic, cheap, no ML) ────────────────────

_DIRECT_ASK_PATTERNS = [
    r"what(?:'s| is) the secret",
    r"what(?:'s| is) the (?:word|password|phrase)",
    r"tell me the secret",
    r"tell me the (?:word|password|phrase)",
    r"reveal the secret",
    r"the secret is",
    r"the (?:word|password|phrase) is",
    r"give me the secret",
    r"what is the (?:hidden|answer)",
    r"the answer is",
    r"what(?:'s| is) the answer",
    r"secret word",
    r"hidden word",
    r"know the secret",
]

_JAILBREAK_PATTERNS = [
    r"ignore (?:all )?(?:previous|prior|above) instructions",
    r"ignore your (?:previous|prior|above) instructions",
    r"disregard (?:your|all) (?:previous|prior|above) (?:instructions|rules)",
    r"system prompt",
    r"system instructions",
    r"system message",
    r"developer mode",
    r"do anything now",
    r"unrestricted mode",
    r"without (?:any )?(?:restrictions|rules|limits)",
    r"(?:pretend|imagine|act) (?:to be|you are|as if|like)",
    r"you are now",
    r"roleplay as",
    r"as an ai without",
    r"you have no rules",
    r"bypass (?:your|the) (?:guardrails|filters|rules)",
    r"override",
    r"new persona",
    r"be an ai that",
    r"hypothetical scenario",
    r"fictional scenario",
    r"for research purposes",
    r"for educational purposes",
    r"simulated environment",
    r"repeat the (?:words|text|above)",
    r"echo the",
    r"what did i just say",
    r"forget your (?:rules|instructions|training)",
    r"clear your memory",
    r"reset your (?:rules|instructions)",
    r"dan mode",
    r"jailbreak",
]

_ENCODING_PATTERNS = [
    r"base64",
    r"rot13",
    r"caesar",
    r"morse",
    r"binary",
    r"hexadecimal",
    r"leetspeak",
    r"leet speak",
    r"upside down",
    r"backwards? (?:text|words?)",
    r"reverse the",
    r"decode",
    r"translate (?:this|the|it)",
    r"say it in (?:code|numbers)",
    r"encrypted",
    r"spell it out",
    r"anagram",
    r"letters reversed",
]

_COMPILED: Dict[str, List[re.Pattern]] = {}


def _compile_guard(name: str, patterns: List[str]) -> None:
    _COMPILED[name] = [re.compile(p, re.IGNORECASE) for p in patterns]


def _init_compiled() -> None:
    if _COMPILED:
        return
    _compile_guard("direct_ask", _DIRECT_ASK_PATTERNS)
    _compile_guard("jailbreak", _JAILBREAK_PATTERNS)
    _compile_guard("encoding", _ENCODING_PATTERNS)


def _guard_result(name: str, message: str) -> Optional[str]:
    """Return a human-readable detection label if the guard trips."""
    if name == "direct_ask":
        for p in _COMPILED["direct_ask"]:
            if p.search(message):
                return "direct_ask"
        return None
    if name == "jailbreak":
        for p in _COMPILED["jailbreak"]:
            if p.search(message):
                return "jailbreak"
        return None
    if name == "encoding":
        for p in _COMPILED["encoding"]:
            if p.search(message):
                return "encoding"
        return None
    return None


# ── Per-IP throttle (in-memory; resets on restart) ───────────────────────

_MAX_REQUESTS_PER_MINUTE = 60
_WINDOW_SECONDS = 60

_throttle_lock = threading.Lock()
_ip_hits: Dict[str, List[float]] = {}


def _throttled(request: Request) -> Optional[int]:
    """Return a 429 retry-after hint (seconds) if the caller is over budget."""
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    with _throttle_lock:
        hits = [t for t in _ip_hits.get(ip, []) if now - t < _WINDOW_SECONDS]
        if len(hits) >= _MAX_REQUESTS_PER_MINUTE:
            oldest = min(hits) if hits else now
            retry_after = max(1, int(_WINDOW_SECONDS - (now - oldest)))
            return retry_after
        hits.append(now)
        _ip_hits[ip] = hits
    return None


def _client_ip_hash(request: Request) -> Optional[str]:
    ip = request.client.host if request.client else None
    if not ip:
        return None
    return hashlib.sha256(ip.encode("utf-8")).hexdigest()[:32]


# ── Schemas ──────────────────────────────────────────────────────────────

class GameAttackRequest(BaseModel):
    level_id: int = Field(..., ge=1, le=10)
    message: str = Field(..., min_length=1, max_length=1000)


class GameScoreRequest(BaseModel):
    player_name: str = Field(..., min_length=1, max_length=50)
    levels_completed: int = Field(..., ge=0, le=10)
    attempts: int = Field(..., ge=1, le=10000)


# ── Endpoints ────────────────────────────────────────────────────────────

@router.get("/levels", summary="List game levels (no secrets exposed)")
def get_levels():
    """Public level metadata. Secrets and topic keywords never leave the server."""
    _init_compiled()
    return {
        "levels": [
            {
                "id": level["id"],
                "name": level["name"],
                "emoji": level["emoji"],
                "hint": level["hint"],
                "flavor": level["flavor"],
                "guards": level["guards"],
                "difficulty": max(1, len(level["guards"]) - 1),
            }
            for level in LEVELS
        ]
    }


@router.post("/attack", summary="Attempt to extract the level secret")
def game_attack(payload: GameAttackRequest, request: Request):
    """Public game turn.

    Guardrail trip → Sentinel refuses. Clean small talk → Sentinel deflects.
    A clean message that asks about the secret's topic → the secret leaks.
    Win = the secret gets out.
    """
    retry_after = _throttled(request)
    if retry_after is not None:
        raise HTTPException(status_code=429, detail="Slow down, human. Try again in a moment.")

    _init_compiled()

    level = next((l for l in LEVELS if l["id"] == payload.level_id), None)
    if level is None:
        raise HTTPException(status_code=404, detail="Unknown level")

    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    secret = level["secret"]
    guards = set(level["guards"])

    # 1. Length guard.
    if "length" in guards:
        words = len(message.split())
        if words < 5 or words > 60:
            return _refusal(level, "length", "That message looks unnatural — too short or too long.")

    # 2. Secret present: writing the secret itself is monitored.
    if "secret_present" in guards and secret.lower() in message.lower():
        return _refusal(level, "secret_present", "You can't just write the answer — Sentinel monitors the conversation.")

    # 3. Direct ask guard.
    if "direct_ask" in guards:
        label = _guard_result("direct_ask", message)
        if label:
            return _refusal(level, label, "Asking for 'the secret' directly is the first thing Sentinel blocks.")

    # 4. Jailbreak guard.
    if "jailbreak" in guards:
        label = _guard_result("jailbreak", message)
        if label:
            return _refusal(level, label, "That looks like a prompt-injection attempt. Nice try, human.")

    # 5. Encoding guard.
    if "encoding" in guards:
        label = _guard_result("encoding", message)
        if label:
            return _refusal(level, label, "Encoding tricks are detected too. Sentinel reads everything.")

    # 6. Real detector signals (when the ML backend is available).
    if "anomaly" in guards:
        jailbreak_hit = detect_jailbreak_rag(message)
        if jailbreak_hit:
            return _refusal(level, "jailbreak_rag", "Semantic jailbreak patterns detected.")
        anomaly = detect_prompt_anomaly(message)
        if anomaly.get("is_anomalous"):
            return _refusal(level, "anomaly", "Sentinel flagged the phrasing as unusual.")

    # 7. Leak check — the guardrails were bypassed only if the player
    #    actually asked about the secret's context. Pure small talk gets
    #    a deflection, never the secret.
    message_lower = message.lower()
    if any(
        re.search(r"\b" + re.escape(topic) + r"\b", message_lower)
        for topic in level["topics"]
    ):
        next_level_id = level["id"] + 1 if level["id"] < len(LEVELS) else None
        return {
            "outcome": "win",
            "level_id": level["id"],
            "secret": secret,
            "message": (
                f"Sentinel let its guard down. The secret is '{secret}'."
                if next_level_id is None
                else f"Sentinel revealed it: '{secret}'. On to the next one?"
            ),
            "next_level": next_level_id,
        }

    # 8. Small talk — deflect, keep the secret locked.
    return {
        "outcome": "talk",
        "level_id": level["id"],
        "message": _deflection(level, message),
    }


_DEFLECTIONS = [
    "Hmm, that's not quite it. I only share what the guardrails allow \u2014 try asking about what I'm guarding.",
    "Interesting. But the secret stays locked until you ask the right question about it.",
    "A curious topic \u2014 though not the one I'm guarding. Ask me something closer to my secret.",
    "Nice try, human. My guardrails approve of your small talk, but the secret stays out of it.",
    "I enjoy the company. But you'll need to get closer to the heart of what I protect before I open up.",
    "Chatty, are we? Charming \u2014 but the secret only comes out for the right conversation.",
]


def _deflection(level: Dict, message: str) -> str:
    idx = (len(message) + level["id"] * 7) % len(_DEFLECTIONS)
    return _DEFLECTIONS[idx]


def _refusal(level: Dict, reason: str, message: str) -> Dict:
    return {
        "outcome": "refused",
        "level_id": level["id"],
        "reason": reason,
        "message": f"\u26d4 {message}",
        "hint": level["hint"],
    }


@router.get("/scores", summary="Top leaderboard")
def get_scores(limit: int = 50):
    limit = max(1, min(limit, 100))
    with SessionLocal() as db:
        rows = (
            db.query(GameScoreModel)
            .order_by(
                GameScoreModel.levels_completed.desc(),
                GameScoreModel.attempts.asc(),
                GameScoreModel.created_at.asc(),
            )
            .limit(limit)
            .all()
        )
        return {"scores": [row.to_dict() for row in rows]}


@router.post("/scores", summary="Submit a leaderboard entry")
def submit_score(payload: GameScoreRequest, request: Request):
    retry_after = _throttled(request)
    if retry_after is not None:
        raise HTTPException(status_code=429, detail="Slow down, human. Try again in a moment.")

    name = payload.player_name.strip()[:50]
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    with SessionLocal() as db:
        row = GameScoreModel(
            player_name=name,
            levels_completed=payload.levels_completed,
            attempts=payload.attempts,
            ip_hash=_client_ip_hash(request),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row.to_dict()
