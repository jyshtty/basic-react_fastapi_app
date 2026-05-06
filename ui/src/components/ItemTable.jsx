import './ItemTable.css';

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description', sortable: false },
  { key: 'price', label: 'Price' },
];

export default function ItemTable({ items, search, onSearchChange, sortField, sortDir, onSort, onEdit, onDelete }) {
  return (
    <div className="item-table-wrapper">
      <div className="table-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by name or description…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <span className="table-count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">No items found.</div>
      ) : (
        <table className="item-table">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={col.sortable !== false ? 'sortable' : ''}
                  onClick={col.sortable !== false ? () => onSort(col.key) : undefined}
                >
                  {col.label}
                  {col.sortable !== false && sortField === col.key && (
                    <span className="sort-indicator">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>
                  )}
                </th>
              ))}
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="td-id">{item.id}</td>
                <td className="td-name">{item.name}</td>
                <td className="td-desc">{item.description || <span className="text-muted">—</span>}</td>
                <td className="td-price">${item.price.toFixed(2)}</td>
                <td className="td-actions">
                  <button className="btn btn-edit" onClick={() => onEdit(item)}>Edit</button>
                  <button className="btn btn-delete" onClick={() => onDelete(item.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
