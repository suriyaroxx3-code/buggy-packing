"""
BrushPack — FastAPI Backend
Run:  uvicorn main:app --reload --port 8000

All data is persisted to brushpack.db (SQLite) — data survives server
restarts, sign-out/sign-in cycles, and page refreshes.
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from models import (
    Contractor, ContractorCreate,
    Worker, WorkerCreate,
    StockItem, StockItemCreate,
    Batch, BatchCreate,
    BillingRecord, BillingRecordCreate,
    Deadline, DeadlineCreate,
    DashboardSummary,
    UserCreate, UserOut, LoginRequest, LoginResponse, ChangePasswordRequest,
)
import database as db

app = FastAPI(
    title="BrushPack API",
    description="Backend API for BrushPack brush-tip packaging operations",
    version="2.0.0",
)

# ── CORS — allow Vite dev server ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/dashboard", response_model=DashboardSummary, tags=["Dashboard"])
def get_dashboard():
    """Aggregated KPIs for the main dashboard."""
    workers       = db.get_all_workers()
    batches       = db.get_all_batches()
    billing       = db.get_all_billing()
    stock         = db.get_all_stock()
    deadlines     = db.get_all_deadlines()

    present       = sum(1 for w in workers if w["present"])
    total         = len(workers)
    packed        = sum(b["output"] for b in batches)
    pending       = [r for r in billing if r["status"] in ("Sent", "Pending", "Draft")]
    pending_value = sum(r["value"] for r in pending)
    low_stock     = [s for s in stock if s["qty"] < s["min"]]
    overdue       = [d for d in deadlines if d["status"] == "Overdue"]
    at_risk       = [d for d in deadlines if d["status"] == "At Risk"]

    return DashboardSummary(
        units_packed_today=packed,
        workers_present=present,
        workers_total=total,
        pending_bills=len(pending),
        pending_bills_value=pending_value,
        low_stock_count=len(low_stock),
        overdue_deadlines=len(overdue),
        at_risk_deadlines=len(at_risk),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# CONTRACTORS
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/contractors", response_model=List[Contractor], tags=["Contractors"])
def list_contractors():
    return db.get_all_contractors()


@app.get("/api/contractors/{contractor_id}", response_model=Contractor, tags=["Contractors"])
def get_contractor(contractor_id: str):
    c = db.get_contractor(contractor_id)
    if not c:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return c


@app.post("/api/contractors", response_model=Contractor, status_code=status.HTTP_201_CREATED, tags=["Contractors"])
def create_contractor(body: ContractorCreate):
    return db.create_contractor(body.model_dump())


@app.put("/api/contractors/{contractor_id}", response_model=Contractor, tags=["Contractors"])
def update_contractor(contractor_id: str, body: ContractorCreate):
    c = db.update_contractor(contractor_id, body.model_dump())
    if not c:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return c


@app.patch("/api/contractors/{contractor_id}/status", response_model=Contractor, tags=["Contractors"])
def update_contractor_status(contractor_id: str, status_value: str):
    c = db.patch_contractor_status(contractor_id, status_value)
    if not c:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return c


@app.delete("/api/contractors/{contractor_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Contractors"])
def delete_contractor(contractor_id: str):
    if not db.delete_contractor(contractor_id):
        raise HTTPException(status_code=404, detail="Contractor not found")


# ═══════════════════════════════════════════════════════════════════════════════
# DAILY WORKERS
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/workers", response_model=List[Worker], tags=["Workers"])
def list_workers():
    return db.get_all_workers()


@app.get("/api/workers/{worker_id}", response_model=Worker, tags=["Workers"])
def get_worker(worker_id: str):
    w = db.get_worker(worker_id)
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found")
    return w


@app.post("/api/workers", response_model=Worker, status_code=status.HTTP_201_CREATED, tags=["Workers"])
def create_worker(body: WorkerCreate):
    if db.emp_id_exists(body.emp_id):
        raise HTTPException(status_code=409, detail="Employee ID already exists")
    return db.create_worker(body.model_dump())


@app.put("/api/workers/{worker_id}", response_model=Worker, tags=["Workers"])
def update_worker(worker_id: str, body: WorkerCreate):
    w = db.update_worker(worker_id, body.model_dump())
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found")
    return w


@app.delete("/api/workers/{worker_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Workers"])
def delete_worker(worker_id: str):
    if not db.delete_worker(worker_id):
        raise HTTPException(status_code=404, detail="Worker not found")


# ═══════════════════════════════════════════════════════════════════════════════
# INVENTORY / STOCK
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/stock", response_model=List[StockItem], tags=["Inventory"])
def list_stock():
    return db.get_all_stock()


@app.get("/api/stock/low", response_model=List[StockItem], tags=["Inventory"])
def list_low_stock():
    return [s for s in db.get_all_stock() if s["qty"] < s["min"]]


@app.get("/api/stock/{item_id}", response_model=StockItem, tags=["Inventory"])
def get_stock_item(item_id: str):
    s = db.get_stock_item(item_id)
    if not s:
        raise HTTPException(status_code=404, detail="Stock item not found")
    return s


@app.post("/api/stock", response_model=StockItem, status_code=status.HTTP_201_CREATED, tags=["Inventory"])
def create_stock_item(body: StockItemCreate):
    return db.create_stock_item(body.model_dump())


@app.put("/api/stock/{item_id}", response_model=StockItem, tags=["Inventory"])
def update_stock_item(item_id: str, body: StockItemCreate):
    s = db.update_stock_item(item_id, body.model_dump())
    if not s:
        raise HTTPException(status_code=404, detail="Stock item not found")
    return s


@app.delete("/api/stock/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Inventory"])
def delete_stock_item(item_id: str):
    if not db.delete_stock_item(item_id):
        raise HTTPException(status_code=404, detail="Stock item not found")


# ═══════════════════════════════════════════════════════════════════════════════
# PRODUCTION BATCHES
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/batches", response_model=List[Batch], tags=["Production"])
def list_batches():
    return [Batch.from_db(b) for b in db.get_all_batches()]


@app.get("/api/batches/{batch_id}", response_model=Batch, tags=["Production"])
def get_batch(batch_id: str):
    b = db.get_batch(batch_id)
    if not b:
        raise HTTPException(status_code=404, detail="Batch not found")
    return Batch.from_db(b)


@app.post("/api/batches", response_model=Batch, status_code=status.HTTP_201_CREATED, tags=["Production"])
def create_batch(body: BatchCreate):
    if db.batch_number_exists(body.batch):
        raise HTTPException(status_code=409, detail="Batch number already exists")
    return Batch.from_db(db.create_batch(body.model_dump()))


@app.put("/api/batches/{batch_id}", response_model=Batch, tags=["Production"])
def update_batch(batch_id: str, body: BatchCreate):
    b = db.update_batch(batch_id, body.model_dump())
    if not b:
        raise HTTPException(status_code=404, detail="Batch not found")
    return Batch.from_db(b)


@app.delete("/api/batches/{batch_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Production"])
def delete_batch(batch_id: str):
    if not db.delete_batch(batch_id):
        raise HTTPException(status_code=404, detail="Batch not found")


# ═══════════════════════════════════════════════════════════════════════════════
# BILLING & QUOTATIONS
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/billing", response_model=List[BillingRecord], tags=["Billing"])
def list_billing():
    return db.get_all_billing()


@app.get("/api/billing/{record_id}", response_model=BillingRecord, tags=["Billing"])
def get_billing(record_id: str):
    r = db.get_billing_record(record_id)
    if not r:
        raise HTTPException(status_code=404, detail="Billing record not found")
    return r


@app.post("/api/billing", response_model=BillingRecord, status_code=status.HTTP_201_CREATED, tags=["Billing"])
def create_billing(body: BillingRecordCreate):
    if db.billing_id_exists(body.id):
        raise HTTPException(status_code=409, detail="Record ID already exists")
    return db.create_billing_record(body.model_dump())


@app.put("/api/billing/{record_id}", response_model=BillingRecord, tags=["Billing"])
def update_billing(record_id: str, body: BillingRecordCreate):
    r = db.update_billing_record(record_id, body.model_dump())
    if not r:
        raise HTTPException(status_code=404, detail="Billing record not found")
    return r


@app.delete("/api/billing/{record_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Billing"])
def delete_billing(record_id: str):
    if not db.delete_billing_record(record_id):
        raise HTTPException(status_code=404, detail="Billing record not found")


# ═══════════════════════════════════════════════════════════════════════════════
# DEADLINE TRACKING
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/deadlines", response_model=List[Deadline], tags=["Deadlines"])
def list_deadlines():
    return db.get_all_deadlines()


@app.get("/api/deadlines/overdue", response_model=List[Deadline], tags=["Deadlines"])
def list_overdue():
    return [d for d in db.get_all_deadlines() if d["status"] in ("Overdue", "At Risk")]


@app.get("/api/deadlines/{deadline_id}", response_model=Deadline, tags=["Deadlines"])
def get_deadline(deadline_id: str):
    d = db.get_deadline(deadline_id)
    if not d:
        raise HTTPException(status_code=404, detail="Deadline not found")
    return d


@app.post("/api/deadlines", response_model=Deadline, status_code=status.HTTP_201_CREATED, tags=["Deadlines"])
def create_deadline(body: DeadlineCreate):
    return db.create_deadline(body.model_dump())


@app.put("/api/deadlines/{deadline_id}", response_model=Deadline, tags=["Deadlines"])
def update_deadline(deadline_id: str, body: DeadlineCreate):
    d = db.update_deadline(deadline_id, body.model_dump())
    if not d:
        raise HTTPException(status_code=404, detail="Deadline not found")
    return d


@app.patch("/api/deadlines/{deadline_id}/status", response_model=Deadline, tags=["Deadlines"])
def update_deadline_status(deadline_id: str, new_status: str):
    valid = {"On Track", "At Risk", "Overdue", "Completed"}
    if new_status not in valid:
        raise HTTPException(status_code=400, detail=f"status must be one of {valid}")
    d = db.patch_deadline_status(deadline_id, new_status)
    if not d:
        raise HTTPException(status_code=404, detail="Deadline not found")
    return d


@app.delete("/api/deadlines/{deadline_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Deadlines"])
def delete_deadline(deadline_id: str):
    if not db.delete_deadline(deadline_id):
        raise HTTPException(status_code=404, detail="Deadline not found")


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH / USERS
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/api/auth/login", response_model=LoginResponse, tags=["Auth"])
def login(req: LoginRequest):
    """Validate credentials against the persistent SQLite database."""
    user = db.get_user_by_credentials(req.username, req.password)
    if not user:
        return LoginResponse(ok=False, message="Incorrect username or password.")
    return LoginResponse(
        ok=True,
        user=UserOut(id=user["id"], username=user["username"], role=user["role"]),
    )


@app.post("/api/auth/register", response_model=LoginResponse, tags=["Auth"])
def register(req: UserCreate):
    """Create a new user; credentials are saved to the SQLite database."""
    if db.username_exists(req.username):
        return LoginResponse(ok=False, message="Username already taken.")
    if len(req.password) < 6:
        return LoginResponse(ok=False, message="Password must be at least 6 characters.")
    entry = db.create_user(req.username, req.password, req.role)
    return LoginResponse(
        ok=True,
        user=UserOut(id=entry["id"], username=entry["username"], role=entry["role"]),
        message="User created successfully.",
    )


@app.post("/api/auth/change-password", response_model=LoginResponse, tags=["Auth"])
def change_password(req: ChangePasswordRequest):
    """Change a user's password after verifying the current one."""
    if len(req.new_password) < 6:
        return LoginResponse(ok=False, message="New password must be at least 6 characters.")
    ok = db.change_user_password(req.username, req.current_password, req.new_password)
    if not ok:
        return LoginResponse(ok=False, message="Current password is incorrect.")
    return LoginResponse(ok=True, message="Password changed successfully.")


@app.get("/api/users", response_model=list[UserOut], tags=["Auth"])
def list_users():
    """Return all users (passwords excluded)."""
    return [
        UserOut(id=u["id"], username=u["username"], role=u["role"])
        for u in db.get_all_users()
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/health", tags=["Health"])
def health():
    from database import DB_PATH
    return {
        "status": "ok",
        "service": "BrushPack API",
        "database": str(DB_PATH),
        "persistent": True,
    }
