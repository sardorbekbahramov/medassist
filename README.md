# 🏥 MedAssist — Professional Medical Telegram Bot Platform

A full-stack, production-ready medical assistant bot built with:
- **Backend**: Python + Aiogram 3.x + SQLAlchemy/SQLModel + PostgreSQL + Redis
- **AI**: Claude 3.5 Sonnet (Anthropic) — text analysis + vision
- **Frontend**: React + TypeScript + Tailwind CSS + Recharts + Leaflet.js
- **Infrastructure**: Docker + docker-compose

---

## 📁 Project Structure

```
medassist/
├── backend/          ← Python bot + REST API
│   ├── bot/          ← Aiogram handlers, middlewares, keyboards
│   ├── core/         ← Config, DB engine, Redis
│   ├── models/       ← SQLModel database tables
│   ├── services/     ← AI engine, location, user CRUD
│   ├── i18n/         ← EN / RU / UZ locale JSON files
│   └── migrations/   ← Alembic async migrations
└── frontend/         ← Telegram Mini App (React)
    └── src/
        ├── components/ ← Dashboard, MapView, Profile
        ├── hooks/      ← useTelegram
        └── lib/        ← API client
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker Desktop (recommended) OR PostgreSQL + Redis installed locally

---

### Step 1 — Clone & configure

```bash
# Copy env file
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
BOT_TOKEN=your_telegram_bot_token
ANTHROPIC_API_KEY=your_anthropic_key
DATABASE_URL=postgresql+asyncpg://medassist:medassist_secret@localhost:5432/medassist
REDIS_URL=redis://localhost:6379/0
ADMIN_IDS=your_telegram_user_id
```

---

### Step 2 — Start with Docker (easiest)

```bash
# From project root
docker-compose up --build
```

This starts:
- `medassist_bot` on port 8080
- `medassist_db` PostgreSQL on port 5432
- `medassist_redis` Redis on port 6379

The bot runs in **polling mode** locally (no webhook needed).

---

### Step 3 — Run without Docker

**Database & Redis** (install separately or use Docker for just these):
```bash
docker-compose up db redis -d
```

**Backend**:
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python seed.py          # Load default FAQ items
python -m bot.main      # Start bot (polling mode)
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev             # Runs on http://localhost:5173
```

---

### Step 4 — VS Code Setup

Open the project in VS Code. Recommended extensions:
- Python (Microsoft)
- Pylance
- ESLint
- Tailwind CSS IntelliSense

**Python interpreter**: Select `backend/venv/bin/python` (or `venv\Scripts\python.exe` on Windows).

**launch.json** (auto-created, or add manually):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Bot",
      "type": "python",
      "request": "launch",
      "module": "bot.main",
      "cwd": "${workspaceFolder}/backend",
      "envFile": "${workspaceFolder}/backend/.env"
    }
  ]
}
```

---

## 🌐 Production Deployment (Render / Railway)

### 1. Push to GitHub

### 2. Create services on Render:
- **Web Service**: backend directory, `python -m bot.main`
- **PostgreSQL**: Render managed database
- **Redis**: Render managed Redis

### 3. Set environment variables on Render:
```
BOT_TOKEN=...
ANTHROPIC_API_KEY=...
DATABASE_URL=postgresql+asyncpg://...  ← use Render's internal URL
REDIS_URL=redis://...
WEBHOOK_HOST=https://your-app.onrender.com
ADMIN_IDS=...
WEBAPP_URL=https://your-app.onrender.com/app
```

### 4. Build & deploy frontend:
```bash
cd frontend
npm run build
# Copy dist/ to backend/ (served as static files at /app)
```

---

## 🤖 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Start bot / begin onboarding |
| `/dashboard` | Quick health summary |
| `/nearby` | Find nearby pharmacies/hospitals |
| `/profile` | View your profile |
| `/analyze` | AI health analysis mode |

**Admin commands** (admin IDs only):
| Command | Description |
|---------|-------------|
| `/admin` | Show admin help |
| `/list_faq` | List all FAQ buttons |
| `/set_faq 0 ...` | Update FAQ button at position 0–4 |
| `/del_faq 0` | Deactivate FAQ at position |

---

## 🗄️ Database Schema

| Table | Description |
|-------|-------------|
| `users` | User profiles (telegram_id, name, age, weight, height, gender, language, goals) |
| `daily_analytics` | Per-day health logs (water, calories, macros, AI usage) |
| `faq_items` | Admin-configurable reply keyboard buttons (0–4 positions) |

**Run migrations**:
```bash
cd backend
alembic revision --autogenerate -m "initial"
alembic upgrade head
```

---

## 🔑 API Keys Needed

| Key | Where to get |
|-----|-------------|
| `BOT_TOKEN` | [@BotFather](https://t.me/BotFather) on Telegram |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |

---

## 🔒 Security Notes

- All AI calls include a **mandatory medical disclaimer**
- **Rate limiting**: max 20 AI analyses/user/day + 30 messages/user/minute
- **Input sanitization** in middleware
- **No conversation history** stored — each AI call is stateless
- Telegram WebApp `initData` verified via HMAC-SHA256

---

## 🌍 Supported Languages

| Code | Language |
|------|----------|
| `en` | English |
| `ru` | Russian |
| `uz` | Uzbek |

Add more: create `backend/i18n/XX.json`, add to `Language` enum in `models/user.py`, and update `i18n_service.py`.

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Bot framework | Aiogram 3.7 |
| AI | Claude 3.5 Sonnet (Anthropic) |
| Database ORM | SQLModel + SQLAlchemy async |
| Database | PostgreSQL 15 |
| FSM Storage | Redis |
| HTTP Server | aiohttp |
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS |
| Charts | Recharts |
| Maps | Leaflet.js + OpenStreetMap |
| Container | Docker + docker-compose |
