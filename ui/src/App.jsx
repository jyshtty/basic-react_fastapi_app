import { useState, useEffect, useMemo } from 'react';
import { fetchItems, createItem, updateItem, deleteItem } from './api/items';
import ItemTable from './components/ItemTable';
import ItemForm from './components/ItemForm';
import ConfirmDialog from './components/ConfirmDialog';
import './App.css';

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItemId, setDeleteItemId] = useState(null);

  async function loadItems() {
    setLoading(true);
    setError('');
    try {
      setItems(await fetchItems());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadItems(); }, []);

  function handleSort(field) {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  const displayed = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = q
      ? items.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            (i.description ?? '').toLowerCase().includes(q)
        )
      : items;

    return [...filtered].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [items, search, sortField, sortDir]);

  function openAdd() {
    setEditItem(null);
    setShowForm(true);
  }

  function openEdit(item) {
    setEditItem(item);
    setShowForm(true);
  }

  async function handleSave(data) {
    if (editItem) {
      await updateItem(editItem.id, data);
    } else {
      await createItem(data);
    }
    await loadItems();
  }

  async function handleDelete() {
    await deleteItem(deleteItemId);
    setDeleteItemId(null);
    await loadItems();
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <h1 className="app-title">Items Manager</h1>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Item</button>
        </div>
      </header>

      <main className="app-main">
        {loading && <div className="status-msg">Loading…</div>}
        {error && (
          <div className="status-msg status-error">
            Error: {error}&nbsp;
            <button className="retry-btn" onClick={loadItems}>Retry</button>
          </div>
        )}

        {!loading && !error && (
          <ItemTable
            items={displayed}
            search={search}
            onSearchChange={setSearch}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
            onEdit={openEdit}
            onDelete={setDeleteItemId}
          />
        )}
      </main>

      {showForm && (
        <ItemForm
          item={editItem}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}

      {deleteItemId !== null && (
        <ConfirmDialog
          message="Delete this item? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteItemId(null)}
        />
      )}
    </div>
  );
}
