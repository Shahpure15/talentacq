const API_URL = '/api/applications';
let currentId = null;
let debounceTimer = null;
let mode = 'new';
const fieldIds = ['candidate-id', 'srf-id', 'application-date', 'current-stage', 'status', 'resume-parsed-score', 'recruiter-comments'];

function applyFieldSizes() {
  const c = document.getElementById('application-code'); if(c) c.style.flex = 'none'; if(c) c.style.width = '200px';
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
  currentId = data.application_id;
  setIdBadge(currentId);
  document.getElementById('application-code').value = data.application_code || '';
  document.getElementById('candidate-id').value = data.candidate_id || '';
  document.getElementById('srf-id').value = data.srf_id || '';
  document.getElementById('application-date').value = data.application_date || '';
  document.getElementById('current-stage').value = data.current_stage || '';
  document.getElementById('status').value = data.status || 'Applied';
  document.getElementById('resume-parsed-score').value = data.resume_parsed_score != null ? data.resume_parsed_score : '';
  document.getElementById('recruiter-comments').value = data.recruiter_comments || '';
  if (mode === 'find') {
    addGreenTint(fieldIds);
    document.getElementById('save-btn').textContent = 'Update';
    document.getElementById('save-btn').className = 'btn-save btn-update';
  }
}

function resetForm(clearCode) {
  currentId = null;
  if (clearCode) document.getElementById('application-code').value = '';
  document.getElementById('candidate-id').value = '';
  document.getElementById('srf-id').value = '';
  document.getElementById('application-date').value = '';
  document.getElementById('current-stage').value = '';
  document.getElementById('status').value = 'Applied';
  document.getElementById('resume-parsed-score').value = '';
  document.getElementById('recruiter-comments').value = '';
  removeGreenTint(fieldIds);
  document.getElementById('save-btn').textContent = 'Save';
  document.getElementById('save-btn').className = 'btn-save';
  hideMessage();
  resetIdBadge();
}

async function handleSave() {
  const payload = {
    application_code: document.getElementById('application-code').value.trim(),
    candidate_id: document.getElementById('candidate-id').value,
    srf_id: document.getElementById('srf-id').value,
    application_date: document.getElementById('application-date').value,
    current_stage: document.getElementById('current-stage').value.trim(),
    status: document.getElementById('status').value,
    resume_parsed_score: document.getElementById('resume-parsed-score').value,
    recruiter_comments: document.getElementById('recruiter-comments').value.trim()
  };
  if (!payload.application_code || !payload.candidate_id) return showMessage('App Code and Candidate required.', 'error');
  try {
    const res = await fetch(currentId ? `${API_URL}/${currentId}` : API_URL, {
      method: currentId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      if (!currentId) { resetForm(true); if (mode === 'new') loadNextId(); showMessage('Application saved.', 'success'); }
      else showMessage('Application updated.', 'success');
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
  loadDropdown('/api/candidates', 'candidate-id', 'candidate_id', 'first_name', item => `${item.candidate_code} - ${item.first_name} ${item.last_name || ''}`);
  loadDropdown('/api/srfs', 'srf-id', 'srf_id', 'srf_number');
};
