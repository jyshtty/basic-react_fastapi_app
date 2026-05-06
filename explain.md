# How This App Works

---

## The Big Picture

Imagine a toy shop.

- The **shop window** is the React frontend — it's what you see and click on.
- The **back room** is FastAPI — it stores all the items and does the real work.
- The **shopkeeper** who runs between them is the browser's `fetch` function.

When you open the app, the shop window asks the back room "hey, what items do we have?" The back room replies with a list. The shop window draws them on screen. When you add, edit, or delete — the shop window tells the back room, the back room updates its records, and the shop window redraws.

---

## The Two Worlds

```
┌─────────────────────────────────┐     ┌──────────────────────────────────┐
│         FRONTEND (React)        │     │         BACKEND (FastAPI)        │
│         localhost:5173          │     │         localhost:8000            │
│                                 │     │                                  │
│  What the user sees and clicks  │────▶│  Stores data, enforces rules     │
│  Runs inside the browser        │◀────│  Runs on the server              │
└─────────────────────────────────┘     └──────────────────────────────────┘
              HTTP requests (fetch)
```

They are two separate programs. They talk to each other using HTTP — the same language your browser uses to load any web page.

---

## The Secret Tunnel (Vite Proxy)

In development, there's a problem: the browser is strict about talking to different "addresses". The frontend is at port `5173` and the backend is at port `8000` — different addresses. The browser would block this and say "CORS error — not allowed."

So instead of the frontend talking directly to port `8000`, we dug a secret tunnel inside Vite (the tool that runs the frontend in dev mode).

```
┌─────────────┐    /api/items     ┌──────────────────┐    /items     ┌────────────┐
│   Browser   │ ────────────────▶ │  Vite Dev Server │ ────────────▶ │  FastAPI   │
│  port 5173  │                   │    port 5173      │               │  port 8000 │
│             │ ◀──────────────── │  (the tunnel)     │ ◀──────────── │            │
└─────────────┘    response       └──────────────────┘    response   └────────────┘
```

- Browser thinks it's talking to `5173` → no CORS problem
- Vite receives the request and forwards it to `8000` behind the scenes
- FastAPI replies to Vite, Vite replies to the browser
- Browser never knows about port `8000`

This is configured in `vite.config.js`:
```js
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    rewrite: (path) => path.replace(/^\/api/, ''),
  }
}
```
Any request starting with `/api` gets forwarded to FastAPI, and the `/api` prefix is stripped before forwarding. So `/api/items` becomes `/items` by the time FastAPI sees it.

---

## File By File — What Each File Does

### `main.py` — The Back Room Manager

```
FastAPI starts up
       │
       ├── Registers CORS middleware (allows browser access from port 5173)
       │
       ├── GET    /items         → list everything in the back room
       ├── GET    /items/{id}    → get one specific thing
       ├── POST   /items         → put a new thing in the back room
       ├── PUT    /items/{id}    → update something that's already there
       └── DELETE /items/{id}   → throw something away
```

All data lives in a Python dictionary in memory — like a whiteboard. If you restart the server, the whiteboard is wiped clean.

---

### `ui/src/api/items.js` — The Messenger

This file is the only place that knows the backend exists. Every other frontend file asks this file to do the talking.

```
fetchItems()    → GET  /api/items
createItem()    → POST /api/items        with { name, description, price }
updateItem()    → PUT  /api/items/{id}   with { name, description, price }
deleteItem()    → DELETE /api/items/{id}
```

All four functions use `fetch` — the browser's built-in HTTP caller. Every response goes through `handleResponse()` which checks if something went wrong and throws an error if so.

---

### `ui/src/App.jsx` — The Brain

This is the root React component. It owns all the state (the "memory" of the UI):

```
State it tracks:
  items        → the list of items fetched from backend
  loading      → true while waiting for backend
  error        → any error message to show
  search       → what the user typed in the search box
  sortField    → which column to sort by
  sortDir      → ascending or descending
  showForm     → is the Add/Edit modal open?
  editItem     → if editing, which item? null if adding
  deleteItemId → which item is waiting to be deleted?
```

On startup (`useEffect`), it calls `loadItems()` which calls `fetchItems()` from `api/items.js` and stores the result in `items`.

`displayed` is a computed value (via `useMemo`) — it takes `items`, filters by `search`, and sorts by `sortField`/`sortDir`. This recalculates automatically whenever those values change.

---

