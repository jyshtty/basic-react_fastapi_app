# Basic React + FastAPI App

A full-stack CRUD application for managing items. React frontend, FastAPI backend, in-memory storage.

---

## Project Structure

```
fastapi-app/
├── main.py              # FastAPI backend — all API routes
├── requirements.txt     # Python dependencies
└── ui/                  # React frontend
    ├── index.html       # HTML entry point
    ├── vite.config.js   # Vite config with dev proxy
    ├── package.json     # Node dependencies
    └── src/
        ├── main.jsx             # React app entry point
        ├── App.jsx              # Root component — state, logic
        ├── api/
        │   └── items.js         # All HTTP calls to the backend
        └── components/
            ├── ItemTable.jsx    # Table with search + sort
            ├── ItemForm.jsx     # Add / Edit modal form
            └── ConfirmDialog.jsx # Delete confirmation modal
```

---

## Prerequisites

- Python 3.10+
- Node.js 18+

---

## Setup & Running (Development)

### 1. Backend

```bash
cd fastapi-app
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`

### 2. Frontend

```bash
cd fastapi-app/ui
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

Open `http://localhost:5173` in your browser.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/items` | List all items |
| GET | `/items/{id}` | Get a single item |
| POST | `/items` | Create a new item |
| PUT | `/items/{id}` | Update an existing item |
| DELETE | `/items/{id}` | Delete an item |

### Request / Response shapes

**Item object (response):**
```json
{ "id": 1, "name": "Apple", "description": "A fruit", "price": 1.99 }
```

**Create / Update body:**
```json
{ "name": "Apple", "description": "A fruit", "price": 1.99 }
```
`description` is optional. `name` and `price` are required.

Interactive docs available at `http://localhost:8000/docs` (Swagger UI).

---

## How Dev vs Production Differs

### Development (2 servers)

```
Browser (5173)
    |
    |  /api/items  -->  Vite dev server  -->  FastAPI (8000)
    |                   (proxy)
```

Vite's dev server proxies all `/api/*` requests to FastAPI. The browser never talks to port 8000 directly — this avoids CORS issues in dev.

### Production (1 server)

```bash
cd ui && npm run build         # produces ui/dist/
```

Add to `main.py` (after all routes):
```python
from fastapi.staticfiles import StaticFiles
app.mount("/", StaticFiles(directory="ui/dist", html=True), name="static")
```

```
Browser
    |
    |  /items      -->  FastAPI (8000)  -- API response
    |  /           -->  FastAPI (8000)  -- serves React HTML/JS/CSS
```

Single server handles everything. No Vite, no proxy, no CORS needed.

---

## CORS Middleware

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

- In **dev**: technically not needed (Vite proxy handles it), but harmless
- In **production** (without static file serving): required so the browser allows cross-origin requests

Update `allow_origins` to your production domain before deploying.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 19 |
| Frontend build tool | Vite 8 |
| Backend framework | FastAPI |
| Backend server | Uvicorn |
| Data storage | In-memory Python dict |
| HTTP client | Browser `fetch` API |
