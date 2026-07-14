import os
import uuid
from datetime import date, datetime

from dateutil.relativedelta import relativedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/obligations.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def main():
    from app.database import Base
    from app.models import Obligation

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(Obligation).count()
        if existing > 0:
            print(f"Database already has {existing} obligations, skipping seed.")
            return

        today = date.today()

        obligations = [
            # --- Subscriptions (monthly/yearly) within next 7 days ---
            Obligation(
                id=str(uuid.uuid4()),
                title="Netflix",
                amount=9.99,
                currency="USD",
                category="subscription",
                recurrence="monthly",
                next_payment_date=today + relativedelta(days=2),
                status="active",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            Obligation(
                id=str(uuid.uuid4()),
                title="Spotify",
                amount=299.0,
                currency="RUB",
                category="subscription",
                recurrence="monthly",
                next_payment_date=today + relativedelta(days=5),
                status="active",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            Obligation(
                id=str(uuid.uuid4()),
                title="Adobe Creative Cloud",
                amount=54.99,
                currency="USD",
                category="subscription",
                recurrence="yearly",
                next_payment_date=today + relativedelta(days=6),
                status="active",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # --- Subscription far future ---
            Obligation(
                id=str(uuid.uuid4()),
                title="GitHub Pro",
                amount=4.0,
                currency="USD",
                category="subscription",
                recurrence="monthly",
                next_payment_date=today + relativedelta(months=1),
                status="active",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            Obligation(
                id=str(uuid.uuid4()),
                title="Яндекс Плюс",
                amount=399.0,
                currency="RUB",
                category="subscription",
                recurrence="monthly",
                next_payment_date=today + relativedelta(months=2),
                status="active",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # --- Bills within next 7 days ---
            Obligation(
                id=str(uuid.uuid4()),
                title="Электричество",
                amount=1500.0,
                currency="RUB",
                category="bill",
                recurrence="monthly",
                next_payment_date=today + relativedelta(days=3),
                status="active",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # --- Bill far future ---
            Obligation(
                id=str(uuid.uuid4()),
                title="Интернет",
                amount=690.0,
                currency="RUB",
                category="bill",
                recurrence="monthly",
                next_payment_date=today + relativedelta(months=1),
                status="active",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # --- Insurance ---
            Obligation(
                id=str(uuid.uuid4()),
                title="ОСАГО",
                amount=12000.0,
                currency="RUB",
                category="insurance",
                recurrence="yearly",
                next_payment_date=today + relativedelta(months=3),
                status="active",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            Obligation(
                id=str(uuid.uuid4()),
                title="Health Insurance",
                amount=150.0,
                currency="EUR",
                category="insurance",
                recurrence="quarterly",
                next_payment_date=today + relativedelta(months=2),
                status="active",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # --- Warranty (one-time, future) ---
            Obligation(
                id=str(uuid.uuid4()),
                title="Расширенная гарантия на ноутбук",
                amount=8990.0,
                currency="RUB",
                category="warranty",
                recurrence=None,
                next_payment_date=today + relativedelta(months=6),
                status="active",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # --- Expired obligations (one-time, past date) ---
            Obligation(
                id=str(uuid.uuid4()),
                title="Домен example.com",
                amount=890.0,
                currency="RUB",
                category="bill",
                recurrence=None,
                next_payment_date=today - relativedelta(months=2),
                status="expired",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            Obligation(
                id=str(uuid.uuid4()),
                title="Гарантия на телефон",
                amount=2990.0,
                currency="RUB",
                category="warranty",
                recurrence=None,
                next_payment_date=today - relativedelta(months=5),
                status="expired",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            Obligation(
                id=str(uuid.uuid4()),
                title="VPN разовый платёж",
                amount=29.99,
                currency="USD",
                category="subscription",
                recurrence=None,
                next_payment_date=today - relativedelta(months=1),
                status="expired",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # --- Cancelled obligation ---
            Obligation(
                id=str(uuid.uuid4()),
                title="Старый тариф мобильной связи",
                amount=500.0,
                currency="RUB",
                category="bill",
                recurrence="monthly",
                next_payment_date=today - relativedelta(months=3),
                status="cancelled",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # --- Insurance one-time far future ---
            Obligation(
                id=str(uuid.uuid4()),
                title="Travel Insurance",
                amount=89.0,
                currency="EUR",
                category="insurance",
                recurrence=None,
                next_payment_date=today + relativedelta(months=4),
                status="active",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
        ]

        db.add_all(obligations)
        db.commit()
        print(f"Seeded {len(obligations)} obligations successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