### `ui/src/components/ItemTable.jsx` — The Shop Window Display

Receives the list of items and displays them in a table. Has:
- A search input at the top
- Sortable column headers (click to sort, click again to reverse)
- Edit and Delete buttons per row

It does NOT fetch data itself — it only displays what `App.jsx` gives it.

---

### `ui/src/components/ItemForm.jsx` — The Add/Edit Form

A modal (popup) form with three fields: Name, Description, Price.

- If `item` prop is `null` → it's in "Add" mode
- If `item` prop has a value → it's in "Edit" mode, fields pre-filled

On submit it calls `onSave(data)` which goes back up to `App.jsx`, which calls either `createItem()` or `updateItem()` from the API file.

---

### `ui/src/components/ConfirmDialog.jsx` — The "Are You Sure?" Popup

A simple modal that shows a message and two buttons: Cancel and Delete. Appears when the user clicks Delete on a row. If confirmed, `App.jsx` calls `deleteItem()`.

---

## Every Endpoint — Full Call Flow

---

### 1. Load Items (on page open)

```
Browser opens app
       │
       ▼
App.jsx mounts → useEffect fires → loadItems()
       │
       ▼
api/items.js → fetchItems() → fetch('/api/items')
       │
       ▼
Vite proxy intercepts /api/items
       │   strips /api prefix
       ▼
FastAPI GET /items
       │
       ▼
loops over items dict → builds list of ItemResponse objects
       │
       ▼
returns JSON: [{ id, name, description, price }, ...]
       │
       ▼
Vite forwards response to browser
       │
       ▼
App.jsx → setItems(data) → React re-renders → ItemTable draws the rows
```

**FastAPI code:**
```python
@app.get("/items", response_model=list[ItemResponse])
def list_items():
    return [ItemResponse(id=k, **v) for k, v in items.items()]
```

---

### 2. Create Item

```
User clicks "+ Add Item"
       │
       ▼
App.jsx → setShowForm(true), setEditItem(null)
       │
       ▼
ItemForm renders in "Add" mode (empty fields)
       │
User fills in name, description, price → clicks "Add Item"
       │
       ▼
ItemForm validates:
  - name must not be empty
  - price must be a non-negative number
       │
       ▼
calls onSave(data) → App.jsx → createItem(data)
       │
       ▼
api/items.js → fetch('/api/items', { method: 'POST', body: JSON.stringify(data) })
       │
       ▼
Vite proxy → FastAPI POST /items
       │
       ▼
FastAPI creates new entry in items dict with next_id
       │
       ▼
returns 201 Created + { id, name, description, price }
       │
       ▼
App.jsx → loadItems() → re-fetches all items → table updates
ItemForm closes
```

**FastAPI code:**
```python
@app.post("/items", response_model=ItemResponse, status_code=201)
def create_item(item: ItemCreate):
    global next_id
    items[next_id] = item.model_dump()
    created = ItemResponse(id=next_id, **items[next_id])
    next_id += 1
    return created
```

---

### 3. Get Single Item

```
fetch('/api/items/3')
       │
       ▼
Vite proxy → FastAPI GET /items/3
       │
       ▼
FastAPI checks: is 3 in items dict?
  NO  → raises HTTPException(404, "Item not found")
  YES → returns { id: 3, name, description, price }
```

**FastAPI code:**
```python
@app.get("/items/{item_id}", response_model=ItemResponse)
def get_item(item_id: int):
    if item_id not in items:
        raise HTTPException(status_code=404, detail="Item not found")
    return ItemResponse(id=item_id, **items[item_id])
```

> Note: The UI doesn't call this directly — it fetches the full list and works from that. This endpoint exists for external callers or future use.

---

### 4. Edit Item

```
User clicks "Edit" on a row
       │
       ▼
App.jsx → setEditItem(item), setShowForm(true)
       │
       ▼
ItemForm renders in "Edit" mode (fields pre-filled with item data)
       │
User changes values → clicks "Save Changes"
       │
       ▼
ItemForm validates → calls onSave(data)
       │
       ▼
App.jsx → editItem is not null → updateItem(editItem.id, data)
       │
       ▼
api/items.js → fetch('/api/items/3', { method: 'PUT', body: JSON.stringify(data) })
       │
       ▼
Vite proxy → FastAPI PUT /items/3
       │
       ▼
FastAPI checks: is 3 in items dict?
  NO  → 404
  YES → merges only non-null fields into existing record
       │
       ▼
returns updated { id, name, description, price }
       │
       ▼
App.jsx → loadItems() → table updates with new values
```

