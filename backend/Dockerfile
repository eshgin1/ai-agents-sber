FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p /app/data
ENV DATABASE_URL=sqlite:////app/data/obligations.db
# One-shot wipe so Render redeploy gets a fresh seed (remove rm after seed works)
CMD ["sh", "-c", "rm -f /app/data/obligations.db && python init_data.py && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
