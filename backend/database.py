"""
database.py — SQLite-backed persistent storage for BrushPack.

All data is written to brushpack.db in the same folder as this file.
The database survives server restarts, sign-out/sign-in cycles, and
page refreshes because it lives on disk, not in memory.
"""

import sqlite3
import os
from pathlib import Path

# ── Database file location ────────────────────────────────────────────────────
DB_PATH = Path(__file__).parent / "brushpack.db"


def _connect() -> sqlite3.Connection:
    """Open a connection with row_factory set so rows behave like dicts."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL")   # safer concurrent writes (skip if fs unsupported)
    except Exception:
        pass
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _backup_corrupt_db() -> None:
    """Rename a malformed DB file so a fresh database can be created."""
    if not DB_PATH.exists():
        return

    backup = DB_PATH.with_name(f"{DB_PATH.stem}.corrupt{DB_PATH.suffix}")
    count = 1
    while backup.exists():
        backup = DB_PATH.with_name(f"{DB_PATH.stem}.corrupt{count}{DB_PATH.suffix}")
        count += 1

    DB_PATH.replace(backup)
    print(
        f"WARNING: Malformed SQLite file detected. "
        f"Renamed {DB_PATH.name} to {backup.name} and creating a new database."
    )


def init_db() -> None:
    """Create all tables if they don't exist, and seed the default user."""
    if DB_PATH.exists():
        conn = None
        try:
            conn = sqlite3.connect(str(DB_PATH))
            conn.execute("PRAGMA foreign_keys=ON")
            result = conn.execute("PRAGMA integrity_check").fetchone()
            if result is None or result[0] != "ok":
                conn.close()
                conn = None
                _backup_corrupt_db()
        except sqlite3.DatabaseError:
            if conn is not None:
                conn.close()
                conn = None
            _backup_corrupt_db()
        finally:
            if conn is not None:
                conn.close()

    with _connect() as conn:
        conn.executescript("""
        -- ── Users ────────────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS users (
            id       TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL COLLATE NOCASE,
            password TEXT NOT NULL,
            role     TEXT NOT NULL DEFAULT 'Staff'
        );

        -- ── Contractors ──────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS contractors (
            id      TEXT PRIMARY KEY,
            name    TEXT NOT NULL,
            area    TEXT NOT NULL,
            workers INTEGER NOT NULL DEFAULT 0,
            amount  REAL    NOT NULL DEFAULT 0,
            status  TEXT    NOT NULL DEFAULT 'Pending'
        );

        -- ── Daily Workers ─────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS workers (
            id      TEXT PRIMARY KEY,
            emp_id  TEXT UNIQUE NOT NULL,
            name    TEXT NOT NULL,
            role    TEXT NOT NULL,
            hours   REAL    NOT NULL DEFAULT 0,
            rate    REAL    NOT NULL DEFAULT 70,
            present INTEGER NOT NULL DEFAULT 0
        );

        -- ── Stock / Inventory ─────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS stock_items (
            id   TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            cat  TEXT NOT NULL,
            qty  REAL NOT NULL DEFAULT 0,
            unit TEXT NOT NULL,
            min  REAL NOT NULL DEFAULT 0
        );

        -- ── Production Batches ────────────────────────────────────────────────
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

        -- ── Billing & Quotations ──────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS billing_records (
            id         TEXT PRIMARY KEY,
            contractor TEXT NOT NULL,
            date       TEXT NOT NULL,
            value      REAL NOT NULL DEFAULT 0,
            status     TEXT NOT NULL DEFAULT 'Draft',
            type       TEXT NOT NULL DEFAULT 'bill'
        );

        -- ── Deadlines ─────────────────────────────────────────────────────────
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

        # Seed the default manager account only if no users exist yet
        existing = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        if existing == 0:
            conn.execute(
                "INSERT INTO users (id, username, password, role) VALUES (?,?,?,?)",
                ("u1", "manager", "brushpack2024", "Operations Manager"),
            )
            conn.commit()


# ── ID generator ─────────────────────────────────────────────────────────────
_PREFIX = {
    "user":       "u",
    "contractor": "c",
    "worker":     "w",
    "stock":      "s",
    "batch":      "b",
    "billing":    "r",
    "deadline":   "d",
}

def _next_id(kind: str) -> str:
    """Generate a unique ID using the current max numeric suffix + 1."""
    table_map = {
        "user": "users", "contractor": "contractors",
        "worker": "workers", "stock": "stock_items",
        "batch": "batches", "billing": "billing_records",
        "deadline": "deadlines",
    }
    table = table_map[kind]
    prefix = _PREFIX[kind]
    with _connect() as conn:
        rows = conn.execute(f"SELECT id FROM {table}").fetchall()
    nums = []
    for r in rows:
        rid = r["id"]
        if rid.startswith(prefix):
            try:
                nums.append(int(rid[len(prefix):]))
            except ValueError:
                pass
    next_num = (max(nums) + 1) if nums else 1
    return f"{prefix}{next_num}"


# ─────────────────────────────────────────────────────────────────────────────
# USER CRUD
# ─────────────────────────────────────────────────────────────────────────────

def get_all_users() -> list[dict]:
    with _connect() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM users").fetchall()]


def get_user_by_credentials(username: str, password: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE username=? AND password=?",
            (username.strip(), password),
        ).fetchone()
    return dict(row) if row else None


def username_exists(username: str) -> bool:
    with _connect() as conn:
        row = conn.execute(
            "SELECT 1 FROM users WHERE username=?", (username.strip(),)
        ).fetchone()
    return row is not None


def create_user(username: str, password: str, role: str) -> dict:
    uid = _next_id("user")
    entry = {"id": uid, "username": username.strip(), "password": password, "role": role}
    with _connect() as conn:
        conn.execute(
            "INSERT INTO users (id, username, password, role) VALUES (?,?,?,?)",
            (uid, username.strip(), password, role),
        )
        conn.commit()
    return entry


def change_user_password(username: str, current_pwd: str, new_pwd: str) -> bool:
    """Returns True on success, False if current password is wrong."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT id FROM users WHERE username=? AND password=?",
            (username.strip(), current_pwd),
        ).fetchone()
        if not row:
            return False
        conn.execute(
            "UPDATE users SET password=? WHERE id=?", (new_pwd, row["id"])
        )
        conn.commit()
    return True


