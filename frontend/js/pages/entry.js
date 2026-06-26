/* ═══════════════════════════════════════════════════════════
   ENTRY.JS — Truck Entry Form
   ═══════════════════════════════════════════════════════════ */

const EntryPage = {
  render() {
    const now = new Date().toISOString().slice(0, 16);
    return `
      <div class="page-header">
        <div class="page-header-left">
          <h1>New Truck Entry</h1>
          <p>Register a new truck arrival and material delivery.</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:1.5rem;align-items:start;" id="entry-grid">
        <!-- Form Card -->
        <div class="card animate-fadeup">
          <div class="card-header">
            <div>
              <div class="card-title">Entry Details</div>
              <div class="card-subtitle">All fields are required</div>
            </div>
          </div>
          <div class="card-body">
            <form id="entry-form" novalidate>
              <div class="form-grid">
                <div>
                  <label class="form-label" for="truck-number">Truck Number *</label>
                  <input type="text" id="truck-number" class="form-control" placeholder="e.g. TRK-001" maxlength="20" />
                  <div class="invalid-feedback">Truck number is required.</div>
                </div>

                <div>
                  <label class="form-label" for="driver-name">Driver Name *</label>
                  <input type="text" id="driver-name" class="form-control" placeholder="e.g. Ramesh Kumar" maxlength="60" />
                  <div class="invalid-feedback">Driver name is required.</div>
                </div>

                <div>
                  <label class="form-label" for="transporter-name">Transporter Name *</label>
                  <input type="text" id="transporter-name" class="form-control" placeholder="e.g. VRL Logistics" maxlength="80" />
                  <div class="invalid-feedback">Transporter name is required.</div>
                </div>

                <div>
                  <label class="form-label" for="material-type">Material Type *</label>
                  <select id="material-type" class="form-control">
                    <option value="">— Select Material —</option>
                    <option value="Cement">Cement</option>
                    <option value="Sand">Sand</option>
                    <option value="Steel">Steel</option>
                    <option value="Gravel">Gravel</option>
                    <option value="Bricks">Bricks</option>
                    <option value="Other">Other</option>
                  </select>
                  <div class="invalid-feedback">Please select a material type.</div>
                </div>

                <div>
                  <label class="form-label" for="quantity">Quantity (kg) *</label>
                  <input type="number" id="quantity" class="form-control" placeholder="e.g. 1500" min="1" max="99999" step="0.01" />
                  <div class="invalid-feedback">Quantity must be a positive number.</div>
                </div>

                <div class="full-width" style="grid-column:1/-1;">
                  <label class="form-label" for="entry-time">Entry Date &amp; Time *</label>
                  <input type="datetime-local" id="entry-time" class="form-control" value="${now}" />
                  <div class="form-hint">Auto-filled with current date and time. You can adjust if needed.</div>
                </div>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-outline" onclick="EntryPage.clearForm()">Clear Form</button>
                <button type="submit" class="btn btn-primary" id="save-btn">Save Entry</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Info Panel -->
        <div style="display:flex;flex-direction:column;gap:1.25rem;">
          <!-- Quick Stats -->
          <div class="card animate-fadeup" style="animation-delay:0.1s;">
            <div class="card-header">
              <div class="card-title">Today's Summary</div>
            </div>
            <div class="card-body" id="today-summary">
              <div class="loading-state" style="padding:1rem;"><div class="spinner"></div></div>
            </div>
          </div>

          <!-- Tips -->
          <div class="card animate-fadeup" style="animation-delay:0.2s;background:linear-gradient(135deg,#EFF6FF,#F0FDF4);border-color:#BFDBFE;">
            <div class="card-body">
              <div style="font-size:1rem;font-weight:700;margin-bottom:0.5rem;">Entry Tips</div>
              <ul style="font-size:0.85rem;color:var(--gray-600);line-height:2;padding-left:1.25rem;">
                <li>Truck numbers are auto-converted to uppercase</li>
                <li>Quantity should be in kilograms (kg)</li>
                <li>Check entry time before saving</li>
                <li>All fields are mandatory</li>
              </ul>
            </div>
          </div>

          <!-- Recent by this user -->
          <div class="card animate-fadeup" style="animation-delay:0.3s;">
            <div class="card-header">
              <div class="card-title">Recent Entries</div>
            </div>
            <div id="recent-mini" class="card-body" style="padding:0;">
              <div class="loading-state" style="padding:1rem;"><div class="spinner"></div></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async load() {
    this.setupForm();
    await this.loadTodaySummary();
    await this.loadRecentMini();

    // Responsive: on mobile, stack to single column
    if (window.innerWidth < 900) {
      const grid = document.getElementById('entry-grid');
      if (grid) grid.style.gridTemplateColumns = '1fr';
    }
  },

  setupForm() {
    const form = document.getElementById('entry-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitEntry();
    });
  },

  async submitEntry() {
    const truckNumber      = document.getElementById('truck-number').value.trim();
    const driverName       = document.getElementById('driver-name').value.trim();
    const transporterName  = document.getElementById('transporter-name').value.trim();
    const materialType     = document.getElementById('material-type').value;
    const quantity         = document.getElementById('quantity').value;
    const entryTime        = document.getElementById('entry-time').value;

    // Validation
    let valid = true;
    const setValid = (id, isValid) => {
      const el = document.getElementById(id);
      el.classList.toggle('is-invalid', !isValid);
      if (!valid) valid = isValid;
      else if (!isValid) valid = false;
    };

    setValid('truck-number',     truckNumber.length > 0);
    setValid('driver-name',      driverName.length > 0);
    setValid('transporter-name', transporterName.length > 0);
    setValid('material-type',    materialType !== '');
    setValid('quantity',         quantity !== '' && !isNaN(quantity) && parseFloat(quantity) > 0);

    if (!valid) {
      Notify.warning('Validation Error', 'Please fill all required fields correctly.');
      return;
    }

    const btn = document.getElementById('save-btn');
    btn.disabled = true;
    btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;vertical-align:middle;margin-right:6px;"></span>Saving...';

    try {
      const entryTimeFormatted = entryTime
        ? entryTime.replace('T', ' ') + ':00'
        : null;

      await API.post('/api/entries', {
        truck_number:     truckNumber,
        driver_name:      driverName,
        transporter_name: transporterName,
        material_type:    materialType,
        quantity:         parseFloat(quantity),
        entry_time:       entryTimeFormatted,
      });

      Notify.success('Entry Saved', `Truck ${truckNumber.toUpperCase()} entry recorded successfully.`);
      this.clearForm();
      await this.loadTodaySummary();
      await this.loadRecentMini();
    } catch (err) {
      Notify.error('Save Failed', err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Save Entry';
    }
  },

  clearForm() {
    document.getElementById('truck-number').value = '';
    document.getElementById('driver-name').value = '';
    document.getElementById('transporter-name').value = '';
    document.getElementById('material-type').value = '';
    document.getElementById('quantity').value = '';
    document.getElementById('entry-time').value = new Date().toISOString().slice(0, 16);
    ['truck-number','driver-name','transporter-name','material-type','quantity'].forEach(id => {
      document.getElementById(id).classList.remove('is-invalid');
    });
  },

  async loadTodaySummary() {
    const container = document.getElementById('today-summary');
    if (!container) return;
    try {
      const data = await API.get('/api/reports/daily');
      const { summary, byMaterial } = data;
      container.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem;">
          <div style="text-align:center;padding:0.75rem;background:var(--primary-faint);border-radius:var(--radius);">
            <div style="font-size:1.5rem;font-weight:800;color:var(--primary);">${summary.total_trucks || 0}</div>
            <div style="font-size:0.7rem;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.08em;margin-top:2px;">Trucks</div>
          </div>
          <div style="text-align:center;padding:0.75rem;background:rgba(16,185,129,0.08);border-radius:var(--radius);">
            <div style="font-size:1.5rem;font-weight:800;color:var(--success);">${formatQuantity(summary.total_quantity || 0)}</div>
            <div style="font-size:0.7rem;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.08em;margin-top:2px;">kg Today</div>
          </div>
        </div>
        ${byMaterial.length > 0 ? `
          <div style="font-size:0.75rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.5rem;">By Material</div>
          ${byMaterial.map(m => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.3rem 0;border-bottom:1px solid var(--gray-100);">
              <span class="badge badge-${m.material_type.toLowerCase()}">${m.material_type}</span>
              <span style="font-size:0.8rem;font-weight:600;color:var(--gray-700);">${m.count} trucks · ${m.quantity.toLocaleString()} kg</span>
            </div>
          `).join('')}
        ` : '<p class="text-muted text-sm" style="text-align:center;">No entries today yet.</p>'}
      `;
    } catch (e) {
      container.innerHTML = '<p class="text-muted text-sm">Unable to load summary.</p>';
    }
  },

  async loadRecentMini() {
    const container = document.getElementById('recent-mini');
    if (!container) return;
    try {
      const data = await API.get('/api/entries' + API.buildQuery({ limit: 5, sort_by: 'entry_time', sort_dir: 'DESC' }));
      const entries = data.data;
      if (!entries.length) {
        container.innerHTML = '<p class="text-muted text-sm" style="padding:1rem;text-align:center;">No recent entries.</p>';
        return;
      }
      container.innerHTML = entries.map(e => `
        <div style="display:flex;gap:0.75rem;align-items:center;padding:0.75rem 1rem;border-bottom:1px solid var(--gray-100);">
          <div style="width:36px;height:36px;background:var(--primary-faint);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:var(--primary);flex-shrink:0;">TRK</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:0.8125rem;color:var(--navy);">${e.truck_number}</div>
            <div style="font-size:0.75rem;color:var(--gray-500);">${e.driver_name} · ${e.material_type}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:0.8rem;font-weight:700;color:var(--gray-800);">${e.quantity.toLocaleString()} kg</div>
          </div>
        </div>
      `).join('');
    } catch (e) {
      container.innerHTML = '<p class="text-muted text-sm" style="padding:1rem;">Unable to load.</p>';
    }
  },
};
