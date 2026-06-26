/* ═══════════════════════════════════════════════════════════
   HISTORY.JS — Entry History with search, sort, pagination
   ═══════════════════════════════════════════════════════════ */

const HistoryPage = {
  state: {
    page: 1,
    limit: 10,
    sort_by: 'entry_time',
    sort_dir: 'DESC',
    search: '',
    truck_number: '',
    transporter_name: '',
    material_type: '',
    date: '',
    total: 0,
    totalPages: 0,
    data: [],
  },

  render() {
    return `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Entry History</h1>
          <p>Browse, search, and manage all truck entry records.</p>
        </div>
      </div>

      <div class="card animate-fadeup">
        <!-- Filter Bar -->
        <div class="filter-bar">
          <div class="filter-group" style="flex:2;min-width:200px;">
            <label>Search</label>
            <input type="text" class="filter-input" id="filter-search" placeholder="Search truck, driver, transporter, material..." />
          </div>
          <div class="filter-group">
            <label>Truck No.</label>
            <input type="text" class="filter-input" id="filter-truck" placeholder="e.g. TRK-001" />
          </div>
          <div class="filter-group">
            <label>Transporter</label>
            <input type="text" class="filter-input" id="filter-transporter" placeholder="e.g. VRL Logistics" />
          </div>
          <div class="filter-group">
            <label>Material</label>
            <select class="filter-input" id="filter-material">
              <option value="">All Materials</option>
              <option value="Cement">Cement</option>
              <option value="Sand">Sand</option>
              <option value="Steel">Steel</option>
              <option value="Gravel">Gravel</option>
              <option value="Bricks">Bricks</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Date</label>
            <input type="date" class="filter-input" id="filter-date" />
          </div>
          <div style="display:flex;gap:0.5rem;align-items:flex-end;">
            <button class="btn btn-primary btn-sm" onclick="HistoryPage.applyFilters()">Apply</button>
            <button class="btn btn-outline btn-sm" onclick="HistoryPage.clearFilters()">Clear</button>
          </div>
        </div>

        <!-- Table Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.875rem 1.5rem;border-bottom:1px solid var(--gray-100);">
          <span class="text-sm text-muted" id="result-count">Loading...</span>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <label class="text-sm text-muted">Show:</label>
            <select class="filter-input" id="page-size" style="width:auto;padding:0.35rem 0.5rem;" onchange="HistoryPage.changePageSize(this.value)">
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        <!-- Table -->
        <div class="table-wrapper" id="history-table">
          <div class="loading-state"><div class="spinner"></div><p>Loading entries...</p></div>
        </div>

        <!-- Pagination -->
        <div style="padding:0.75rem 1.5rem;border-top:1px solid var(--gray-100);">
          <div class="pagination" id="pagination"></div>
        </div>
      </div>

      <!-- Edit Modal (hidden by default) -->
      <div id="edit-modal" style="display:none;"></div>
    `;
  },

  async load() {
    this.setupFilters();
    await this.fetchData();
  },

  setupFilters() {
    const search = document.getElementById('filter-search');
    if (search) {
      let debounceTimer;
      search.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this.applyFilters(), 400);
      });
    }
  },

  applyFilters() {
    this.state.page = 1;
    this.state.search           = document.getElementById('filter-search')?.value || '';
    this.state.truck_number     = document.getElementById('filter-truck')?.value || '';
    this.state.transporter_name = document.getElementById('filter-transporter')?.value || '';
    this.state.material_type    = document.getElementById('filter-material')?.value || '';
    this.state.date             = document.getElementById('filter-date')?.value || '';
    this.fetchData();
  },

  clearFilters() {
    ['filter-search','filter-truck','filter-transporter','filter-date'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const mat = document.getElementById('filter-material');
    if (mat) mat.value = '';
    this.state = { ...this.state, page: 1, search: '', truck_number: '', transporter_name: '', material_type: '', date: '' };
    this.fetchData();
  },

  changePageSize(val) {
    this.state.limit = parseInt(val);
    this.state.page = 1;
    this.fetchData();
  },

  async fetchData() {
    const tableEl = document.getElementById('history-table');
    if (tableEl) tableEl.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';

    try {
      const { page, limit, sort_by, sort_dir, search, truck_number, transporter_name, material_type, date } = this.state;
      const query = API.buildQuery({ page, limit, sort_by, sort_dir, search, truck_number, transporter_name, material_type, date });
      const res = await API.get('/api/entries' + query);
      this.state.data = res.data;
      this.state.total = res.pagination.total;
      this.state.totalPages = res.pagination.totalPages;
      this.renderTable(res.data);
      this.renderPagination();
      const countEl = document.getElementById('result-count');
      if (countEl) {
        const start = (page - 1) * limit + 1;
        const end   = Math.min(page * limit, this.state.total);
        countEl.textContent = this.state.total > 0
          ? `Showing ${start}–${end} of ${this.state.total} entries`
          : 'No entries found';
      }
    } catch (err) {
      Notify.error('Load Failed', err.message);
      if (tableEl) tableEl.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed to load entries.</p></div>';
    }
  },

  renderTable(data) {
    const tableEl = document.getElementById('history-table');
    if (!tableEl) return;
    const isAdmin = App.currentUser?.role === 'admin';

    if (!data.length) {
      tableEl.innerHTML = `<div class="empty-state">
        <div class="empty-icon" style="font-size:2rem;font-weight:300;">--</div>
        <p>No entries found</p>
        <div class="text-sm">Try adjusting your search filters.</div>
      </div>`;
      return;
    }

    const sortIcon = (col) => {
      if (this.state.sort_by !== col) return '<span class="sort-icon">⇅</span>';
      return this.state.sort_dir === 'ASC'
        ? '<span class="sort-icon">↑</span>'
        : '<span class="sort-icon">↓</span>';
    };

    tableEl.innerHTML = `
      <table>
        <thead>
          <tr>
            <th class="sortable ${this.state.sort_by==='truck_number'?'sorted-'+this.state.sort_dir.toLowerCase():''}"
                onclick="HistoryPage.sortBy('truck_number')">Truck Number ${sortIcon('truck_number')}</th>
            <th class="sortable ${this.state.sort_by==='driver_name'?'sorted-'+this.state.sort_dir.toLowerCase():''}"
                onclick="HistoryPage.sortBy('driver_name')">Driver Name ${sortIcon('driver_name')}</th>
            <th class="sortable ${this.state.sort_by==='transporter_name'?'sorted-'+this.state.sort_dir.toLowerCase():''}"
                onclick="HistoryPage.sortBy('transporter_name')">Transporter ${sortIcon('transporter_name')}</th>
            <th class="sortable ${this.state.sort_by==='material_type'?'sorted-'+this.state.sort_dir.toLowerCase():''}"
                onclick="HistoryPage.sortBy('material_type')">Material ${sortIcon('material_type')}</th>
            <th class="sortable ${this.state.sort_by==='quantity'?'sorted-'+this.state.sort_dir.toLowerCase():''}"
                onclick="HistoryPage.sortBy('quantity')">Quantity ${sortIcon('quantity')}</th>
            <th class="sortable ${this.state.sort_by==='entry_time'?'sorted-'+this.state.sort_dir.toLowerCase():''}"
                onclick="HistoryPage.sortBy('entry_time')">Date &amp; Time ${sortIcon('entry_time')}</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(e => `
            <tr>
              <td><span class="td-truck">${e.truck_number}</span></td>
              <td class="td-driver">${e.driver_name}</td>
              <td style="font-size:0.8125rem;color:var(--gray-700);">
                <span style="display:inline-flex;align-items:center;gap:0.4rem;">
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="#6366F1" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                  ${e.transporter_name || '—'}
                </span>
              </td>
              <td><span class="badge badge-${e.material_type.toLowerCase()}">${e.material_type}</span></td>
              <td class="td-qty">${e.quantity.toLocaleString()} kg</td>
              <td class="td-date">${formatDateTime(e.entry_time)}</td>
              <td>
                <div style="display:flex;gap:0.45rem;">
                  <button class="btn btn-warning btn-sm" style="padding: 0.35rem 0.65rem;" onclick="HistoryPage.openEdit(${e.id})" title="Edit">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px; vertical-align: middle;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                    Edit
                  </button>
                  ${isAdmin ? `
                  <button class="btn btn-danger btn-sm" style="padding: 0.35rem 0.65rem;" onclick="HistoryPage.deleteEntry(${e.id}, '${e.truck_number}')" title="Delete">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px; vertical-align: middle;"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    Delete
                  </button>` : ''}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  sortBy(col) {
    if (this.state.sort_by === col) {
      this.state.sort_dir = this.state.sort_dir === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.state.sort_by = col;
      this.state.sort_dir = 'DESC';
    }
    this.fetchData();
  },

  renderPagination() {
    const container = document.getElementById('pagination');
    if (!container) return;
    const { page, totalPages } = this.state;
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    const pages = [];
    pages.push(`<button class="page-btn" onclick="HistoryPage.goToPage(${page-1})" ${page===1?'disabled':''}>‹ Prev</button>`);

    const start = Math.max(1, page - 2);
    const end   = Math.min(totalPages, page + 2);

    if (start > 1) {
      pages.push(`<button class="page-btn" onclick="HistoryPage.goToPage(1)">1</button>`);
      if (start > 2) pages.push(`<span style="padding:0 4px;color:var(--gray-400);">…</span>`);
    }

    for (let i = start; i <= end; i++) {
      pages.push(`<button class="page-btn ${i===page?'active':''}" onclick="HistoryPage.goToPage(${i})">${i}</button>`);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push(`<span style="padding:0 4px;color:var(--gray-400);">…</span>`);
      pages.push(`<button class="page-btn" onclick="HistoryPage.goToPage(${totalPages})">${totalPages}</button>`);
    }

    pages.push(`<button class="page-btn" onclick="HistoryPage.goToPage(${page+1})" ${page===totalPages?'disabled':''}>Next ›</button>`);
    container.innerHTML = pages.join('');
  },

  goToPage(p) {
    const { totalPages } = this.state;
    if (p < 1 || p > totalPages) return;
    this.state.page = p;
    this.fetchData();
  },

  openEdit(id) {
    const entry = this.state.data.find(e => e.id === id);
    if (!entry) return;

    const entryTimeForInput = entry.entry_time
      ? entry.entry_time.replace(' ', 'T').slice(0, 16)
      : '';

    const modalHTML = `
      <div class="modal-overlay" id="edit-modal-overlay" onclick="if(event.target===this)HistoryPage.closeEdit()">
        <div class="modal">
          <div class="modal-header">
            <h3>Edit Entry — ${entry.truck_number}</h3>
            <button class="modal-close" onclick="HistoryPage.closeEdit()">✕</button>
          </div>
          <div class="modal-body">
            <form id="edit-form" novalidate>
              <div class="form-grid">
                <div>
                  <label class="form-label">Truck Number *</label>
                  <input type="text" id="edit-truck" class="form-control" value="${entry.truck_number}" />
                </div>
                <div>
                  <label class="form-label">Driver Name *</label>
                  <input type="text" id="edit-driver" class="form-control" value="${entry.driver_name}" />
                </div>
                <div style="grid-column:1/-1;">
                  <label class="form-label">Transporter Name *</label>
                  <input type="text" id="edit-transporter" class="form-control" placeholder="e.g. VRL Logistics" value="${entry.transporter_name || ''}" />
                </div>
                <div>
                  <label class="form-label">Material Type *</label>
                  <select id="edit-material" class="form-control">
                    ${['Cement','Sand','Steel','Gravel','Bricks','Other'].map(m =>
                      `<option value="${m}" ${entry.material_type===m?'selected':''}>${m}</option>`
                    ).join('')}
                  </select>
                </div>
                <div>
                  <label class="form-label">Quantity (kg) *</label>
                  <input type="number" id="edit-quantity" class="form-control" value="${entry.quantity}" min="1" />
                </div>
                <div style="grid-column:1/-1;">
                  <label class="form-label">Entry Date &amp; Time *</label>
                  <input type="datetime-local" id="edit-time" class="form-control" value="${entryTimeForInput}" />
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="HistoryPage.closeEdit()">Cancel</button>
            <button class="btn btn-primary" onclick="HistoryPage.saveEdit(${id})" id="edit-save-btn">Save Changes</button>
          </div>
        </div>
      </div>
    `;

    const container = document.getElementById('edit-modal');
    container.innerHTML = modalHTML;
    container.style.display = 'block';
  },

  closeEdit() {
    const container = document.getElementById('edit-modal');
    if (container) { container.innerHTML = ''; container.style.display = 'none'; }
  },

  async saveEdit(id) {
    const truckNumber      = document.getElementById('edit-truck')?.value.trim();
    const driverName       = document.getElementById('edit-driver')?.value.trim();
    const transporterName  = document.getElementById('edit-transporter')?.value.trim();
    const materialType     = document.getElementById('edit-material')?.value;
    const quantity         = document.getElementById('edit-quantity')?.value;
    const entryTime        = document.getElementById('edit-time')?.value;

    if (!truckNumber || !driverName || !transporterName || !materialType || !quantity || !entryTime) {
      Notify.warning('Validation Error', 'All fields are required.');
      return;
    }

    const btn = document.getElementById('edit-save-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      await API.put(`/api/entries/${id}`, {
        truck_number: truckNumber,
        driver_name: driverName,
        transporter_name: transporterName,
        material_type: materialType,
        quantity: parseFloat(quantity),
        entry_time: entryTime.replace('T', ' ') + ':00',
      });
      Notify.success('Updated!', 'Entry updated successfully.');
      this.closeEdit();
      this.fetchData();
    } catch (err) {
      Notify.error('Update Failed', err.message);
      btn.disabled = false;
      btn.textContent = '💾 Save Changes';
    }
  },

  async deleteEntry(id, truckNumber) {
    if (!confirm(`Are you sure you want to delete entry for truck ${truckNumber}? This action cannot be undone.`)) return;
    try {
      await API.delete(`/api/entries/${id}`);
      Notify.success('Deleted', `Entry for ${truckNumber} has been removed.`);
      this.fetchData();
    } catch (err) {
      Notify.error('Delete Failed', err.message);
    }
  },
};