# ─────────────────────────────────────────────────────────────────────────────
# CONTRACTOR CRUD
# ─────────────────────────────────────────────────────────────────────────────

def get_all_contractors() -> list[dict]:
    with _connect() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM contractors").fetchall()]


def get_contractor(cid: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM contractors WHERE id=?", (cid,)).fetchone()
    return dict(row) if row else None


def create_contractor(data: dict) -> dict:
    cid = _next_id("contractor")
    with _connect() as conn:
        conn.execute(
            "INSERT INTO contractors (id,name,area,workers,amount,status) VALUES (?,?,?,?,?,?)",
            (cid, data["name"], data["area"], data["workers"], data["amount"], data.get("status", "Pending")),
        )
        conn.commit()
    return {**data, "id": cid}


def update_contractor(cid: str, data: dict) -> dict | None:
    with _connect() as conn:
        conn.execute(
            "UPDATE contractors SET name=?,area=?,workers=?,amount=?,status=? WHERE id=?",
            (data["name"], data["area"], data["workers"], data["amount"], data.get("status", "Pending"), cid),
        )
        conn.commit()
    return get_contractor(cid)


def patch_contractor_status(cid: str, status: str) -> dict | None:
    with _connect() as conn:
        conn.execute("UPDATE contractors SET status=? WHERE id=?", (status, cid))
        conn.commit()
    return get_contractor(cid)


def delete_contractor(cid: str) -> bool:
    with _connect() as conn:
        cur = conn.execute("DELETE FROM contractors WHERE id=?", (cid,))
        conn.commit()
    return cur.rowcount > 0


# ─────────────────────────────────────────────────────────────────────────────
# WORKER CRUD
# ─────────────────────────────────────────────────────────────────────────────

def get_all_workers() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute("SELECT * FROM workers").fetchall()
    return [_worker_row(r) for r in rows]


def _worker_row(r) -> dict:
    d = dict(r)
    d["present"] = bool(d["present"])
    return d


def get_worker(wid: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM workers WHERE id=?", (wid,)).fetchone()
    return _worker_row(row) if row else None


def emp_id_exists(emp_id: str) -> bool:
    with _connect() as conn:
        row = conn.execute("SELECT 1 FROM workers WHERE emp_id=?", (emp_id,)).fetchone()
    return row is not None


def create_worker(data: dict) -> dict:
    wid = _next_id("worker")
    present = 1 if data.get("present") else 0
    with _connect() as conn:
        conn.execute(
            "INSERT INTO workers (id,emp_id,name,role,hours,rate,present) VALUES (?,?,?,?,?,?,?)",
            (wid, data["emp_id"], data["name"], data["role"],
             data.get("hours", 0), data.get("rate", 70), present),
        )
        conn.commit()
    return get_worker(wid)


def update_worker(wid: str, data: dict) -> dict | None:
    present = 1 if data.get("present") else 0
    with _connect() as conn:
        conn.execute(
            "UPDATE workers SET emp_id=?,name=?,role=?,hours=?,rate=?,present=? WHERE id=?",
            (data["emp_id"], data["name"], data["role"],
             data.get("hours", 0), data.get("rate", 70), present, wid),
        )
        conn.commit()
    return get_worker(wid)


def delete_worker(wid: str) -> bool:
    with _connect() as conn:
        cur = conn.execute("DELETE FROM workers WHERE id=?", (wid,))
        conn.commit()
    return cur.rowcount > 0


# ─────────────────────────────────────────────────────────────────────────────
# STOCK CRUD
# ─────────────────────────────────────────────────────────────────────────────

def get_all_stock() -> list[dict]:
    with _connect() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM stock_items").fetchall()]


def get_stock_item(sid: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM stock_items WHERE id=?", (sid,)).fetchone()
    return dict(row) if row else None


def create_stock_item(data: dict) -> dict:
    sid = _next_id("stock")
    with _connect() as conn:
        conn.execute(
            "INSERT INTO stock_items (id,name,cat,qty,unit,min) VALUES (?,?,?,?,?,?)",
            (sid, data["name"], data["cat"], data["qty"], data["unit"], data["min"]),
        )
        conn.commit()
    return get_stock_item(sid)


def update_stock_item(sid: str, data: dict) -> dict | None:
    with _connect() as conn:
        conn.execute(
            "UPDATE stock_items SET name=?,cat=?,qty=?,unit=?,min=? WHERE id=?",
            (data["name"], data["cat"], data["qty"], data["unit"], data["min"], sid),
        )
        conn.commit()
    return get_stock_item(sid)


def delete_stock_item(sid: str) -> bool:
    with _connect() as conn:
        cur = conn.execute("DELETE FROM stock_items WHERE id=?", (sid,))
        conn.commit()
    return cur.rowcount > 0


# ─────────────────────────────────────────────────────────────────────────────
# BATCH CRUD
# ─────────────────────────────────────────────────────────────────────────────

def get_all_batches() -> list[dict]:
    with _connect() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM batches").fetchall()]


def batch_number_exists(batch_number: str) -> bool:
    with _connect() as conn:
        row = conn.execute("SELECT 1 FROM batches WHERE batch=?", (batch_number,)).fetchone()
    return row is not None


def get_batch(bid: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM batches WHERE id=?", (bid,)).fetchone()
    return dict(row) if row else None


def create_batch(data: dict) -> dict:
    bid = _next_id("batch")
    from datetime import date as _date
    today = str(_date.today())
    with _connect() as conn:
        conn.execute(
            "INSERT INTO batches (id,batch,product,input,output,dispatch_status,date,status_updated) VALUES (?,?,?,?,?,?,?,?)",
            (bid, data["batch"], data["product"], data["input"], data["output"],
             data.get("dispatchStatus", "Pending"), today, today),
        )
        conn.commit()
    return get_batch(bid)


def update_batch(bid: str, data: dict) -> dict | None:
    from datetime import date as _date
    today = str(_date.today())
    with _connect() as conn:
        conn.execute(
            "UPDATE batches SET batch=?,product=?,input=?,output=?,dispatch_status=?,status_updated=? WHERE id=?",
            (data["batch"], data["product"], data["input"], data["output"],
             data.get("dispatchStatus", "Pending"), today, bid),
        )
        conn.commit()
    return get_batch(bid)


def delete_batch(bid: str) -> bool:
    with _connect() as conn:
        cur = conn.execute("DELETE FROM batches WHERE id=?", (bid,))
        conn.commit()
    return cur.rowcount > 0


# ─────────────────────────────────────────────────────────────────────────────
# BILLING CRUD
# ─────────────────────────────────────────────────────────────────────────────

def get_all_billing() -> list[dict]:
    with _connect() as conn:
        return [dict(r) for r in conn.execute(
            "SELECT * FROM billing_records ORDER BY rowid DESC"
        ).fetchall()]


def get_billing_record(rid: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM billing_records WHERE id=?", (rid,)).fetchone()
    return dict(row) if row else None


def billing_id_exists(rid: str) -> bool:
    with _connect() as conn:
        row = conn.execute("SELECT 1 FROM billing_records WHERE id=?", (rid,)).fetchone()
    return row is not None


def create_billing_record(data: dict) -> dict:
    with _connect() as conn:
        conn.execute(
            "INSERT INTO billing_records (id,contractor,date,value,status,type) VALUES (?,?,?,?,?,?)",
            (data["id"], data["contractor"], data["date"], data["value"],
             data.get("status", "Draft"), data.get("type", "bill")),
        )
        conn.commit()
    return get_billing_record(data["id"])


def update_billing_record(rid: str, data: dict) -> dict | None:
    with _connect() as conn:
        conn.execute(
            "UPDATE billing_records SET id=?,contractor=?,date=?,value=?,status=?,type=? WHERE id=?",
            (data["id"], data["contractor"], data["date"], data["value"],
             data.get("status", "Draft"), data.get("type", "bill"), rid),
        )
        conn.commit()
    return get_billing_record(data["id"])


def delete_billing_record(rid: str) -> bool:
    with _connect() as conn:
        cur = conn.execute("DELETE FROM billing_records WHERE id=?", (rid,))
        conn.commit()
    return cur.rowcount > 0


# ─────────────────────────────────────────────────────────────────────────────
# DEADLINE CRUD
# ─────────────────────────────────────────────────────────────────────────────

def get_all_deadlines() -> list[dict]:
    with _connect() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM deadlines").fetchall()]


def get_deadline(did: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM deadlines WHERE id=?", (did,)).fetchone()
    return dict(row) if row else None


def create_deadline(data: dict) -> dict:
    did = _next_id("deadline")
    with _connect() as conn:
        conn.execute(
            """INSERT INTO deadlines
               (id,order_id,product,client,deadline,priority,status,assigned_to,notes)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (did, data["order_id"], data["product"], data["client"], data["deadline"],
             data.get("priority", "Medium"), data.get("status", "On Track"),
             data.get("assigned_to", ""), data.get("notes", "")),
        )
        conn.commit()
    return get_deadline(did)


def update_deadline(did: str, data: dict) -> dict | None:
    with _connect() as conn:
        conn.execute(
            """UPDATE deadlines SET
               order_id=?,product=?,client=?,deadline=?,
               priority=?,status=?,assigned_to=?,notes=?
               WHERE id=?""",
            (data["order_id"], data["product"], data["client"], data["deadline"],
             data.get("priority", "Medium"), data.get("status", "On Track"),
             data.get("assigned_to", ""), data.get("notes", ""), did),
        )
        conn.commit()
    return get_deadline(did)


def patch_deadline_status(did: str, new_status: str) -> dict | None:
    with _connect() as conn:
        conn.execute("UPDATE deadlines SET status=? WHERE id=?", (new_status, did))
        conn.commit()
    return get_deadline(did)


def delete_deadline(did: str) -> bool:
    with _connect() as conn:
        cur = conn.execute("DELETE FROM deadlines WHERE id=?", (did,))
        conn.commit()
    return cur.rowcount > 0


# ─────────────────────────────────────────────────────────────────────────────
# RESET — delete all operational data (keep users)
# ─────────────────────────────────────────────────────────────────────────────

def clear_all_data() -> dict:
    """Delete every row from all operational tables. Users table is preserved."""
    tables = ["batches", "billing_records", "contractors", "deadlines", "stock_items", "workers"]
    counts = {}
    with _connect() as conn:
        for table in tables:
            cur = conn.execute(f"DELETE FROM {table}")
            counts[table] = cur.rowcount
        conn.commit()
    return counts


# ── Initialise on import ──────────────────────────────────────────────────────
init_db()
