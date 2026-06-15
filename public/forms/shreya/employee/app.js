const API_URL = '/api/employees';
let currentId = null;
let debounceTimer = null;
let mode = 'new';
const fieldIds = ['employee-type', 'first-name', 'last-name', 'email', 'role-id', 'practice-id', 'grade-id', 'is-active'];

function applyFieldSizes() {
  const c = document.getElementById('employee-code'); if(c) c.style.flex = 'none'; if(c) c.style.width = '150px';
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
  currentId = data.employee_id;
  setIdBadge(currentId);
  document.getElementById('employee-code').value = data.employee_code || '';
  document.getElementById('employee-type').value = data.employee_type || '';
  document.getElementById('first-name').value = data.first_name || '';
  document.getElementById('last-name').value = data.last_name || '';
  document.getElementById('email').value = data.email || '';
  document.getElementById('role-id').value = data.role_id || '';
  document.getElementById('practice-id').value = data.practice_id || '';
  document.getElementById('grade-id').value = data.grade_id || '';
  document.getElementById('is-active').value = data.is_active != null ? data.is_active : '1';
  if (mode === 'find') {
    addGreenTint(fieldIds);
    document.getElementById('save-btn').textContent = 'Update';
    document.getElementById('save-btn').className = 'btn-save btn-update';
  }
}

function resetForm(clearCode) {
  currentId = null;
  if (clearCode) document.getElementById('employee-code').value = '';
  document.getElementById('employee-type').value = '';
  document.getElementById('first-name').value = '';
  document.getElementById('last-name').value = '';
  document.getElementById('email').value = '';
  document.getElementById('role-id').value = '';
  document.getElementById('practice-id').value = '';
  document.getElementById('grade-id').value = '';
  document.getElementById('is-active').value = '1';
  removeGreenTint(fieldIds);
  document.getElementById('save-btn').textContent = 'Save';
  document.getElementById('save-btn').className = 'btn-save';
  hideMessage();
  resetIdBadge();
}

async function handleSave() {
  const payload = {
    employee_code: document.getElementById('employee-code').value.trim(),
    employee_type: document.getElementById('employee-type').value.trim(),
    first_name: document.getElementById('first-name').value.trim(),
    last_name: document.getElementById('last-name').value.trim(),
    email: document.getElementById('email').value.trim(),
    role_id: document.getElementById('role-id').value,
    practice_id: document.getElementById('practice-id').value,
    grade_id: document.getElementById('grade-id').value,
    is_active: document.getElementById('is-active').value
  };
  if (!payload.employee_code || !payload.first_name) return showMessage('Code and First Name required.', 'error');
  try {
    const res = await fetch(currentId ? `${API_URL}/${currentId}` : API_URL, {
      method: currentId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      if (!currentId) { resetForm(true); if (mode === 'new') loadNextId(); showMessage('Employee saved.', 'success'); }
      else showMessage('Employee updated.', 'success');
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
  loadDropdown('/api/roles', 'role-id', 'role_id', 'role_title');
  loadDropdown('/api/practices', 'practice-id', 'practice_id', 'practice_name');
  loadDropdown('/api/grades', 'grade-id', 'grade_id', 'grade_name');
};
