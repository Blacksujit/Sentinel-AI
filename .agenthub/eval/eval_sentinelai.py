#!/usr/bin/env python3
"""SentinelAI eval helper — parse common metrics from verify commands.

Usage (called by result_ranker.py or standalone):

    python eval_sentinelai.py --mode passrate --cmd "cd Backend && pytest tests/ -q"
    python eval_sentinelai.py --mode coverage --cmd "cd Backend && pytest --cov=app --cov-report=term"
    python eval_sentinelai.py --mode build --cmd "cd Frontend && npm run build"

This is a thin wrapper so the coordinator has one consistent way to score
agents across backend, frontend, and SDK surfaces.
"""
import argparse
import re
import subprocess
import sys


def run(cmd):
    return subprocess.run(
        cmd, shell=True, capture_output=True, text=True
    ).stdout + subprocess.run(
        cmd, shell=True, capture_output=True, text=True
    ).stderr


def parse_passrate(output):
    # pytest: "15 passed, 2 failed"
    passed = re.findall(r"(\d+) passed", output)
    failed = re.findall(r"(\d+) failed", output)
    p = int(passed[0]) if passed else 0
    f = int(failed[0]) if failed else 0
    total = p + f
    return {"passed": p, "failed": f, "pass_rate": (p / total) if total else 0.0}


def parse_coverage(output):
    # coverage: "TOTAL    120    30    75%"
    m = re.search(r"TOTAL\s+\d+\s+\d+\s+(\d+)%", output)
    return {"cov_percent": int(m.group(1)) if m else 0}


def parse_build(output):
    return {"build_ok": 1 if "Compiled successfully" in output or "✓" in output else 0}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["passrate", "coverage", "build"], required=True)
    ap.add_argument("--cmd", required=True)
    args = ap.parse_args()

    output = run(args.cmd)
    if args.mode == "passrate":
        print(parse_passrate(output))
    elif args.mode == "coverage":
        print(parse_coverage(output))
    elif args.mode == "build":
        print(parse_build(output))


if __name__ == "__main__":
    main()
