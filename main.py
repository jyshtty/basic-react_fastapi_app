from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Simple CRUD API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
items: dict[int, dict] = {}
next_id = 1


class ItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None


class ItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float


@app.get("/items", response_model=list[ItemResponse])
def list_items():
    return [ItemResponse(id=k, **v) for k, v in items.items()]


@app.get("/items/{item_id}", response_model=ItemResponse)
def get_item(item_id: int):
    if item_id not in items:
        raise HTTPException(status_code=404, detail="Item not found")
    return ItemResponse(id=item_id, **items[item_id])


@app.post("/items", response_model=ItemResponse, status_code=201)
def create_item(item: ItemCreate):
    global next_id
    items[next_id] = item.model_dump()
    created = ItemResponse(id=next_id, **items[next_id])
    next_id += 1
    return created


@app.put("/items/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, item: ItemUpdate):
    if item_id not in items:
        raise HTTPException(status_code=404, detail="Item not found")
    updates = {k: v for k, v in item.model_dump().items() if v is not None}
    items[item_id].update(updates)
    return ItemResponse(id=item_id, **items[item_id])


@app.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int):
    if item_id not in items:
        raise HTTPException(status_code=404, detail="Item not found")
    del items[item_id]
