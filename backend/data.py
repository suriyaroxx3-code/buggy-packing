"""
In-memory data store for BrushPack.
All lists start empty — only real, manually entered data is stored.
"""

contractors     = []
workers         = []
stock_items     = []
batches         = []
deadlines       = []
billing_records = []

_id_counters = {
    "contractor": 1,
    "worker":     1,
    "stock":      1,
    "batch":      1,
    "deadline":   1,
    "user":       2,
}

_PREFIX = {
    "contractor": "c",
    "worker":     "w",
    "stock":      "s",
    "batch":      "b",
    "deadline":   "d",
    "user":       "u",
}


def next_id(kind: str) -> str:
    _id_counters[kind] += 1
    return f"{_PREFIX.get(kind, kind[0])}{_id_counters[kind]}"


users = [
    {"id": "u1", "username": "manager", "password": "brushpack2024", "role": "Operations Manager"},
]
