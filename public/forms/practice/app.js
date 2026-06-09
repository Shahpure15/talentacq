const API_URL = '/api/practices';
let currentId = null;
let debounceTimer = null;
let mode = 'new'; 

const fieldIds = ['practice-name', 'practice-head-id', 'is-active'];

function applyFieldSizes() {
  const codeEl = document.getElementById('practice-code');
  if(codeEl) Object.assign(codeEl.style, { flex: 'none', width: '150px' });
  const statusEl = document.getElementById('is-active');
  if(statusEl) Object.assign(statusEl.style, { flex: 'none', width: '80px' });
}

function toggleMode() {
  if (mode === 'new') {
    mode = 'find';
    document.getElementById('mode-toggle-btn').textContent = 'New';
    document.getElementById('mode-toggle-btn').className   = 'btn-mode-new';
    document.getElementById('mode-label').textContent      = 'Find Record';
    resetForm(true);
  } else {
    mode = 'new';
    document.getElementById('mode-toggle-btn').textContent = 'Find';
    document.getElementById('mode-toggle-btn').className   = 'btn-mode-find';
    document.getElementById('mode-label').textContent      = 'New Entry';
    resetForm(true);
    loadNextId();
  }
}

async function loadNextId() {
  try {
    const res  = await fetch(`${API_URL}/next-id`);
    const json = await res.json();
    if (json.success) setIdBadge(json.next_id + ' (preview)');
  } catch (e) {}
}

function handleCodeInput(value) {
  if (mode !== 'find') return;
  clearTimeout(debounceTimer);
  const code = value.trim();
  if (code.length === 0) { resetForm(false); loadNextId(); return; }
  debounceTimer = setTimeout(() => fetchByCode(code), 500);
}

async function fetchByCode(code) {
  try {
    const res = await fetch(`${API_URL}/code/${encodeURIComponent(code)}`);
    const json = await res.json();
    if (json.success) {
      populateForm(json.data);
      showMessage('Record found.', 'info');
    } else {
      resetForm(false);
      showMessage('No record found.', 'error');
    }
  } catch (err) {
    console.error(err);
    showMessage('Could not reach the server.', 'error');
  }
}

function populateForm(data) {
  currentId = data.practice_id;
  setIdBadge(currentId);
  document.getElementById('practice-code').value = data.practice_code || '';
  document.getElementById('practice-name').value = data.practice_name || '';
  document.getElementById('practice-head-id').value = data.practice_head_id || '';
  document.getElementById('is-active').value = data.is_active != null ? data.is_active : '1';
  
  if (mode === 'find') {
    addGreenTint(fieldIds);
    const saveBtn = document.getElementById('save-btn');
    saveBtn.textContent = 'Update';
    saveBtn.className = 'btn-save btn-update';
  }
}

function resetForm(clearCode) {
  currentId = null;
  if (clearCode) document.getElementById('practice-code').value = '';
  document.getElementById('practice-name').value = '';
  document.getElementById('practice-head-id').value = '';
  document.getElementById('is-active').value = '1';
  
  removeGreenTint(fieldIds);
  const saveBtn = document.getElementById('save-btn');
  saveBtn.textContent = 'Save';
  saveBtn.className = 'btn-save';
  hideMessage();
  resetIdBadge();
}

async function handleSave() {
  const practice_code = document.getElementById('practice-code').value.trim();
  const practice_name = document.getElementById('practice-name').value.trim();
  const practice_head_id = document.getElementById('practice-head-id').value;
  const is_active = document.getElementById('is-active').value;

  if (!practice_code || !practice_name) {
    showMessage('Practice Code and Name are required.', 'error');
    return;
  }

  const payload = { practice_code, practice_name, practice_head_id, is_active };

  try {
    let res, json;
    if (currentId) {
      res = await fetch(`${API_URL}/${currentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      json = await res.json();
      if (json.success) showMessage('Practice updated.', 'success');
      else showMessage(json.message || 'Error updating record.', 'error');
    } else {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      json = await res.json();
      if (json.success) {
        resetForm(true);
        if (mode === 'new') loadNextId();
        showMessage('Practice saved.', 'success');
      } else {
        showMessage(json.message || 'Error saving record.', 'error');
      }
    }
  } catch (e) {
    console.error(e);
    showMessage('Could not reach the server.', 'error');
  }
}

async function handleNext() {
  if (!currentId) { showMessage('Use Find mode to navigate records.', 'info'); return; }
  try {
    const res = await fetch(`${API_URL}/next/${currentId}`);
    const json = await res.json();
    if (json.success) populateForm(json.data);
    else showMessage(json.message || 'Last record reached.', 'info');
  } catch (e) { console.error(e); }
}

async function handlePrevious() {
  if (!currentId) { showMessage('Use Find mode to navigate records.', 'info'); return; }
  try {
    const res = await fetch(`${API_URL}/previous/${currentId}`);
    const json = await res.json();
    if (json.success) populateForm(json.data);
    else showMessage(json.message || 'First record reached.', 'info');
  } catch (e) { console.error(e); }
}

function handleExit() {
  window.location.href = '../../index.html';
}

window.onload = () => {
  applyFieldSizes();
  loadNextId();
  loadDropdown('/api/employees', 'practice-head-id', 'employee_id', 'first_name', item => `${item.first_name || ''} ${item.last_name || ''}`.trim());
};
