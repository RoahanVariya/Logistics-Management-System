/* ═══════════════════════════════════════════════════════════
   EXPORT.JS — Export Data page
   ═══════════════════════════════════════════════════════════ */

const ExportPage = {
  filters: { truck_number: '', material_type: '', date: '' },

  render() {
    return `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Export Data</h1>
          <p>Download truck entry records in CSV or Excel format.</p>
        </div>
      </div>

      <!-- Filter Card -->
      <div class="card animate-fadeup" style="margin-bottom:1.5rem;">
        <div class="card-header">
          <div class="card-title">Export Filters</div>
          <div class="card-subtitle">Optionally filter data before exporting</div>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div>
              <label class="form-label" for="exp-truck">Truck Number</label>
              <input type="text" id="exp-truck" class="form-control" placeholder="e.g. TRK-001 (leave blank for all)" />
            </div>
            <div>
              <label class="form-label" for="exp-material">Material Type</label>
              <select id="exp-material" class="form-control">
                <option value="">All Materials</option>
                <option value="Cement">Cement</option>
                <option value="Sand">Sand</option>
                <option value="Steel">Steel</option>
                <option value="Gravel">Gravel</option>
                <option value="Bricks">Bricks</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label class="form-label" for="exp-date">Specific Date</label>
              <input type="date" id="exp-date" class="form-control" />
            </div>
            <div style="display:flex;align-items:flex-end;gap:0.75rem;">
              <button class="btn btn-outline" onclick="ExportPage.clearFilters()">Clear Filters</button>
              <button class="btn btn-primary" onclick="ExportPage.previewCount()">Preview Count</button>
            </div>
          </div>
          <div id="preview-count" style="margin-top:1rem;"></div>
        </div>
      </div>

      <!-- Export Options -->
      <div class="export-cards">
        <!-- CSV -->
        <div class="export-card" onclick="ExportPage.exportCSV()">
          <div class="export-icon csv" style="color:#059669;">
            <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line><line x1="9" y1="11" x2="15" y2="11"></line><line x1="9" y1="17" x2="15" y2="17"></line></svg>
          </div>
          <h3>Export as CSV</h3>
          <p>Download a comma-separated values file. Compatible with all spreadsheet applications.</p>
          <div style="width:100%;">
            <button class="btn btn-success" style="width:100%;justify-content:center;gap:0.4rem;" id="btn-csv">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download CSV
            </button>
          </div>
        </div>

        <!-- Excel -->
        <div class="export-card" onclick="ExportPage.exportExcel()">
          <div class="export-icon excel" style="color:var(--primary);">
            <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M8 11h8v10H8z"></path><line x1="8" y1="15" x2="16" y2="15"></line><line x1="12" y1="11" x2="12" y2="21"></line></svg>
          </div>
          <h3>Export as Excel</h3>
          <p>Download a professionally formatted Excel workbook with headers and styling applied.</p>
          <div style="width:100%;">
            <button class="btn btn-primary" style="width:100%;justify-content:center;gap:0.4rem;" id="btn-excel">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download Excel (.xlsx)
            </button>
          </div>
        </div>
      </div>

      <!-- Info Card -->
      <div class="card animate-fadeup" style="margin-top:1.5rem;background:linear-gradient(135deg,#F0FDF4,#EFF6FF);border-color:#BFDBFE;">
        <div class="card-body" style="display:flex;gap:1.25rem;align-items:flex-start;">
          <div style="font-size:1.5rem;font-weight:700;color:var(--gray-600);flex-shrink:0;">i</div>
          <div>
            <div style="font-weight:700;color:var(--gray-800);margin-bottom:0.35rem;">Export Information</div>
            <ul style="font-size:0.875rem;color:var(--gray-600);line-height:1.9;padding-left:1.25rem;">
              <li>Exported files include: ID, Truck Number, Driver Name, Material Type, Quantity, Entry Date &amp; Time</li>
              <li>Use filters above to export specific records; leave blank to export all records</li>
              <li>Excel files include formatted headers with blue header row and alternating row colors</li>
              <li>CSV files can be opened in Excel, Google Sheets, or any text editor</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  },

  load() {
    // Nothing async to load initially
  },

  getFilters() {
    return {
      truck_number: document.getElementById('exp-truck')?.value.trim() || '',
      material_type: document.getElementById('exp-material')?.value || '',
      date: document.getElementById('exp-date')?.value || '',
    };
  },

  clearFilters() {
    ['exp-truck', 'exp-date'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const mat = document.getElementById('exp-material');
    if (mat) mat.value = '';
    const preview = document.getElementById('preview-count');
    if (preview) preview.innerHTML = '';
  },

  async previewCount() {
    const filters = this.getFilters();
    const preview = document.getElementById('preview-count');
    if (!preview) return;
    preview.innerHTML = '<span style="color:var(--gray-500);font-size:0.875rem;">Counting records...</span>';
    try {
      const query = API.buildQuery({ ...filters, limit: 1, page: 1 });
      const res = await API.get('/api/entries' + query);
      preview.innerHTML = `
        <div style="display:inline-flex;align-items:center;gap:0.5rem;padding:0.5rem 1rem;background:rgba(37,99,235,0.08);border-radius:var(--radius);border:1px solid rgba(37,99,235,0.2);">
          <span style="font-weight:700;color:var(--primary);">${res.pagination.total}</span>
          <span style="font-size:0.875rem;color:var(--gray-600);">records will be exported with current filters</span>
        </div>
      `;
    } catch (err) {
      preview.innerHTML = `<span style="color:var(--danger);font-size:0.875rem;">Failed to count: ${err.message}</span>`;
    }
  },

  exportCSV() {
    const filters = this.getFilters();
    const query = API.buildQuery(filters);
    const btn = document.getElementById('btn-csv');
    if (btn) { btn.textContent = 'Preparing...'; btn.disabled = true; }
    setTimeout(() => {
      window.location.href = '/api/reports/export/csv' + query;
      Notify.success('CSV Export Started', 'Your download should begin shortly.');
      if (btn) { btn.textContent = 'Download CSV'; btn.disabled = false; }
    }, 300);
  },

  exportExcel() {
    const filters = this.getFilters();
    const query = API.buildQuery(filters);
    const btn = document.getElementById('btn-excel');
    if (btn) { btn.textContent = 'Preparing...'; btn.disabled = true; }
    setTimeout(() => {
      window.location.href = '/api/reports/export/excel' + query;
      Notify.success('Excel Export Started', 'Your download should begin shortly.');
      if (btn) { btn.textContent = 'Download Excel (.xlsx)'; btn.disabled = false; }
    }, 300);
  },
};
