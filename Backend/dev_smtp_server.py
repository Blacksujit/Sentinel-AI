"""
Development SMTP server — captures emails and prints them to console.
No Docker required. Start in a separate terminal before running the backend.
"""

import asyncio
import os
import sys
from datetime import datetime


HOST = os.getenv("DEV_SMTP_HOST", "127.0.0.1")
PORT = int(os.getenv("SMTP_PORT", "1025"))
SAVE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".dev_emails")


class DevSMTPServer:
    def __init__(self):
        self._server = None

    async def handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        addr = writer.get_extra_info("peername")
        try:
            writer.write(b"220 Dev SMTP Server Ready\r\n")
            await writer.drain()

            message_lines = []
            while True:
                data = await reader.readline()
                if not data:
                    break
                line = data.decode("utf-8", errors="replace").strip()
                print(f"  [SMTP] {line}")

                if line.upper().startswith("QUIT"):
                    writer.write(b"221 Bye\r\n")
                    await writer.drain()
                    break
                elif line.upper().startswith("DATA"):
                    writer.write(b"354 End data with <CRLF>.<CRLF>\r\n")
                    await writer.drain()
                    body = []
                    while True:
                        chunk = await reader.readline()
                        if not chunk:
                            break
                        body_line = chunk.decode("utf-8", errors="replace")
                        if body_line.strip() == ".":
                            break
                        body.append(body_line)
                    body_text = "".join(body)
                    self._save_email(body_text, addr)
                    print(f"  [SMTP] ─────────────────────────────────")
                    print(f"  [SMTP] 📧 Captured email from {addr}")
                    print(body_text)
                    print(f"  [SMTP] ─────────────────────────────────")
                    writer.write(b"250 OK: message accepted\r\n")
                    await writer.drain()
                else:
                    writer.write(b"250 OK\r\n")
                    await writer.drain()
        except Exception:
            pass
        finally:
            writer.close()

    def _save_email(self, body: str, addr):
        os.makedirs(SAVE_DIR, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        path = os.path.join(SAVE_DIR, f"email_{ts}.txt")
        with open(path, "w", encoding="utf-8") as f:
            f.write(f"From: {addr}\nReceived: {datetime.now()}\n\n{body}")

    async def start(self):
        self._server = await asyncio.start_server(self.handle_client, HOST, PORT)
        print(f"  [SMTP] Dev SMTP server running on {HOST}:{PORT}")
        print(f"  [SMTP] Captured emails saved to: {SAVE_DIR}")
        print(f"  [SMTP] Press Ctrl+C to stop")
        async with self._server:
            await self._server.serve_forever()

    async def stop(self):
        if self._server:
            self._server.close()


if __name__ == "__main__":
    print(f"╔══════════════════════════════════════════╗")
    print(f"║  SentinelAI Dev SMTP Server              ║")
    print(f"║  Listening on {HOST}:{PORT}                  ║")
    print(f"╚══════════════════════════════════════════╝")
    server = DevSMTPServer()
    try:
        asyncio.run(server.start())
    except KeyboardInterrupt:
        print("\n  [SMTP] Server stopped.")
