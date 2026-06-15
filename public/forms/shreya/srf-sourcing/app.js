const API_URL = '/api/srf-sourcings';
let currentId = null;
let debounceTimer = null;
let mode = 'new';
const fieldIds = ['channel-id', 'vendor-id', 'referrer-employee-id', 'activation-date', 'deactivation-date', 'srf-id', 'status', 'posting-url'];

function applyFieldSizes() {
  const c = document.getElementById('sourcing-reference'); if(c) c.style.flex = 'none'; if(c) c.style.width = '200px';
}

function toggleMode() {
  if (mode === 'new') {
    mode = 'find';
    document.getElementById('mode-toggle-btn').textContent = 'New';
    document.getElementById('mode-toggle-btn').className = 'btn-mode-new';
    document.getElementById('mode-label').textContent = 'Find Record';
  } else {
    mode = 'new';
    document.getElementById('mode-toggle-btn').textContent = 'Find';
    document.getElementById('mode-toggle-btn').className = 'btn-mode-find';
    document.getElementById('mode-label').textContent = 'New Entry';
    loadNextId();
  }
  resetForm(true);
}

async function loadNextId() {
  try {
    const res = await fetch(`${API_URL}/next-id`);
    const json = await res.json();
    if (json.success) setIdBadge(json.next_id + ' (preview)');
  } catch (e) {}
}

function handleCodeInput(v) {
  if (mode !== 'find') return;
  clearTimeout(debounceTimer);
  const code = v.trim();
  if (!code) { resetForm(false); loadNextId(); return; }
  debounceTimer = setTimeout(() => fetchByCode(code), 500);
}

async function fetchByCode(code) {
  try {
    const res = await fetch(`${API_URL}/code/${encodeURIComponent(code)}`);
    const json = await res.json();
    if (json.success) { populateForm(json.data); showMessage('Record found.', 'info'); }
    else { resetForm(false); showMessage('No record found.', 'error'); }
  } catch (err) { showMessage('Could not reach server.', 'error'); }
}

function populateForm(data) {
  currentId = data.sourcing_id;
  setIdBadge(currentId);
  document.getElementById('sourcing-reference').value = data.sourcing_reference || '';
  document.getElementById('channel-id').value = data.channel_id || '';
  document.getElementById('vendor-id').value = data.vendor_id || '';
  document.getElementById('referrer-employee-id').value = data.referrer_employee_id || '';
  document.getElementById('activation-date').value = data.activation_date || '';
  document.getElementById('deactivation-date').value = data.deactivation_date || '';
  document.getElementById('srf-id').value = data.srf_id || '';
  document.getElementById('status').value = data.status || 'Active';
  document.getElementById('posting-url').value = data.posting_url || '';
  if (mode === 'find') {
    addGreenTint(fieldIds);
    document.getElementById('save-btn').textContent = 'Update';
    document.getElementById('save-btn').className = 'btn-save btn-update';
  }
}

function resetForm(clearCode) {
  currentId = null;
  if (clearCode) document.getElementById('sourcing-reference').value = '';
  document.getElementById('channel-id').value = '';
  document.getElementById('vendor-id').value = '';
  document.getElementById('referrer-employee-id').value = '';
  document.getElementById('activation-date').value = '';
  document.getElementById('deactivation-date').value = '';
  document.getElementById('srf-id').value = '';
  document.getElementById('status').value = 'Active';
  document.getElementById('posting-url').value = '';
  removeGreenTint(fieldIds);
  document.getElementById('save-btn').textContent = 'Save';
  document.getElementById('save-btn').className = 'btn-save';
  hideMessage();
  resetIdBadge();
}

async function handleSave() {
  const payload = {
    sourcing_reference: document.getElementById('sourcing-reference').value.trim(),
    channel_id: document.getElementById('channel-id').value,
    vendor_id: document.getElementById('vendor-id').value,
    referrer_employee_id: document.getElementById('referrer-employee-id').value,
    activation_date: document.getElementById('activation-date').value,
    deactivation_date: document.getElementById('deactivation-date').value,
    srf_id: document.getElementById('srf-id').value,
    status: document.getElementById('status').value,
    posting_url: document.getElementById('posting-url').value.trim()
  };
  if (!payload.sourcing_reference) return showMessage('Sourcing Ref required.', 'error');
  try {
    const res = await fetch(currentId ? `${API_URL}/${currentId}` : API_URL, {
      method: currentId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      if (!currentId) { resetForm(true); if (mode === 'new') loadNextId(); showMessage('Sourcing saved.', 'success'); }
      else showMessage('Sourcing updated.', 'success');
    } else showMessage(json.message || 'Error saving.', 'error');
  } catch (e) { showMessage('Server error.', 'error'); }
}

async function handleNext() {
  if (!currentId) return showMessage('Use Find mode.', 'info');
  try {
    const res = await fetch(`${API_URL}/next/${currentId}`);
    const json = await res.json();
    if (json.success) populateForm(json.data);
    else showMessage(json.message || 'Last record.', 'info');
  } catch (e) {}
}

async function handlePrevious() {
  if (!currentId) return showMessage('Use Find mode.', 'info');
  try {
    const res = await fetch(`${API_URL}/previous/${currentId}`);
    const json = await res.json();
    if (json.success) populateForm(json.data);
    else showMessage(json.message || 'First record.', 'info');
  } catch (e) {}
}

function handleExit() { window.location.href = '../../index.html'; }

window.onload = () => {
  applyFieldSizes(); loadNextId();
  loadDropdown('/api/sourcing-channels', 'channel-id', 'channel_id', 'channel_name');
  loadDropdown('/api/vendors', 'vendor-id', 'vendor_id', 'vendor_name');
  loadDropdown('/api/employees', 'referrer-employee-id', 'employee_id', 'first_name', item => `${item.first_name || ''} ${item.last_name || ''}`.trim());
  loadDropdown('/api/srfs', 'srf-id', 'srf_id', 'srf_number');
};
