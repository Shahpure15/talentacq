const API_URL = '/api/grades';
let currentId = null;
let debounceTimer = null;
let mode = 'new'; 

const fieldIds = ['grade-name', 'band-min-salary', 'band-max-salary', 'currency-code', 'is-active'];

function applyFieldSizes() {
  const codeEl = document.getElementById('grade-code');
  if(codeEl) Object.assign(codeEl.style, { flex: 'none', width: '150px' });
  const currEl = document.getElementById('currency-code');
  if(currEl) Object.assign(currEl.style, { flex: 'none', width: '100px' });
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
  currentId = data.grade_id;
  setIdBadge(currentId);
  document.getElementById('grade-code').value = data.grade_code || '';
  document.getElementById('grade-name').value = data.grade_name || '';
  document.getElementById('band-min-salary').value = data.band_min_salary != null ? data.band_min_salary : '';
  document.getElementById('band-max-salary').value = data.band_max_salary != null ? data.band_max_salary : '';
  document.getElementById('currency-code').value = data.currency_code || '';
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
  if (clearCode) document.getElementById('grade-code').value = '';
  document.getElementById('grade-name').value = '';
  document.getElementById('band-min-salary').value = '';
  document.getElementById('band-max-salary').value = '';
  document.getElementById('currency-code').value = '';
  document.getElementById('is-active').value = '1';
  
  removeGreenTint(fieldIds);
  const saveBtn = document.getElementById('save-btn');
  saveBtn.textContent = 'Save';
  saveBtn.className = 'btn-save';
  hideMessage();
  resetIdBadge();
}

async function handleSave() {
  const grade_code = document.getElementById('grade-code').value.trim();
  const grade_name = document.getElementById('grade-name').value.trim();
  const band_min_salary = document.getElementById('band-min-salary').value.trim();
  const band_max_salary = document.getElementById('band-max-salary').value.trim();
  const currency_code = document.getElementById('currency-code').value.trim();
  const is_active = document.getElementById('is-active').value;

  if (!grade_code || !grade_name) {
    showMessage('Grade Code and Grade Name are required.', 'error');
    return;
  }

  const payload = { grade_code, grade_name, band_min_salary, band_max_salary, currency_code, is_active };

  try {
    let res, json;
    if (currentId) {
      res = await fetch(`${API_URL}/${currentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      json = await res.json();
      if (json.success) showMessage('Grade updated.', 'success');
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
        showMessage('Grade saved.', 'success');
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
    if (json.success) {
      populateForm(json.data);
    } else {
      showMessage(json.message || 'Last record reached.', 'info');
    }
  } catch (e) { console.error(e); }
}

async function handlePrevious() {
  if (!currentId) { showMessage('Use Find mode to navigate records.', 'info'); return; }
  try {
    const res = await fetch(`${API_URL}/previous/${currentId}`);
    const json = await res.json();
    if (json.success) {
      populateForm(json.data);
    } else {
      showMessage(json.message || 'First record reached.', 'info');
    }
  } catch (e) { console.error(e); }
}

function handleExit() {
  window.location.href = '../../index.html';
}

window.onload = () => {
  applyFieldSizes();
  loadNextId();
};