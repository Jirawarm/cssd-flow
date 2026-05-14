import os
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

import models
import schemas
import auth
from database import engine, get_db, Base

ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",")]

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CSSD-Flow API", version="2.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_STATUSES = ["RECEIVED", "WASHING", "STERILIZING", "READY", "DISPATCHED"]
STATUS_ORDER = {s: i for i, s in enumerate(VALID_STATUSES)}


def _log(db, tx_id, action, operator, prev=None, new=None, details=None):
    db.add(models.AuditLog(
        transaction_id=tx_id, action=action, operator_name=operator,
        previous_status=prev, new_status=new, details=details,
    ))


@app.on_event("startup")
def create_default_users():
    db = next(get_db())
    try:
        if not db.query(models.User).filter(models.User.username == "admin").first():
            db.add(models.User(
                username="admin", full_name="Administrator",
                password_hash=auth.hash_password("admin1234"),
                role="admin", is_active=True,
            ))
        if not db.query(models.User).filter(models.User.username == "staff").first():
            db.add(models.User(
                username="staff", full_name="Staff User",
                password_hash=auth.hash_password("staff1234"),
                role="user", is_active=True,
            ))
        db.commit()
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "CSSD-Flow API", "version": "2.2.0"}


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/auth/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not auth.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)
    token = auth.create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": schemas.UserResponse.model_validate(user)}


@app.get("/auth/me", response_model=schemas.UserResponse)
def me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# ── Users (admin only) ────────────────────────────────────────────────────────

