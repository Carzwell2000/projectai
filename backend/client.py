from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_API_URL = os.getenv("API_URL", "http://127.0.0.1:8000")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Send a patient assessment to the trained model API."
    )
    parser.add_argument("--api-url", default=DEFAULT_API_URL)
    parser.add_argument("--patient-name", required=True)
    parser.add_argument("--age", required=True, type=int)
    parser.add_argument("--temperature", required=True, type=float)
    parser.add_argument("--blood-pressure", required=True)
    parser.add_argument("--symptoms", required=True, help="Comma-separated symptoms")
    parser.add_argument("--id", default=None, help="Assessment ID; generated when omitted")
    return parser.parse_args()


def create_payload(args: argparse.Namespace) -> dict[str, object]:
    return {
        "id": args.id or str(uuid.uuid4()),
        "patientName": args.patient_name,
        "age": args.age,
        "temperature": args.temperature,
        "bloodPressure": args.blood_pressure,
        "symptoms": args.symptoms,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }


def submit_assessment(api_url: str, payload: dict[str, object]) -> dict[str, object]:
    request = Request(
        f"{api_url.rstrip('/')}/api/assessments",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"API returned HTTP {error.code}: {detail}") from error
    except URLError as error:
        raise RuntimeError(f"Could not connect to {api_url}: {error.reason}") from error


def main() -> int:
    args = parse_args()
    try:
        result = submit_assessment(args.api_url, create_payload(args))
    except RuntimeError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
