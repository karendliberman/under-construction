"""Database access for the worker.

Plain SQL over psycopg, deliberately. The worker reads and writes rows; it never
issues DDL — Drizzle owns the schema (invariant 8).
"""

import os

import psycopg
from psycopg.rows import dict_row


def connect() -> psycopg.Connection:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return psycopg.connect(url, row_factory=dict_row, autocommit=False)
