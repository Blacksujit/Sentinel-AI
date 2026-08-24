#!/usr/bin/env python3
"""Render all .mmd files to SVG, normalizing line endings to avoid mmdc parse errors."""
import subprocess
import tempfile
import shutil
import sys
from pathlib import Path

DIAGRAMS_DIR = Path(__file__).parent
MMDC = r"D:\npm-global\mmdc.cmd"


def render_mmd(mmd_path: Path, svg_path: Path) -> bool:
    """Read .mmd, normalize to LF, write temp file, invoke mmdc."""
    raw = mmd_path.read_bytes()
    normalized = raw.replace(b"\r\n", b"\n").replace(b"\r", b"\n")

    with tempfile.NamedTemporaryFile(
        suffix=".mmd", mode="wb", delete=False, dir=str(DIAGRAMS_DIR)
    ) as tmp:
        tmp.write(normalized)
        tmp_name = tmp.name

    try:
        result = subprocess.run(
            [
                MMDC,
                "-i", tmp_name,
                "-o", str(svg_path),
                "-b", "transparent",
                "--width", "2400",
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode != 0:
            print(f"  ERROR rendering {mmd_path.name}:")
            print(f"    stderr: {result.stderr.strip()}")
            print(f"    stdout: {result.stdout.strip()}")
            return False
        else:
            size = svg_path.stat().st_size
            print(f"  OK {mmd_path.name} -> {svg_path.name} ({size:,} bytes)")
            return True
    finally:
        Path(tmp_name).unlink(missing_ok=True)


def main():
    mmd_files = sorted(DIAGRAMS_DIR.glob("*.mmd"))
    if not mmd_files:
        print("No .mmd files found.")
        return

    print(f"Found {len(mmd_files)} diagram(s) in {DIAGRAMS_DIR}\n")

    ok_count = 0
    fail_count = 0

    for mmd in mmd_files:
        svg = mmd.with_suffix(".svg")
        print(f"Rendering {mmd.name}...")
        if render_mmd(mmd, svg):
            ok_count += 1
        else:
            fail_count += 1

    print(f"\nDone: {ok_count} succeeded, {fail_count} failed")
    sys.exit(1 if fail_count else 0)


if __name__ == "__main__":
    main()
