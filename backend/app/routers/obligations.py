import uuid
from datetime import date, datetime
from typing import Optional

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Obligation, Payment
from app.schemas import (
    ObligationCreate,
    ObligationCreateResponse,
    ObligationOut,
    PayResponse,
    PaymentOut,
    RenewalAlert,
    UpcomingResponse,
)
from app.routers.events import broadcast

router = APIRouter()


def _obligation_to_dict(ob: Obligation) -> dict:
    return {
        "id": ob.id,
        "title": ob.title,
        "amount": ob.amount,
        "currency": ob.currency,
        "category": ob.category,
        "recurrence": ob.recurrence,
        "next_payment_date": ob.next_payment_date.isoformat() if ob.next_payment_date else None,
        "status": ob.status,
        "created_at": ob.created_at.isoformat() if ob.created_at else None,
        "updated_at": ob.updated_at.isoformat() if ob.updated_at else None,
    }


def _payment_to_dict(p: Payment) -> dict:
    return {
        "id": p.id,
        "obligation_id": p.obligation_id,
        "amount": p.amount,
        "currency": p.currency,
        "paid_at": p.paid_at.isoformat() if p.paid_at else None,
    }


def _apply_lazy_expiry(db: Session) -> None:
    today = date.today()
    expired = (
        db.query(Obligation)
        .filter(
            Obligation.status == "active",
            Obligation.recurrence.is_(None),
            Obligation.next_payment_date < today,
        )
        .all()
    )
    for ob in expired:
        ob.status = "expired"
        ob.updated_at = datetime.utcnow()
    if expired:
        db.commit()


@router.post("/obligations", response_model=None)
async def create_obligation(body: ObligationCreate, db: Session = Depends(get_db)):
    today = date.today()
    status = "expired" if body.next_payment_date < today else "active"

    duplicate = (
        db.query(Obligation)
        .filter(
            Obligation.title.ilike(body.title),
            Obligation.status == "active",
        )
        .first()
    )

    obligation = Obligation(
        id=str(uuid.uuid4()),
        title=body.title,
        amount=body.amount,
        currency=body.currency,
        category=body.category,
        recurrence=body.recurrence,
        next_payment_date=body.next_payment_date,
        status=status,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(obligation)
    db.commit()
    db.refresh(obligation)

    ob_out = ObligationOut.model_validate(obligation)
    await broadcast("obligation_created", {"type": "obligation_created", "obligation": ob_out.model_dump(mode="json")})

    warning = None
    if duplicate:
        warning = "Активное обязательство с таким названием уже существует"

    return ObligationCreateResponse(obligation=ob_out, warning=warning)


@router.get("/obligations", response_model=list[ObligationOut])
def list_obligations(
    category: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    _apply_lazy_expiry(db)

    query = db.query(Obligation)
    if category:
        query = query.filter(Obligation.category == category)
    if status:
        query = query.filter(Obligation.status == status)
    query = query.order_by(Obligation.next_payment_date.asc())
    return query.all()


@router.get("/obligations/upcoming", response_model=UpcomingResponse)
def upcoming_obligations(days: int = 7, db: Session = Depends(get_db)):
    today = date.today()
    end_date = today + relativedelta(days=days)

    obligations = (
        db.query(Obligation)
        .filter(
            Obligation.next_payment_date >= today,
            Obligation.next_payment_date <= end_date,
        )
        .order_by(Obligation.next_payment_date.asc())
        .all()
    )

    totals: dict[str, float] = {}
    for ob in obligations:
        totals[ob.currency] = round(totals.get(ob.currency, 0.0) + ob.amount, 2)

    renewal_alerts = [
        RenewalAlert(
            id=ob.id,
            title=ob.title,
            next_payment_date=ob.next_payment_date,
            amount=ob.amount,
            currency=ob.currency,
        )
        for ob in obligations
        if ob.category == "subscription" and ob.recurrence is not None
    ]

    return UpcomingResponse(
        obligations=[ObligationOut.model_validate(ob) for ob in obligations],
        totals=totals,
        renewal_alerts=renewal_alerts,
    )


@router.post("/obligations/{obligation_id}/pay", response_model=PayResponse)
async def pay_obligation(obligation_id: str, db: Session = Depends(get_db)):
    obligation = db.query(Obligation).filter(Obligation.id == obligation_id).first()
    if not obligation:
        raise HTTPException(status_code=404, detail="Obligation not found")

    if obligation.status != "active":
        raise HTTPException(
            status_code=422,
            detail=f"Cannot pay obligation with status '{obligation.status}'. Only active obligations can be paid.",
        )

    payment = Payment(
        id=str(uuid.uuid4()),
        obligation_id=obligation.id,
        amount=obligation.amount,
        currency=obligation.currency,
        paid_at=datetime.utcnow(),
    )
    db.add(payment)

    current_date = obligation.next_payment_date
    if obligation.recurrence == "monthly":
        obligation.next_payment_date = current_date + relativedelta(months=1)
        obligation.status = "active"
    elif obligation.recurrence == "quarterly":
        obligation.next_payment_date = current_date + relativedelta(months=3)
        obligation.status = "active"
    elif obligation.recurrence == "yearly":
        obligation.next_payment_date = current_date + relativedelta(years=1)
        obligation.status = "active"
    else:
        obligation.status = "cancelled"

    obligation.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obligation)
    db.refresh(payment)

    ob_out = ObligationOut.model_validate(obligation)
    pay_out = PaymentOut.model_validate(payment)

    await broadcast(
        "payment_recorded",
        {
            "type": "payment_recorded",
            "obligation_id": obligation.id,
            "payment": pay_out.model_dump(mode="json"),
        },
    )
    await broadcast("obligation_updated", {"type": "obligation_updated", "obligation": ob_out.model_dump(mode="json")})

    return PayResponse(obligation=ob_out, payment=pay_out)


@router.patch("/obligations/{obligation_id}/cancel", response_model=ObligationOut)
async def cancel_obligation(obligation_id: str, db: Session = Depends(get_db)):
    obligation = db.query(Obligation).filter(Obligation.id == obligation_id).first()
    if not obligation:
        raise HTTPException(status_code=404, detail="Obligation not found")

    if obligation.status != "active":
        raise HTTPException(
            status_code=422,
            detail=f"Cannot cancel obligation with status '{obligation.status}'. Only active obligations can be cancelled.",
        )

    obligation.status = "cancelled"
    obligation.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obligation)

    ob_out = ObligationOut.model_validate(obligation)
    await broadcast("obligation_updated", {"type": "obligation_updated", "obligation": ob_out.model_dump(mode="json")})

    return ob_out


@router.delete("/obligations/{obligation_id}", status_code=204)
async def delete_obligation(obligation_id: str, db: Session = Depends(get_db)):
    obligation = db.query(Obligation).filter(Obligation.id == obligation_id).first()
    if not obligation:
        raise HTTPException(status_code=404, detail="Obligation not found")

    db.query(Payment).filter(Payment.obligation_id == obligation_id).delete()
    db.delete(obligation)
    db.commit()

    await broadcast("obligation_deleted", {"type": "obligation_deleted", "id": obligation_id})


@router.get("/obligations/{obligation_id}/payments", response_model=list[PaymentOut])
def list_payments(obligation_id: str, db: Session = Depends(get_db)):
    obligation = db.query(Obligation).filter(Obligation.id == obligation_id).first()
    if not obligation:
        raise HTTPException(status_code=404, detail="Obligation not found")

    payments = (
        db.query(Payment)
        .filter(Payment.obligation_id == obligation_id)
        .order_by(Payment.paid_at.desc())
        .all()
    )
    return payments
