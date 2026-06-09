const API_URL = '/api/candidates';
let currentId = null;
let debounceTimer = null;
let mode = 'new';
const fieldIds = ['first-name', 'last-name', 'email', 'phone', 'resume-url', 'current-employer', 'current-ctc', 'expected-ctc', 'notice-period-days', 'source-type', 'status'];

function applyFieldSizes() {
  const c = document.getElementById('candidate-code'); if(c) c.style.flex = 'none'; if(c) c.style.width = '200px';
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
  currentId = data.candidate_id;
  setIdBadge(currentId);
  document.getElementById('candidate-code').value = data.candidate_code || '';
  document.getElementById('first-name').value = data.first_name || '';
  document.getElementById('last-name').value = data.last_name || '';
  document.getElementById('email').value = data.email || '';
  document.getElementById('phone').value = data.phone || '';
  document.getElementById('resume-url').value = data.resume_url || '';
  document.getElementById('current-employer').value = data.current_employer || '';
  document.getElementById('current-ctc').value = data.current_ctc || '';
  document.getElementById('expected-ctc').value = data.expected_ctc || '';
  document.getElementById('notice-period-days').value = data.notice_period_days || '';
  document.getElementById('source-type').value = data.source_type || '';
  document.getElementById('status').value = data.status || 'Active';
  if (mode === 'find') {
    addGreenTint(fieldIds);
    document.getElementById('save-btn').textContent = 'Update';
    document.getElementById('save-btn').className = 'btn-save btn-update';
  }
}

function resetForm(clearCode) {
  currentId = null;
  if (clearCode) document.getElementById('candidate-code').value = '';
  document.getElementById('first-name').value = '';
  document.getElementById('last-name').value = '';
  document.getElementById('email').value = '';
  document.getElementById('phone').value = '';
  document.getElementById('resume-url').value = '';
  document.getElementById('current-employer').value = '';
  document.getElementById('current-ctc').value = '';
  document.getElementById('expected-ctc').value = '';
  document.getElementById('notice-period-days').value = '';
  document.getElementById('source-type').value = '';
  document.getElementById('status').value = 'Active';
  removeGreenTint(fieldIds);
  document.getElementById('save-btn').textContent = 'Save';
  document.getElementById('save-btn').className = 'btn-save';
  hideMessage();
  resetIdBadge();
}

async function handleSave() {
  const payload = {
    candidate_code: document.getElementById('candidate-code').value.trim(),
    first_name: document.getElementById('first-name').value.trim(),
    last_name: document.getElementById('last-name').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    resume_url: document.getElementById('resume-url').value.trim(),
    current_employer: document.getElementById('current-employer').value.trim(),
    current_ctc: document.getElementById('current-ctc').value,
    expected_ctc: document.getElementById('expected-ctc').value,
    notice_period_days: document.getElementById('notice-period-days').value,
    source_type: document.getElementById('source-type').value.trim(),
    status: document.getElementById('status').value
  };
  if (!payload.candidate_code || !payload.first_name) return showMessage('Code and First Name required.', 'error');
  try {
    const res = await fetch(currentId ? `${API_URL}/${currentId}` : API_URL, {
      method: currentId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      if (!currentId) { resetForm(true); if (mode === 'new') loadNextId(); showMessage('Candidate saved.', 'success'); }
      else showMessage('Candidate updated.', 'success');
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
