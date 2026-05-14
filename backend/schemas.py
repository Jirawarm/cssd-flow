from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


# ── Users ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_]+$")
    full_name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=6)
    role: str = Field(default="user", pattern="^(user|admin)$")


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    role: Optional[str] = Field(None, pattern="^(user|admin)$")


class PasswordChange(BaseModel):
    new_password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Transactions ──────────────────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    department: str = Field(..., min_length=1, max_length=100)
    set_name: str = Field(..., min_length=1, max_length=200)
    inbound_qty: int = Field(..., gt=0)
    inbound_image: str = Field(...)
    notes: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(RECEIVED|WASHING|STERILIZING|READY|DISPATCHED)$")


class DispatchRequest(BaseModel):
    outbound_qty: int = Field(..., gt=0)
    outbound_image: str = Field(...)
    discrepancy_note: Optional[str] = None


class TransactionResponse(BaseModel):
    id: int
    department: str
    set_name: str
    inbound_qty: int
    outbound_qty: Optional[int] = None
    inbound_image: str
    outbound_image: Optional[str] = None
    discrepancy_note: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AuditLogResponse(BaseModel):
    id: int
    transaction_id: int
    action: str
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    operator_name: str
    details: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TransactionDetailResponse(BaseModel):
    transaction: TransactionResponse
    audit_logs: List[AuditLogResponse]


class StatsResponse(BaseModel):
    total: int
    by_status: dict[str, int]


TokenResponse.model_rebuild()
