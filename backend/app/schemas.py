from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ObligationCreate(BaseModel):
    title: str
    amount: float
    currency: str
    category: str
    recurrence: Optional[str] = None
    next_payment_date: date


class ObligationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    amount: float
    currency: str
    category: str
    recurrence: Optional[str]
    next_payment_date: date
    status: str
    created_at: datetime
    updated_at: datetime


class ObligationCreateResponse(BaseModel):
    obligation: ObligationOut
    warning: Optional[str] = None


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    obligation_id: str
    amount: float
    currency: str
    paid_at: datetime


class PayResponse(BaseModel):
    obligation: ObligationOut
    payment: PaymentOut


class RenewalAlert(BaseModel):
    id: str
    title: str
    next_payment_date: date
    amount: float
    currency: str


class UpcomingResponse(BaseModel):
    obligations: list[ObligationOut]
    totals: dict[str, float]
    renewal_alerts: list[RenewalAlert]
