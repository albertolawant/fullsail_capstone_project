import json
import os
from pathlib import Path
from urllib import error, request

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"

load_dotenv(dotenv_path=ENV_FILE)

DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")


def send_discord_message(message: str) -> bool:
    if not DISCORD_WEBHOOK_URL:
        print("Discord webhook is not configured.")
        return False

    payload = json.dumps(
        {
            "content": message,
        }
    ).encode("utf-8")

    webhook_request = request.Request(
        DISCORD_WEBHOOK_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "TanioAI/1.0",
        },
        method="POST",
    )

    try:
        with request.urlopen(webhook_request, timeout=10) as response:
            return 200 <= response.status < 300

    except error.HTTPError as http_error:
        print(
            "Discord webhook HTTP error:",
            http_error.code,
            http_error.reason,
        )
        return False

    except error.URLError as url_error:
        print(
            "Discord webhook connection error:",
            url_error.reason,
        )
        return False

    except Exception as unexpected_error:
        print(
            "Discord webhook unexpected error:",
            unexpected_error,
        )
        return False