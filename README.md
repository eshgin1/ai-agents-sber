# Obligations Dashboard

```
obligations-dashboard/
├── frontend/   # React + Vite + Tailwind
└── backend/    # FastAPI (Docker) из gitverse
```

## Как запустить локально

### 1. Бэкенд

Нужен **Docker Desktop**.

```bash
cd backend
docker compose up --build
```

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- SSE: http://localhost:8000/events

```bash
docker compose down       # остановить
docker compose down -v    # остановить и сбросить БД
```

### 2. Фронтенд

```bash
cd frontend
npm install
npm run dev
```

UI: http://localhost:5173

Vite проксирует `/obligations` и `/events` на `http://localhost:8000`.

## Деплой (публичная ссылка)

Бэкенд нельзя держать на Vercel. Схема: **Render (API) + Vercel (UI)**.

### 1. Backend → [Render](https://render.com)

1. Залей репозиторий на GitHub (нужна папка `backend/`).
2. Dashboard → **New → Web Service** → подключи репо.
3. Settings:
   - Root Directory: `backend`
   - Runtime: **Docker**
   - Instance: Free
4. Deploy → получишь URL вида `https://xxx.onrender.com`
5. Проверь: `https://xxx.onrender.com/docs`

> Free-план на Render «засыпает» без трафика (~50 с на пробуждение).

### 2. Frontend → [Vercel](https://vercel.com)

1. **Add New Project** → тот же GitHub-репо.
2. Root Directory: `frontend`
3. Framework: Vite (авто)
4. Environment Variable:
   - Name: `VITE_API_URL`
   - Value: `https://xxx.onrender.com` (без `/` в конце)
5. Deploy → ссылка вида `https://yyy.vercel.app`

CORS на бэкенде уже `allow_origins=["*"]`, менять не нужно.

Локально `VITE_API_URL` не задавай — работает Vite proxy на `:8000`.

## Что использовал и почему

| Решение | Зачем |
|---------|--------|
| **Vite + React 19 + TypeScript** | Быстрый SPA и строгая типизация контракта FastAPI |
| **Только функциональные компоненты** | По ТЗ; хуки для SSE, URL-фильтров и загрузки |
| **`useReducer`** | Единый стейт для списка, фильтров, SSE и оптимистичной оплаты с откатом |
| **React Router (`useSearchParams`)** | Шаринг фильтров через URL без лишних библиотек |
| **Tailwind CSS v4** | Быстрая вёрстка карточек и бейджей срочности |
| **Docker backend из gitverse** | Готовый API + SQLite + SSE |

## Синхронизация с API

| UI | Backend |
|----|---------|
| Список обязательств | `GET /obligations` |
| Блок «Скоро спишут» | `GET /obligations/upcoming` → `renewal_alerts` |
| Сумма за месяц | клиентский расчёт по `active` + `next_payment_date` в текущем месяце |
| Оплата | `POST /obligations/{id}/pay` → `{ obligation, payment }` |
| Отмена | `PATCH /obligations/{id}/cancel` |
| Удаление | `DELETE /obligations/{id}` |
| История | `GET /obligations/{id}/payments` |
| Live-обновления | `EventSource('/events')` |
