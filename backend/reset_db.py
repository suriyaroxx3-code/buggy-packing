"""
reset_db.py — BrushPack database reset utility
================================================
Run this script ONCE from the backend folder to wipe all operational data
and start completely fresh.  User accounts are preserved.

Usage:
    cd backend
    python reset_db.py

What it does:
  • Deletes all rows from: batches, billing_records, contractors,
    deadlines, stock_items, workers
  • Keeps the users table intact (manager account is preserved)
  • Re-creates any missing tables if needed (safe to run on a blank db)
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "brushpack.db"


def reset():
    print(f"Connecting to: {DB_PATH}")

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    try:
        conn.execute("PRAGMA journal_mode=WAL")
    except Exception:
        pass
    conn.execute("PRAGMA foreign_keys=ON")

    # ── Ensure all tables exist before deleting ──────────────────────────────
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id       TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password TEXT NOT NULL,
        role     TEXT NOT NULL DEFAULT 'Staff'
    );
    CREATE TABLE IF NOT EXISTS contractors (
        id      TEXT PRIMARY KEY,
        name    TEXT NOT NULL,
        area    TEXT NOT NULL,
        workers INTEGER NOT NULL DEFAULT 0,
        amount  REAL    NOT NULL DEFAULT 0,
        status  TEXT    NOT NULL DEFAULT 'Pending'
    );
    CREATE TABLE IF NOT EXISTS workers (
        id      TEXT PRIMARY KEY,
        emp_id  TEXT UNIQUE NOT NULL,
        name    TEXT NOT NULL,
        role    TEXT NOT NULL,
        hours   REAL    NOT NULL DEFAULT 0,
        rate    REAL    NOT NULL DEFAULT 70,
        present INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS stock_items (
        id   TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cat  TEXT NOT NULL,
        qty  REAL NOT NULL DEFAULT 0,
        unit TEXT NOT NULL,
        min  REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS batches (
        id              TEXT PRIMARY KEY,
        batch           TEXT UNIQUE NOT NULL,
        product         TEXT NOT NULL,
        input           INTEGER NOT NULL DEFAULT 0,
        output          INTEGER NOT NULL DEFAULT 0,
        dispatch_status TEXT NOT NULL DEFAULT 'Pending',
        date            TEXT NOT NULL DEFAULT '',
        status_updated  TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS billing_records (
        id         TEXT PRIMARY KEY,
        contractor TEXT NOT NULL,
        date       TEXT NOT NULL,
        value      REAL NOT NULL DEFAULT 0,
        status     TEXT NOT NULL DEFAULT 'Draft',
        type       TEXT NOT NULL DEFAULT 'bill'
    );
    CREATE TABLE IF NOT EXISTS deadlines (
        id          TEXT PRIMARY KEY,
        order_id    TEXT NOT NULL,
        product     TEXT NOT NULL,
        client      TEXT NOT NULL,
        deadline    TEXT NOT NULL,
        priority    TEXT NOT NULL DEFAULT 'Medium',
        status      TEXT NOT NULL DEFAULT 'On Track',
        assigned_to TEXT NOT NULL DEFAULT '',
        notes       TEXT NOT NULL DEFAULT ''
    );
    """)

    # ── Seed default manager if users table is empty ─────────────────────────
    existing = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if existing == 0:
        conn.execute(
            "INSERT INTO users (id, username, password, role) VALUES (?,?,?,?)",
            ("u1", "manager", "brushpack2024", "Operations Manager"),
        )
        print("  Seeded default manager account.")

    # ── Delete all operational data ──────────────────────────────────────────
    tables = ["batches", "billing_records", "contractors", "deadlines", "stock_items", "workers"]
    print("\nClearing operational data:")
    for table in tables:
        cur = conn.execute(f"DELETE FROM {table}")
        print(f"  {table}: {cur.rowcount} rows deleted")

    conn.commit()
    conn.close()

    print("\nDone! Database is clean and ready for fresh data.")
    print("Default login: username=manager  password=brushpack2024")


if __name__ == "__main__":
    reset()
