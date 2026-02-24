# 💰 SpendWise

A simple full-stack expense tracking application built with React, Node.js/Express, PostgreSQL, and Docker.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, Vite, Axios               |
| Backend   | Node.js, Express 5, Morgan          |
| Database  | PostgreSQL 16                       |
| Container | Docker, Docker Compose              |
| Testing   | Jest + Supertest (backend), Vitest + Testing Library (frontend) |

---

## Project Structure

```
SpendWise-Core-App/
├── .env.example                  # Root environment variables template
├── docker-compose.yml            # Production Docker Compose
├── docker-compose.dev.yml        # Development Docker Compose (with hot reload)
│
├── backend/
│   ├── index.js                  # Express server & API routes
│   ├── init.sql                  # PostgreSQL schema & table setup
│   ├── package.json
│   ├── Dockerfile                # Production image
│   ├── Dockerfile.dev            # Dev image (nodemon)
│   ├── .env.example
│   └── __tests__/
│       └── expenses.test.js
│
└── frontend/
    ├── src/
    │   ├── App.jsx               # Main React component
    │   ├── App.css
    │   ├── main.jsx
    │   └── test/
    │       └── App.test.jsx
    ├── index.html
    ├── vite.config.js
    ├── nginx.conf                # Nginx config for production container
    ├── package.json
    ├── Dockerfile                # Production image (nginx)
    ├── Dockerfile.dev            # Dev image (Vite HMR)
    └── .env.example
```

---

## Features

- **Log Expense** — Add an expense with a name, amount, and category
- **View Expenses** — List all expenses ordered by most recent
- **Filter by Category** — Filter expenses by Food, Transport, Entertainment, Shopping, Bills, or Other
- **Total Spending** — View total spending (with optional category filter)
- **Delete Expense** — Remove an expense from the list
- **Responsive UI** — Works on desktop and mobile

### Expense Categories
`Food` · `Transport` · `Entertainment` · `Shopping` · `Bills` · `Other`

---

## API Endpoints

| Method | Endpoint                    | Description                        |
|--------|-----------------------------|------------------------------------|
| GET    | `/api/health`               | Health check                       |
| POST   | `/api/expenses`             | Add a new expense                  |
| GET    | `/api/expenses`             | Get all expenses (filterable)      |
| GET    | `/api/expenses/total`       | Get total spending (filterable)    |
| DELETE | `/api/expenses/:id`         | Delete an expense by ID            |

**Query Parameters:** `?category=Food` (supported on GET `/api/expenses` and `/api/expenses/total`)

---

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose — recommended
- Or: Node.js 20+ and PostgreSQL 16 for local development

---

### Option 1: Run with Docker (Recommended)

**1. Clone the repository**
```bash
git clone https://github.com/KofiAckah/SpendWise.git
cd SpendWise
```

**2. Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and set your database credentials if needed (defaults work out of the box).

**3. Start in development mode (with hot reload)**
```bash
docker-compose -f docker-compose.dev.yml up --build
```

**4. Access the app**
- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:5000](http://localhost:5000)

**Production mode:**
```bash
docker-compose up --build
```
- Frontend: [http://localhost:80](http://localhost:80)
- Backend API: [http://localhost:5000](http://localhost:5000)

---

### Option 2: Run Locally (without Docker)

**1. Set up PostgreSQL**

Create a database named `spendwise` and run `backend/init.sql` to create the schema.

**2. Backend**
```bash
cd backend
cp .env.example .env
# Edit .env — set DB_HOST=localhost and your credentials
npm install
npm run dev
```

**3. Frontend**
```bash
cd frontend
cp .env.example .env
# Edit .env — set VITE_API_URL=http://localhost:5000
npm install
npm run dev
```

**4. Access the app**
- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:5000](http://localhost:5000)

---

## Environment Variables

### Root `.env` (used by Docker Compose)

| Variable            | Default       | Description                        |
|---------------------|---------------|------------------------------------|
| `POSTGRES_DB`       | `spendwise`   | PostgreSQL database name           |
| `POSTGRES_USER`     | `postgres`    | PostgreSQL username                |
| `POSTGRES_PASSWORD` | `postgres123` | PostgreSQL password                |
| `PORT`              | `5000`        | Backend API port                   |
| `DB_HOST`           | `postgres`    | DB host (`postgres` for Docker)    |
| `DB_PORT`           | `5432`        | DB port                            |
| `DB_NAME`           | `spendwise`   | Database name                      |
| `DB_USER`           | `postgres`    | DB username                        |
| `DB_PASSWORD`       | `postgres123` | DB password                        |
| `VITE_API_URL`      | `http://localhost:5000` | Frontend API base URL  |

---

## Running Tests

**Backend tests (Jest + Supertest)**
```bash
cd backend
npm test
```

**Frontend tests (Vitest + Testing Library)**
```bash
cd frontend
npm test
```

---

## Docker Services

| Service    | Container Name            | Port          |
|------------|---------------------------|---------------|
| postgres   | `spendwise-db[-dev]`      | `5432`        |
| backend    | `spendwise-backend[-dev]` | `5000`        |
| frontend   | `spendwise-frontend[-dev]`| `80` / `5173` |

---

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS expenses (
  id         SERIAL PRIMARY KEY,
  item_name  VARCHAR(255) NOT NULL,
  amount     NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  category   VARCHAR(50) DEFAULT 'Other',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## License

ISC
