const API_URL = '/api/srfs';
let currentId = null;
let debounceTimer = null;
let mode = 'new';
let allDemands = [];
const fieldIds = ['demand-id', 'role-id', 'vacancies', 'min-experience-years', 'max-experience-years', 'required-skills', 'target-date', 'status'];

function applyFieldSizes() {
  const c = document.getElementById('srf-number'); if(c) c.style.flex = 'none'; if(c) c.style.width = '200px';
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
  currentId = data.srf_id;
  setIdBadge(currentId);
  document.getElementById('srf-number').value = data.srf_number || '';
  document.getElementById('demand-id').value = data.demand_id || '';
  document.getElementById('role-id').value = data.role_id || '';
  document.getElementById('vacancies').value = data.vacancies || '';
  document.getElementById('min-experience-years').value = data.min_experience_years != null ? data.min_experience_years : '';
  document.getElementById('max-experience-years').value = data.max_experience_years != null ? data.max_experience_years : '';
  document.getElementById('required-skills').value = data.required_skills || '';
  document.getElementById('target-date').value = data.target_date || '';
  document.getElementById('status').value = data.status || 'Open';
  if (mode === 'find') {
    addGreenTint(fieldIds);
    document.getElementById('save-btn').textContent = 'Update';
    document.getElementById('save-btn').className = 'btn-save btn-update';
  }
}

function resetForm(clearCode) {
  currentId = null;
  if (clearCode) document.getElementById('srf-number').value = '';
  document.getElementById('demand-id').value = '';
  document.getElementById('role-id').value = '';
  document.getElementById('vacancies').value = '';
  document.getElementById('min-experience-years').value = '';
  document.getElementById('max-experience-years').value = '';
  document.getElementById('required-skills').value = '';
  document.getElementById('target-date').value = '';
  document.getElementById('status').value = 'Open';
  removeGreenTint(fieldIds);
  document.getElementById('save-btn').textContent = 'Save';
  document.getElementById('save-btn').className = 'btn-save';
  hideMessage();
  resetIdBadge();
}

async function handleSave() {
  const payload = {
    srf_number: document.getElementById('srf-number').value.trim(),
    demand_id: document.getElementById('demand-id').value,
    role_id: document.getElementById('role-id').value,
    vacancies: document.getElementById('vacancies').value,
    min_experience_years: document.getElementById('min-experience-years').value,
    max_experience_years: document.getElementById('max-experience-years').value,
    required_skills: document.getElementById('required-skills').value.trim(),
    target_date: document.getElementById('target-date').value,
    status: document.getElementById('status').value
  };
  if (!payload.srf_number) return showMessage('SRF Number required.', 'error');
  try {
    const res = await fetch(currentId ? `${API_URL}/${currentId}` : API_URL, {
      method: currentId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      if (!currentId) { resetForm(true); if (mode === 'new') loadNextId(); showMessage('SRF saved.', 'success'); }
      else showMessage('SRF updated.', 'success');
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

// Demand Lookup Logic
async function openDemandLookup() {
  document.getElementById('demand-lookup-modal').style.display = 'block';
  document.getElementById('demand-lookup-search').value = '';
  try {
    const res = await fetch('/api/demands');
    const json = await res.json();
    if (json.success) {
      allDemands = json.data;
      renderDemandLookup(allDemands);
    }
  } catch (e) { console.error(e); }
}

function closeDemandLookup() {
  document.getElementById('demand-lookup-modal').style.display = 'none';
}

function renderDemandLookup(data) {
  const tbody = document.getElementById('demand-lookup-body');
  tbody.innerHTML = '';
  data.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${d.demand_code}</td><td>${d.demand_date||''}</td><td>${d.position_count||''}</td><td>${d.status||''}</td>`;
    tr.onclick = () => {
      document.getElementById('demand-id').value = d.demand_id; // Set the dropdown
      closeDemandLookup();
    };
    tbody.appendChild(tr);
  });
}

function filterDemandLookup() {
  const term = document.getElementById('demand-lookup-search').value.toLowerCase();
  const filtered = allDemands.filter(d => d.demand_code.toLowerCase().includes(term));
  renderDemandLookup(filtered);
}

function handleExit() { window.location.href = '../../index.html'; }

window.onload = () => {
  applyFieldSizes(); loadNextId();
  loadDropdown('/api/demands', 'demand-id', 'demand_id', 'demand_code');
  loadDropdown('/api/roles', 'role-id', 'role_id', 'role_title');
};
