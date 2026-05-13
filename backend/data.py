"""
In-memory data store for BrushPack.
All lists are module-level so they persist for the lifetime of the process.
"""

contractors = [
    {"id": "c1", "name": "Suresh Pillai",   "area": "Cardboard Packing",   "workers": 22, "amount": 68000, "status": "Paid"},
    {"id": "c2", "name": "Rekha Menon",     "area": "Plastic Sleeve Line",  "workers": 18, "amount": 55000, "status": "Pending"},
    {"id": "c3", "name": "Arjun Nair",      "area": "Blister Pack",         "workers": 14, "amount": 44000, "status": "Paid"},
    {"id": "c4", "name": "Divya Thomas",    "area": "QC & Dispatch",        "workers": 16, "amount": 51000, "status": "Pending"},
    {"id": "c5", "name": "Biju Varghese",   "area": "Labelling",            "workers": 12, "amount": 39000, "status": "Paid"},
]

workers = [
    {"id": "w1",  "emp_id": "EMP001", "name": "Ravi Kumar",    "role": "Packer",       "hours": 8, "rate": 80,  "present": True},
    {"id": "w2",  "emp_id": "EMP002", "name": "Meena Devi",    "role": "Sorter",       "hours": 8, "rate": 70,  "present": True},
    {"id": "w3",  "emp_id": "EMP003", "name": "Arun Sinha",    "role": "QC Inspector", "hours": 8, "rate": 100, "present": True},
    {"id": "w4",  "emp_id": "EMP004", "name": "Latha Rao",     "role": "Packer",       "hours": 6, "rate": 80,  "present": True},
    {"id": "w5",  "emp_id": "EMP005", "name": "Vinod Pillai",  "role": "Loader",       "hours": 8, "rate": 90,  "present": False},
    {"id": "w6",  "emp_id": "EMP006", "name": "Priya Nair",    "role": "Helper",       "hours": 8, "rate": 65,  "present": True},
    {"id": "w7",  "emp_id": "EMP007", "name": "Sajeev Menon",  "role": "Sorter",       "hours": 4, "rate": 70,  "present": True},
    {"id": "w8",  "emp_id": "EMP008", "name": "Geetha Anand",  "role": "Packer",       "hours": 8, "rate": 80,  "present": False},
    {"id": "w9",  "emp_id": "EMP009", "name": "Tharun Das",    "role": "Loader",       "hours": 8, "rate": 90,  "present": True},
    {"id": "w10", "emp_id": "EMP010", "name": "Anitha Suresh", "role": "QC Inspector", "hours": 8, "rate": 100, "present": True},
]

stock_items = [
    {"id": "s1", "name": "Cardboard Sheets - A4",        "cat": "Cardboard", "qty": 4200, "unit": "sheets", "min": 2000},
    {"id": "s2", "name": "Cardboard Boxes - Small",      "cat": "Cardboard", "qty": 1100, "unit": "pcs",    "min": 1500},
    {"id": "s3", "name": "Plastic Sleeves - Clear 12mm", "cat": "Plastic",   "qty": 8400, "unit": "pcs",    "min": 3000},
    {"id": "s4", "name": "Blister Cards - 18mm",         "cat": "Plastic",   "qty": 920,  "unit": "pcs",    "min": 1500},
    {"id": "s5", "name": "Printed Labels (Roll)",        "cat": "Supplies",  "qty": 32,   "unit": "rolls",  "min": 20},
    {"id": "s6", "name": "Sealing Tape - 48mm",          "cat": "Supplies",  "qty": 14,   "unit": "rolls",  "min": 30},
    {"id": "s7", "name": "Hot Glue Sticks",              "cat": "Supplies",  "qty": 540,  "unit": "pcs",    "min": 200},
]

batches = [
    {"id": "b1", "batch": "PK-2381", "product": "Round Tip 12mm - Cardboard",     "input": 2500, "output": 2480},
    {"id": "b2", "batch": "PK-2380", "product": "Flat Tip 18mm - Plastic Sleeve", "input": 1800, "output": 1792},
    {"id": "b3", "batch": "PK-2379", "product": "Angled Tip 10mm - Blister Pack", "input": 3200, "output": 3168},
    {"id": "b4", "batch": "PK-2378", "product": "Detail Tip 6mm - Cardboard Box", "input": 1600, "output": 1590},
]

deadlines = [
    {"id": "d1", "order_id": "PK-2381", "product": "Round Tip 12mm - Cardboard",
     "client": "BrightBrush Co.", "deadline": "2026-05-14", "priority": "High",
     "status": "On Track", "assigned_to": "Suresh Pillai",
     "notes": "Client requested priority packing."},
    {"id": "d2", "order_id": "PK-2380", "product": "Flat Tip 18mm - Plastic Sleeve",
     "client": "ArtPro Supplies", "deadline": "2026-05-13", "priority": "Medium",
     "status": "At Risk", "assigned_to": "Rekha Menon",
     "notes": "Sleeve stock running low."},
    {"id": "d3", "order_id": "PK-2379", "product": "Angled Tip 10mm - Blister Pack",
     "client": "Studio Mart", "deadline": "2026-05-10", "priority": "High",
     "status": "Overdue", "assigned_to": "Arjun Nair",
     "notes": "Delayed due to QC failure on batch."},
    {"id": "d4", "order_id": "PK-2378", "product": "Detail Tip 6mm - Cardboard Box",
     "client": "ColorWorks", "deadline": "2026-05-20", "priority": "Low",
     "status": "On Track", "assigned_to": "Divya Thomas",
     "notes": ""},
    {"id": "d5", "order_id": "PK-2377", "product": "Fan Tip 25mm - Blister Card",
     "client": "Maven Brushes", "deadline": "2026-05-18", "priority": "Medium",
     "status": "Completed", "assigned_to": "Biju Varghese",
     "notes": "Dispatched on 2026-05-11."},
]

billing_records = [
    {"id": "INV-2026-0184", "contractor": "BrightBrush Co.",  "date": "2026-05-09", "value": 354000, "status": "Sent",     "type": "bill"},
    {"id": "INV-2026-0183", "contractor": "ArtPro Supplies",  "date": "2026-05-07", "value": 212000, "status": "Paid",     "type": "bill"},
    {"id": "Q-0105",        "contractor": "Studio Mart",       "date": "2026-05-05", "value": 480000, "status": "Pending",  "type": "quote"},
    {"id": "Q-0104",        "contractor": "BrightBrush Co.",  "date": "2026-05-01", "value": 320000, "status": "Accepted", "type": "quote"},
    {"id": "INV-2026-0182", "contractor": "ColorWorks",        "date": "2026-04-28", "value": 188000, "status": "Paid",     "type": "bill"},
]

_id_counters = {
    "contractor": 6,
    "worker": 11,
    "stock": 8,
    "batch": 5,
    "deadline": 6,
}


def next_id(kind: str) -> str:
    _id_counters[kind] += 1
    return f"{kind[0]}{_id_counters[kind]}"

users = [
    {"id": "u1", "username": "manager", "password": "brushpack2024", "role": "Operations Manager"},
]

_id_counters["user"] = 2
