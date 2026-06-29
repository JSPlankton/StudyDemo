from __future__ import print_function

import argparse
import datetime
import json
import os
import re
import sqlite3
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
from urllib.parse import unquote, urlparse


ACCOUNT_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]{2,31}$")
MAX_BODY_BYTES = 2 * 1024 * 1024
DEFAULT_DB_PATH = "/var/lib/studydemo/study-sync.sqlite3"


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


def utc_now():
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def validate_account(account):
    return bool(ACCOUNT_PATTERN.match(account or ""))


def validate_state(state):
    if not isinstance(state, dict):
      raise ValueError("state must be an object")
    if not isinstance(state.get("version"), int):
      raise ValueError("state.version must be a number")
    if not isinstance(state.get("accounts"), list):
      raise ValueError("state.accounts must be an array")
    if len(state.get("accounts")) == 0:
      raise ValueError("state.accounts must include at least one learning account")
    active_account_id = state.get("activeAccountId")
    if active_account_id is not None and not isinstance(active_account_id, str):
      raise ValueError("state.activeAccountId must be a string or null")

    for index, account in enumerate(state.get("accounts", [])):
      if not isinstance(account, dict):
        raise ValueError("state.accounts[%d] must be an object" % index)
      if not isinstance(account.get("id"), str) or not account.get("id"):
        raise ValueError("state.accounts[%d].id is required" % index)


def normalize_expected_revision(value):
    if value is None:
        return None
    if isinstance(value, bool):
        raise ValueError("expectedRevision must be a number or null")
    if isinstance(value, int):
        return value
    raise ValueError("expectedRevision must be a number or null")


def ensure_database(db_path):
    directory = os.path.dirname(db_path)
    if directory:
        os.makedirs(directory, exist_ok=True)

    connection = sqlite3.connect(db_path)
    try:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS sync_states (
              account TEXT PRIMARY KEY,
              state_json TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              revision INTEGER NOT NULL
            )
            """
        )
        connection.commit()
    finally:
        connection.close()


def connect(db_path):
    connection = sqlite3.connect(db_path)
    connection.execute("PRAGMA journal_mode=WAL")
    return connection


def response_body(ok, **kwargs):
    body = {"ok": ok}
    body.update(kwargs)
    return body


class StudySyncHandler(BaseHTTPRequestHandler):
    server_version = "StudySync/1.0"

    def log_message(self, fmt, *args):
        return

    @property
    def db_path(self):
        return self.server.db_path

    def write_json(self, status, body):
        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json; charset=utf-8")
        self.send_header("cache-control", "no-store")
        self.send_header("content-length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def parse_sync_account(self):
        parsed = urlparse(self.path)
        prefix = "/api/sync/"
        if not parsed.path.startswith(prefix):
            return None
        account = unquote(parsed.path[len(prefix):]).strip().lower()
        if "/" in account:
            return ""
        return account

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("allow", "GET, PUT, OPTIONS")
        self.send_header("content-length", "0")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self.write_json(200, response_body(True, service="study-sync"))
            return

        account = self.parse_sync_account()
        if account is None:
            self.write_json(404, response_body(False, error="not found"))
            return
        if not validate_account(account):
            self.write_json(400, response_body(False, error="invalid account key"))
            return

        connection = connect(self.db_path)
        try:
            row = connection.execute(
                "SELECT state_json, updated_at, revision FROM sync_states WHERE account = ?",
                (account,),
            ).fetchone()
        finally:
            connection.close()

        if not row:
            self.write_json(200, response_body(True, account=account, exists=False))
            return

        self.write_json(
            200,
            response_body(
                True,
                account=account,
                exists=True,
                state=json.loads(row[0]),
                updatedAt=row[1],
                revision=row[2],
            ),
        )

    def do_PUT(self):
        account = self.parse_sync_account()
        if account is None:
            self.write_json(404, response_body(False, error="not found"))
            return
        if not validate_account(account):
            self.write_json(400, response_body(False, error="invalid account key"))
            return

        try:
            length = int(self.headers.get("content-length", "0"))
        except ValueError:
            self.write_json(400, response_body(False, error="invalid content length"))
            return

        if length <= 0 or length > MAX_BODY_BYTES:
            self.write_json(413, response_body(False, error="request body is too large"))
            return

        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            state = payload.get("state") if isinstance(payload, dict) else None
            expected_revision = normalize_expected_revision(
                payload.get("expectedRevision") if isinstance(payload, dict) else None
            )
            validate_state(state)
        except (ValueError, UnicodeDecodeError) as error:
            self.write_json(400, response_body(False, error=str(error)))
            return

        state_json = json.dumps(state, ensure_ascii=False, separators=(",", ":"))
        updated_at = utc_now()

        connection = connect(self.db_path)
        try:
            with connection:
                row = connection.execute(
                    "SELECT revision FROM sync_states WHERE account = ?",
                    (account,),
                ).fetchone()
                current_revision = row[0] if row else None
                if expected_revision is not None and expected_revision != current_revision:
                    self.write_json(
                        409,
                        response_body(
                            False,
                            error="cloud state changed; pull before syncing again",
                            account=account,
                            revision=current_revision,
                        ),
                    )
                    return
                if expected_revision is None and current_revision is not None:
                    self.write_json(
                        409,
                        response_body(
                            False,
                            error="cloud state already exists; pull before overwriting",
                            account=account,
                            revision=current_revision,
                        ),
                    )
                    return
                revision = (row[0] + 1) if row else 1
                connection.execute(
                    """
                    INSERT OR REPLACE INTO sync_states (account, state_json, updated_at, revision)
                    VALUES (?, ?, ?, ?)
                    """,
                    (account, state_json, updated_at, revision),
                )
        finally:
            connection.close()

        self.write_json(
            200,
            response_body(True, account=account, updatedAt=updated_at, revision=revision),
        )


def main():
    parser = argparse.ArgumentParser(description="Run the study app cloud sync API.")
    parser.add_argument("--host", default=os.environ.get("STUDY_SYNC_HOST", "127.0.0.1"))
    parser.add_argument("--port", default=int(os.environ.get("STUDY_SYNC_PORT", "8010")), type=int)
    parser.add_argument("--db", default=os.environ.get("STUDY_SYNC_DB", DEFAULT_DB_PATH))
    args = parser.parse_args()

    ensure_database(args.db)
    server = ThreadingHTTPServer((args.host, args.port), StudySyncHandler)
    server.db_path = args.db
    print("Study sync API listening on http://%s:%s" % (args.host, args.port))
    server.serve_forever()


if __name__ == "__main__":
    main()
