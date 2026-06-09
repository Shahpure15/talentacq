const API_URL = '/api/interview-rounds';
let currentId = null;
let debounceTimer = null;
let mode = 'new';
const fieldIds = ['round-name', 'is-elimination', 'is-active'];

function applyFieldSizes() {
  const c = document.getElementById('round-code'); if(c) c.style.flex = 'none'; if(c) c.style.width = '150px';
  const e = document.getElementById('is-elimination'); if(e) e.style.flex = 'none'; if(e) e.style.width = '80px';
  const s = document.getElementById('is-active'); if(s) s.style.flex = 'none'; if(s) s.style.width = '80px';
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
  currentId = data.round_id;
  setIdBadge(currentId);
  document.getElementById('round-code').value = data.round_code || '';
  document.getElementById('round-name').value = data.round_name || '';
  document.getElementById('is-elimination').value = data.is_elimination != null ? data.is_elimination : '1';
  document.getElementById('is-active').value = data.is_active != null ? data.is_active : '1';
  if (mode === 'find') {
    addGreenTint(fieldIds);
    document.getElementById('save-btn').textContent = 'Update';
    document.getElementById('save-btn').className = 'btn-save btn-update';
  }
}

function resetForm(clearCode) {
  currentId = null;
  if (clearCode) document.getElementById('round-code').value = '';
  document.getElementById('round-name').value = '';
  document.getElementById('is-elimination').value = '1';
  document.getElementById('is-active').value = '1';
  removeGreenTint(fieldIds);
  document.getElementById('save-btn').textContent = 'Save';
  document.getElementById('save-btn').className = 'btn-save';
  hideMessage();
  resetIdBadge();
}

async function handleSave() {
  const payload = {
    round_code: document.getElementById('round-code').value.trim(),
    round_name: document.getElementById('round-name').value.trim(),
    is_elimination: document.getElementById('is-elimination').value,
    is_active: document.getElementById('is-active').value
  };
  if (!payload.round_code || !payload.round_name) return showMessage('Code and Name required.', 'error');
  try {
    const res = await fetch(currentId ? `${API_URL}/${currentId}` : API_URL, {
      method: currentId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      if (!currentId) { resetForm(true); if (mode === 'new') loadNextId(); showMessage('Round saved.', 'success'); }
      else showMessage('Round updated.', 'success');
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

window.onload = () => { applyFieldSizes(); loadNextId(); };