**FastAPI code:**
```python
@app.put("/items/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, item: ItemUpdate):
    if item_id not in items:
        raise HTTPException(status_code=404, detail="Item not found")
    updates = {k: v for k, v in item.model_dump().items() if v is not None}
    items[item_id].update(updates)
    return ItemResponse(id=item_id, **items[item_id])
```

---

### 5. Delete Item

```
User clicks "Delete" on a row
       │
       ▼
App.jsx → setDeleteItemId(item.id)
       │
       ▼
ConfirmDialog renders: "Delete this item? This action cannot be undone."
       │
User clicks "Delete" to confirm
       │
       ▼
App.jsx → handleDelete() → deleteItem(deleteItemId)
       │
       ▼
api/items.js → fetch('/api/items/3', { method: 'DELETE' })
       │
       ▼
Vite proxy → FastAPI DELETE /items/3
       │
       ▼
FastAPI checks: is 3 in items dict?
  NO  → 404
  YES → del items[3]
       │
       ▼
returns 204 No Content (empty body — item is gone)
       │
       ▼
App.jsx → setDeleteItemId(null), loadItems() → table updates
```

**FastAPI code:**
```python
@app.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int):
    if item_id not in items:
        raise HTTPException(status_code=404, detail="Item not found")
    del items[item_id]
```

---

## Search and Sort — No Server Involved

Search and sort happen entirely in the browser — no HTTP call is made.

```
User types in search box
       │
       ▼
App.jsx → setSearch(value)
       │
       ▼
useMemo recalculates "displayed":
  1. filters items where name or description contains the search text
  2. sorts the result by sortField (id / name / price) in sortDir (asc / desc)
       │
       ▼
ItemTable re-renders with the filtered + sorted list
```

This is fast because all items are already in memory. No round-trip to the server.

---

## The Alternative: One Server in Production

In production, the Vite dev server doesn't exist — `npm run build` produces plain static files (HTML, CSS, JS) in `ui/dist/`.

You can tell FastAPI to serve those files too:

```python
from fastapi.staticfiles import StaticFiles

# All API routes above this line ...

app.mount("/", StaticFiles(directory="ui/dist", html=True), name="static")
```

**How it works:**

```
Browser requests /            → FastAPI serves ui/dist/index.html  (the React app)
Browser requests /items       → FastAPI route handles it           (API response)
Browser requests /assets/x.js → FastAPI serves ui/dist/assets/x.js (static file)
```

The `app.mount("/", ...)` line must be LAST in `main.py`. FastAPI reads routes top to bottom — if the static mount were first, it would catch everything including `/items` and your API would never be reached.

**Why this works without CORS:**
Both the React app and the API are now served from the same address (e.g. `http://localhost:8000`). The browser sees them as the same origin — no cross-origin request, no CORS header needed.

```
DEV:   Browser (5173) ──proxy──▶ FastAPI (8000)    ← 2 servers, CORS not needed
PROD:  Browser        ────────▶ FastAPI (8000)      ← 1 server, CORS not needed
                                 ├── serves /items API
                                 └── serves React static files
```

---

## Data Model

Each item has 4 fields:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | integer | auto | assigned by server, starts at 1 |
| name | string | yes | cannot be empty |
| description | string | no | optional, can be null |
| price | float | yes | must be ≥ 0 |

Storage is a Python dict: `{ 1: { name, description, price }, 2: { ... } }`. The `id` is the dict key. Data is lost when the server restarts.

---

## What Happens When Something Goes Wrong

```
Backend not running?
       │
       ▼
fetch() throws a network error
       │
       ▼
App.jsx catches it → setError(err.message)
       │
       ▼
UI shows red error banner with a "Retry" button

──────────────────────────────────────────

Item not found (404)?
       │
       ▼
FastAPI returns { "detail": "Item not found" }
       │
       ▼
handleResponse() in api/items.js throws new Error("Item not found")
       │
       ▼
ItemForm or App.jsx catches it → shows error message inside the form

──────────────────────────────────────────

Form validation fails (empty name, bad price)?
       │
       ▼
ItemForm checks before even calling fetch
       │
       ▼
setError("Name is required.") or setError("Price must be a non-negative number.")
       │
       ▼
Error shown inside the form — no HTTP call made
```