@app.get("/users", response_model=List[schemas.UserResponse])
def list_users(
    _: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    return db.query(models.User).order_by(models.User.created_at).all()


@app.post("/users", response_model=schemas.UserResponse, status_code=201)
def create_user(
    payload: schemas.UserCreate,
    _: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(400, "Username already exists")
    user = models.User(
        username=payload.username,
        full_name=payload.full_name,
        password_hash=auth.hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.patch("/users/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int,
    payload: schemas.UserUpdate,
    current_user: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == current_user.id and payload.role == "user":
        raise HTTPException(400, "Cannot demote your own admin account")
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        user.role = payload.role
    db.commit()
    db.refresh(user)
    return user


@app.post("/users/{user_id}/reset-password", response_model=schemas.UserResponse)
def reset_password(
    user_id: int,
    payload: schemas.PasswordChange,
    _: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.password_hash = auth.hash_password(payload.new_password)
    db.commit()
    db.refresh(user)
    return user


@app.patch("/users/{user_id}/toggle-active", response_model=schemas.UserResponse)
def toggle_active(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == current_user.id:
        raise HTTPException(400, "Cannot deactivate your own account")
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user


# ── Transactions ──────────────────────────────────────────────────────────────

@app.post("/transactions", response_model=schemas.TransactionResponse, status_code=201)
def create_transaction(
    payload: schemas.TransactionCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    tx = models.Transaction(
        department=payload.department, set_name=payload.set_name,
        inbound_qty=payload.inbound_qty, inbound_image=payload.inbound_image,
        notes=payload.notes, status="RECEIVED",
    )
    db.add(tx)
    db.flush()
    _log(db, tx.id, "RECEIVED", current_user.full_name, new="RECEIVED",
         details=f"Received {payload.inbound_qty} item(s) from {payload.department}. Set: {payload.set_name}"
                 + (f". Notes: {payload.notes}" if payload.notes else ""))
    db.commit()
    db.refresh(tx)
    return tx


@app.get("/transactions", response_model=List[schemas.TransactionResponse])
def get_transactions(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    _: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(models.Transaction)
    if status:
        upper = status.upper()
        if upper not in VALID_STATUSES:
            raise HTTPException(400, f"Invalid status: {status}")
        q = q.filter(models.Transaction.status == upper)
    if search:
        q = q.filter(models.Transaction.set_name.ilike(f"%{search}%"))
    return q.order_by(models.Transaction.created_at.desc()).all()


@app.get("/transactions/{tx_id}", response_model=schemas.TransactionResponse)
def get_transaction(
    tx_id: int,
    _: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(404, "Transaction not found")
    return tx


@app.get("/transactions/{tx_id}/detail", response_model=schemas.TransactionDetailResponse)
def get_transaction_detail(
    tx_id: int,
    _: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(404, "Transaction not found")
    logs = (
        db.query(models.AuditLog)
        .filter(models.AuditLog.transaction_id == tx_id)
        .order_by(models.AuditLog.created_at.asc())
        .all()
    )
    return {
        "transaction": schemas.TransactionResponse.model_validate(tx),
        "audit_logs": [schemas.AuditLogResponse.model_validate(log) for log in logs],
    }


@app.patch("/transactions/{tx_id}/status", response_model=schemas.TransactionResponse)
def update_status(
    tx_id: int,
    payload: schemas.StatusUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(404, "Transaction not found")
    if tx.status == "DISPATCHED":
        raise HTTPException(400, "Cannot update a dispatched transaction")
    if payload.status == "DISPATCHED":
        raise HTTPException(400, "Use the /dispatch endpoint to dispatch")
    expected = STATUS_ORDER.get(tx.status, -1) + 1
    if STATUS_ORDER.get(payload.status, -1) != expected:
        raise HTTPException(400, f"Invalid transition: {tx.status} → {payload.status}")
    prev = tx.status
    tx.status = payload.status
    tx.updated_at = datetime.utcnow()
    _log(db, tx.id, "STATUS_CHANGED", current_user.full_name, prev=prev, new=payload.status,
         details=f"Workflow advanced: {prev} → {payload.status}")
    db.commit()
    db.refresh(tx)
    return tx


@app.post("/transactions/{tx_id}/dispatch", response_model=schemas.TransactionResponse)
def dispatch_transaction(
    tx_id: int,
    payload: schemas.DispatchRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(404, "Transaction not found")
    if tx.status == "DISPATCHED":
        raise HTTPException(400, "Transaction already dispatched")
    if tx.status != "READY":
        raise HTTPException(400, f"Must be READY before dispatch (current: {tx.status})")
    if payload.outbound_qty < tx.inbound_qty and not payload.discrepancy_note:
        raise HTTPException(400, "Discrepancy note required when outbound qty < inbound qty")

    has_disc = payload.outbound_qty < tx.inbound_qty
    action = "DISPATCHED_WITH_DISCREPANCY" if has_disc else "DISPATCHED"
    details = f"Dispatched {payload.outbound_qty}/{tx.inbound_qty} item(s) to {tx.department}"
    if has_disc:
        details += f". Missing: {tx.inbound_qty - payload.outbound_qty}. Note: {payload.discrepancy_note}"

    tx.outbound_qty = payload.outbound_qty
    tx.outbound_image = payload.outbound_image
    tx.discrepancy_note = payload.discrepancy_note
    tx.status = "DISPATCHED"
    tx.updated_at = datetime.utcnow()
    _log(db, tx.id, action, current_user.full_name, prev="READY", new="DISPATCHED", details=details)
    db.commit()
    db.refresh(tx)
    return tx


# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/stats", response_model=schemas.StatsResponse)
def get_stats(
    _: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    total = db.query(models.Transaction).count()
    by_status = {s: db.query(models.Transaction).filter(models.Transaction.status == s).count()
                 for s in VALID_STATUSES}
    return {"total": total, "by_status": by_status}


# ── Audit Logs ────────────────────────────────────────────────────────────────

@app.get("/audit-logs", response_model=List[schemas.AuditLogResponse])
def get_audit_logs(
    transaction_id: Optional[int] = Query(None),
    operator: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(default=200, le=500),
    _: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(models.AuditLog)
    if transaction_id:
        q = q.filter(models.AuditLog.transaction_id == transaction_id)
    if operator:
        q = q.filter(models.AuditLog.operator_name.ilike(f"%{operator}%"))
    if action:
        q = q.filter(models.AuditLog.action.ilike(f"%{action}%"))
    if department or search:
        q = q.join(models.Transaction)
        if department:
            q = q.filter(models.Transaction.department.ilike(f"%{department}%"))
        if search:
            q = q.filter(models.Transaction.set_name.ilike(f"%{search}%"))
    if date_from:
        try:
            q = q.filter(models.AuditLog.created_at >= datetime.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            q = q.filter(models.AuditLog.created_at <= datetime.fromisoformat(date_to))
        except ValueError:
            pass
    return q.order_by(models.AuditLog.created_at.desc()).limit(limit).all()


@app.get("/transactions/{tx_id}/audit-logs", response_model=List[schemas.AuditLogResponse])
def get_transaction_audit_logs(
    tx_id: int,
    _: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(404, "Transaction not found")
    return (
        db.query(models.AuditLog)
        .filter(models.AuditLog.transaction_id == tx_id)
        .order_by(models.AuditLog.created_at.desc())
        .all()
    )
