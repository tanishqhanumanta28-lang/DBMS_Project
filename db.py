"""Thin PostgreSQL helper (psycopg 3)."""
import os
import psycopg
from psycopg.rows import dict_row

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/school_transport")


def connect():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def query(sql, params=None):
    with connect() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def execute(sql, params=None):
    """Run one write statement in its own transaction; returns the first row if RETURNING is used."""
    with connect() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone() if cur.description else None
