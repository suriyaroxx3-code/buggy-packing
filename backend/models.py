from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


# ── Contractor ────────────────────────────────────────────────────────────────
class ContractorBase(BaseModel):
    name: str
    area: str
    workers: int
    amount: float
    status: str = "Pending"   # "Paid" | "Pending"


class ContractorCreate(ContractorBase):
    pass


class Contractor(ContractorBase):
    id: str


# ── Daily Worker ──────────────────────────────────────────────────────────────
class WorkerBase(BaseModel):
    emp_id: str
    name: str
    role: str
    hours: float = 0
    rate: float = 70
    present: bool = False


class WorkerCreate(WorkerBase):
    pass


class Worker(WorkerBase):
    id: str


# ── Inventory / Stock ─────────────────────────────────────────────────────────
class StockItemBase(BaseModel):
    name: str
    cat: str
    qty: float
    unit: str
    min: float


class StockItemCreate(StockItemBase):
    pass


class StockItem(StockItemBase):
    id: str


# ── Production Batch ──────────────────────────────────────────────────────────
class BatchBase(BaseModel):
    batch: str
    product: str
    input: int
    output: int
    dispatchStatus: str = "Pending"
    date: str = ""
    statusUpdatedAt: str = ""


class BatchCreate(BatchBase):
    pass


class Batch(BatchBase):
    id: str

    @classmethod
    def from_db(cls, row: dict) -> "Batch":
        """Map SQLite snake_case columns → camelCase model fields."""
        return cls(
            id=row["id"],
            batch=row["batch"],
            product=row["product"],
            input=row["input"],
            output=row["output"],
            dispatchStatus=row.get("dispatch_status", "Pending"),
            date=row.get("date", ""),
            statusUpdatedAt=row.get("status_updated", ""),
        )


# ── Billing / Quotation ───────────────────────────────────────────────────────
class BillingRecordBase(BaseModel):
    id: str          # e.g. INV-2026-0184 or Q-0105
    contractor: str
    date: str
    value: float
    status: str = "Draft"   # "Draft" | "Sent" | "Accepted" | "Pending" | "Received"
    type: str = "bill"      # "bill" | "quote"


class BillingRecordCreate(BillingRecordBase):
    pass


class BillingRecord(BillingRecordBase):
    pass


# -- Deadline -------------------------------------------------------------------
class DeadlineBase(BaseModel):
    order_id: str
    product: str
    client: str
    deadline: str
    priority: str = "Medium"
    status: str   = "On Track"
    assigned_to: Optional[str] = ""
    notes: Optional[str] = ""


class DeadlineCreate(DeadlineBase):
    pass


class Deadline(DeadlineBase):
    id: str


# -- Dashboard summary -----------------------------------------------------------
class DashboardSummary(BaseModel):
    units_packed_today: int
    workers_present: int
    workers_total: int
    pending_bills: int
    pending_bills_value: float
    low_stock_count: int
    overdue_deadlines: int = 0
    at_risk_deadlines: int = 0

# -- User / Auth ---------------------------------------------------------------
class UserBase(BaseModel):
    username: str
    role: str = "Staff"


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    id: str


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    ok: bool
    user: Optional[UserOut] = None
    message: str = ""


class ChangePasswordRequest(BaseModel):
    username: str
    current_password: str
    new_password: str
