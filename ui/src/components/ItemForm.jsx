import { useState, useEffect } from 'react';
import './ItemForm.css';

const EMPTY = { name: '', description: '', price: '' };

export default function ItemForm({ item, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(item ? { name: item.name, description: item.description ?? '', price: String(item.price) } : EMPTY);
    setError('');
  }, [item]);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const price = parseFloat(form.price);
    if (!form.name.trim()) return setError('Name is required.');
    if (isNaN(price) || price < 0) return setError('Price must be a non-negative number.');

    setSaving(true);
    try {
      await onSave({ name: form.name.trim(), description: form.description.trim() || null, price });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{item ? 'Edit Item' : 'Add Item'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-body">
            {error && <div className="form-error">{error}</div>}

            <label className="form-label">
              Name <span className="required">*</span>
              <input
                className="form-input"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Item name"
                autoFocus
              />
            </label>

            <label className="form-label">
              Description
              <input
                className="form-input"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Optional description"
              />
            </label>

            <label className="form-label">
              Price <span className="required">*</span>
              <input
                className="form-input"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                placeholder="0.00"
              />
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : item ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
