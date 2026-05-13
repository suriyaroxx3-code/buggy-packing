"""
BrushPack — FastAPI Backend
Run:  uvicorn main:app --reload --port 8000
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
)
import data as db

app = FastAPI(
    title="BrushPack API",
    description="Backend API for BrushPack brush-tip packaging operations",
    version="1.0.0",
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
    present = sum(1 for w in db.workers if w["present"])
    total   = len(db.workers)
    packed  = sum(b["output"] for b in db.batches)
    pending = [r for r in db.billing_records if r["status"] in ("Sent", "Pending", "Draft")]
    pending_value = sum(r["value"] for r in pending)
    low_stock  = [s for s in db.stock_items if s["qty"] < s["min"]]
    overdue    = [d for d in db.deadlines if d["status"] == "Overdue"]
    at_risk    = [d for d in db.deadlines if d["status"] == "At Risk"]
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
    return db.contractors


@app.get("/api/contractors/{contractor_id}", response_model=Contractor, tags=["Contractors"])
def get_contractor(contractor_id: str):
    for c in db.contractors:
        if c["id"] == contractor_id:
            return c
    raise HTTPException(status_code=404, detail="Contractor not found")


@app.post("/api/contractors", response_model=Contractor, status_code=status.HTTP_201_CREATED, tags=["Contractors"])
def create_contractor(body: ContractorCreate):
    new = {"id": db.next_id("contractor"), **body.model_dump()}
    db.contractors.append(new)
    return new


@app.put("/api/contractors/{contractor_id}", response_model=Contractor, tags=["Contractors"])
def update_contractor(contractor_id: str, body: ContractorCreate):
    for i, c in enumerate(db.contractors):
        if c["id"] == contractor_id:
            db.contractors[i] = {"id": contractor_id, **body.model_dump()}
            return db.contractors[i]
    raise HTTPException(status_code=404, detail="Contractor not found")


@app.patch("/api/contractors/{contractor_id}/status", response_model=Contractor, tags=["Contractors"])
def update_contractor_status(contractor_id: str, status_value: str):
    for i, c in enumerate(db.contractors):
        if c["id"] == contractor_id:
            db.contractors[i]["status"] = status_value
            return db.contractors[i]
    raise HTTPException(status_code=404, detail="Contractor not found")


@app.delete("/api/contractors/{contractor_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Contractors"])
def delete_contractor(contractor_id: str):
    for i, c in enumerate(db.contractors):
        if c["id"] == contractor_id:
            db.contractors.pop(i)
            return
    raise HTTPException(status_code=404, detail="Contractor not found")


# ═══════════════════════════════════════════════════════════════════════════════
# DAILY WORKERS
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/workers", response_model=List[Worker], tags=["Workers"])
def list_workers():
    return db.workers


@app.get("/api/workers/{worker_id}", response_model=Worker, tags=["Workers"])
def get_worker(worker_id: str):
    for w in db.workers:
        if w["id"] == worker_id:
            return w
    raise HTTPException(status_code=404, detail="Worker not found")


@app.post("/api/workers", response_model=Worker, status_code=status.HTTP_201_CREATED, tags=["Workers"])
def create_worker(body: WorkerCreate):
    # Check for duplicate emp_id
    if any(w["emp_id"] == body.emp_id for w in db.workers):
        raise HTTPException(status_code=409, detail="Employee ID already exists")
    new = {"id": db.next_id("worker"), **body.model_dump()}
    db.workers.append(new)
    return new


@app.put("/api/workers/{worker_id}", response_model=Worker, tags=["Workers"])
def update_worker(worker_id: str, body: WorkerCreate):
    for i, w in enumerate(db.workers):
        if w["id"] == worker_id:
            db.workers[i] = {"id": worker_id, **body.model_dump()}
            return db.workers[i]
    raise HTTPException(status_code=404, detail="Worker not found")


@app.delete("/api/workers/{worker_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Workers"])
def delete_worker(worker_id: str):
    for i, w in enumerate(db.workers):
        if w["id"] == worker_id:
            db.workers.pop(i)
            return
    raise HTTPException(status_code=404, detail="Worker not found")


# ═══════════════════════════════════════════════════════════════════════════════
# INVENTORY / STOCK
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/stock", response_model=List[StockItem], tags=["Inventory"])
def list_stock():
    return db.stock_items


@app.get("/api/stock/low", response_model=List[StockItem], tags=["Inventory"])
def list_low_stock():
    """Returns items whose qty is below their minimum threshold."""
    return [s for s in db.stock_items if s["qty"] < s["min"]]


@app.get("/api/stock/{item_id}", response_model=StockItem, tags=["Inventory"])
def get_stock_item(item_id: str):
    for s in db.stock_items:
        if s["id"] == item_id:
            return s
    raise HTTPException(status_code=404, detail="Stock item not found")


@app.post("/api/stock", response_model=StockItem, status_code=status.HTTP_201_CREATED, tags=["Inventory"])
def create_stock_item(body: StockItemCreate):
    new = {"id": db.next_id("stock"), **body.model_dump()}
    db.stock_items.append(new)
    return new


@app.put("/api/stock/{item_id}", response_model=StockItem, tags=["Inventory"])
def update_stock_item(item_id: str, body: StockItemCreate):
    for i, s in enumerate(db.stock_items):
        if s["id"] == item_id:
            db.stock_items[i] = {"id": item_id, **body.model_dump()}
            return db.stock_items[i]
    raise HTTPException(status_code=404, detail="Stock item not found")


@app.delete("/api/stock/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Inventory"])
def delete_stock_item(item_id: str):
    for i, s in enumerate(db.stock_items):
        if s["id"] == item_id:
            db.stock_items.pop(i)
            return
    raise HTTPException(status_code=404, detail="Stock item not found")


# ═══════════════════════════════════════════════════════════════════════════════
# PRODUCTION BATCHES
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/batches", response_model=List[Batch], tags=["Production"])
def list_batches():
    return db.batches


@app.get("/api/batches/{batch_id}", response_model=Batch, tags=["Production"])
def get_batch(batch_id: str):
    for b in db.batches:
        if b["id"] == batch_id:
            return b
    raise HTTPException(status_code=404, detail="Batch not found")


@app.post("/api/batches", response_model=Batch, status_code=status.HTTP_201_CREATED, tags=["Production"])
def create_batch(body: BatchCreate):
    # Prevent duplicate batch numbers
    if any(b["batch"] == body.batch for b in db.batches):
        raise HTTPException(status_code=409, detail="Batch number already exists")
    new = {"id": db.next_id("batch"), **body.model_dump()}
    db.batches.append(new)
    return new


@app.put("/api/batches/{batch_id}", response_model=Batch, tags=["Production"])
def update_batch(batch_id: str, body: BatchCreate):
    for i, b in enumerate(db.batches):
        if b["id"] == batch_id:
            db.batches[i] = {"id": batch_id, **body.model_dump()}
            return db.batches[i]
    raise HTTPException(status_code=404, detail="Batch not found")


@app.delete("/api/batches/{batch_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Production"])
def delete_batch(batch_id: str):
    for i, b in enumerate(db.batches):
        if b["id"] == batch_id:
            db.batches.pop(i)
            return
    raise HTTPException(status_code=404, detail="Batch not found")


# ═══════════════════════════════════════════════════════════════════════════════
# BILLING & QUOTATIONS
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/billing", response_model=List[BillingRecord], tags=["Billing"])
def list_billing():
    return db.billing_records


@app.get("/api/billing/{record_id}", response_model=BillingRecord, tags=["Billing"])
def get_billing(record_id: str):
    for r in db.billing_records:
        if r["id"] == record_id:
            return r
    raise HTTPException(status_code=404, detail="Billing record not found")


@app.post("/api/billing", response_model=BillingRecord, status_code=status.HTTP_201_CREATED, tags=["Billing"])
def create_billing(body: BillingRecordCreate):
    if any(r["id"] == body.id for r in db.billing_records):
        raise HTTPException(status_code=409, detail="Record ID already exists")
    new = body.model_dump()
    db.billing_records.insert(0, new)
    return new


@app.put("/api/billing/{record_id}", response_model=BillingRecord, tags=["Billing"])
def update_billing(record_id: str, body: BillingRecordCreate):
    for i, r in enumerate(db.billing_records):
        if r["id"] == record_id:
            db.billing_records[i] = body.model_dump()
            return db.billing_records[i]
    raise HTTPException(status_code=404, detail="Billing record not found")


@app.delete("/api/billing/{record_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Billing"])
def delete_billing(record_id: str):
    for i, r in enumerate(db.billing_records):
        if r["id"] == record_id:
            db.billing_records.pop(i)
            return
    raise HTTPException(status_code=404, detail="Billing record not found")


# ===========================================================================
# DEADLINE TRACKING
# ===========================================================================
@app.get("/api/deadlines", response_model=List[Deadline], tags=["Deadlines"])
def list_deadlines():
    return db.deadlines


@app.get("/api/deadlines/overdue", response_model=List[Deadline], tags=["Deadlines"])
def list_overdue():
    return [d for d in db.deadlines if d["status"] in ("Overdue", "At Risk")]


@app.get("/api/deadlines/{deadline_id}", response_model=Deadline, tags=["Deadlines"])
def get_deadline(deadline_id: str):
    for d in db.deadlines:
        if d["id"] == deadline_id:
            return d
    raise HTTPException(status_code=404, detail="Deadline not found")


@app.post("/api/deadlines", response_model=Deadline, status_code=status.HTTP_201_CREATED, tags=["Deadlines"])
def create_deadline(body: DeadlineCreate):
    new = {"id": db.next_id("deadline"), **body.model_dump()}
    db.deadlines.append(new)
    return new


@app.put("/api/deadlines/{deadline_id}", response_model=Deadline, tags=["Deadlines"])
def update_deadline(deadline_id: str, body: DeadlineCreate):
    for i, d in enumerate(db.deadlines):
        if d["id"] == deadline_id:
            db.deadlines[i] = {"id": deadline_id, **body.model_dump()}
            return db.deadlines[i]
    raise HTTPException(status_code=404, detail="Deadline not found")


@app.patch("/api/deadlines/{deadline_id}/status", response_model=Deadline, tags=["Deadlines"])
def update_deadline_status(deadline_id: str, new_status: str):
    valid = {"On Track", "At Risk", "Overdue", "Completed"}
    if new_status not in valid:
        raise HTTPException(status_code=400, detail=f"status must be one of {valid}")
    for i, d in enumerate(db.deadlines):
        if d["id"] == deadline_id:
            db.deadlines[i]["status"] = new_status
            return db.deadlines[i]
    raise HTTPException(status_code=404, detail="Deadline not found")


@app.delete("/api/deadlines/{deadline_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Deadlines"])
def delete_deadline(deadline_id: str):
    for i, d in enumerate(db.deadlines):
        if d["id"] == deadline_id:
            db.deadlines.pop(i)
            return
    raise HTTPException(status_code=404, detail="Deadline not found")



# ===========================================================================
# AUTH / USERS
# ===========================================================================
from models import (
    UserCreate, UserOut, LoginRequest, LoginResponse, ChangePasswordRequest,
)

@app.post("/api/auth/login", response_model=LoginResponse, tags=["Auth"])
def login(req: LoginRequest):
    """Validate credentials and return the user on success."""
    user = next(
        (u for u in db.users
         if u["username"].lower() == req.username.strip().lower()
         and u["password"] == req.password),
        None,
    )
    if not user:
        return LoginResponse(ok=False, message="Incorrect username or password.")
    return LoginResponse(
        ok=True,
        user=UserOut(id=user["id"], username=user["username"], role=user["role"]),
    )


@app.post("/api/auth/register", response_model=LoginResponse, tags=["Auth"])
def register(req: UserCreate):
    """Create a new user. Fails if username already taken."""
    exists = any(
        u["username"].lower() == req.username.strip().lower()
        for u in db.users
    )
    if exists:
        return LoginResponse(ok=False, message="Username already taken.")
    if len(req.password) < 6:
        return LoginResponse(ok=False, message="Password must be at least 6 characters.")
    new_id = "u" + str(db._id_counters["user"])
    db._id_counters["user"] += 1
    entry = {
        "id": new_id,
        "username": req.username.strip(),
        "password": req.password,
        "role": req.role,
    }
    db.users.append(entry)
    return LoginResponse(
        ok=True,
        user=UserOut(id=entry["id"], username=entry["username"], role=entry["role"]),
        message="User created successfully.",
    )


@app.post("/api/auth/change-password", response_model=LoginResponse, tags=["Auth"])
def change_password(req: ChangePasswordRequest):
    """Change a user password after verifying the current password."""
    user = next(
        (u for u in db.users
         if u["username"].lower() == req.username.strip().lower()
         and u["password"] == req.current_password),
        None,
    )
    if not user:
        return LoginResponse(ok=False, message="Current password is incorrect.")
    if len(req.new_password) < 6:
        return LoginResponse(ok=False, message="New password must be at least 6 characters.")
    user["password"] = req.new_password
    return LoginResponse(ok=True, message="Password changed successfully.")


@app.get("/api/users", response_model=list[UserOut], tags=["Auth"])
def list_users():
    """Return all users (passwords excluded)."""
    return [UserOut(id=u["id"], username=u["username"], role=u["role"]) for u in db.users]


# ===========================================================================
# HEALTH CHECK
# ===========================================================================
@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "BrushPack API"}
