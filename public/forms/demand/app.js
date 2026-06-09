const API_URL = '/api/demands';
let currentId = null;
let debounceTimer = null;
let mode = 'new';
let allDemands = [];
const fieldIds = ['demand-date', 'practice-id', 'demand-type-id', 'grade-id', 'position-count', 'target-date', 'status'];

function applyFieldSizes() {
  const c = document.getElementById('demand-code'); if(c) c.style.flex = 'none'; if(c) c.parentElement.style.width = '200px';
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
  currentId = data.demand_id;
  setIdBadge(currentId);
  document.getElementById('demand-code').value = data.demand_code || '';
  document.getElementById('demand-date').value = data.demand_date || '';
  document.getElementById('practice-id').value = data.practice_id || '';
  document.getElementById('demand-type-id').value = data.demand_type_id || '';
  document.getElementById('grade-id').value = data.grade_id || '';
  document.getElementById('position-count').value = data.position_count || '';
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
  if (clearCode) document.getElementById('demand-code').value = '';
  document.getElementById('demand-date').value = '';
  document.getElementById('practice-id').value = '';
  document.getElementById('demand-type-id').value = '';
  document.getElementById('grade-id').value = '';
  document.getElementById('position-count').value = '';
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
    demand_code: document.getElementById('demand-code').value.trim(),
    demand_date: document.getElementById('demand-date').value,
    practice_id: document.getElementById('practice-id').value,
    demand_type_id: document.getElementById('demand-type-id').value,
    grade_id: document.getElementById('grade-id').value,
    position_count: document.getElementById('position-count').value,
    target_date: document.getElementById('target-date').value,
    status: document.getElementById('status').value
  };
  if (!payload.demand_code) return showMessage('Demand Code required.', 'error');
  try {
    const res = await fetch(currentId ? `${API_URL}/${currentId}` : API_URL, {
      method: currentId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      if (!currentId) { resetForm(true); if (mode === 'new') loadNextId(); showMessage('Demand saved.', 'success'); }
      else showMessage('Demand updated.', 'success');
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

// Lookup Logic
async function openLookup() {
  document.getElementById('lookup-modal').style.display = 'block';
  document.getElementById('lookup-search').value = '';
  try {
    const res = await fetch(API_URL);
    const json = await res.json();
    if (json.success) {
      allDemands = json.data;
      renderLookup(allDemands);
    }
  } catch (e) { console.error('Lookup fetch error:', e); }
}

function closeLookup() {
  document.getElementById('lookup-modal').style.display = 'none';
}

function renderLookup(data) {
  const tbody = document.getElementById('lookup-body');
  tbody.innerHTML = '';
  data.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${d.demand_code}</td><td>${d.demand_date||''}</td><td>${d.position_count||''}</td><td>${d.status||''}</td>`;
    tr.onclick = () => {
      document.getElementById('demand-code').value = d.demand_code;
      closeLookup();
      if (mode === 'find') fetchByCode(d.demand_code);
    };
    tbody.appendChild(tr);
  });
}

function filterLookup() {
  const term = document.getElementById('lookup-search').value.toLowerCase();
  const filtered = allDemands.filter(d => d.demand_code.toLowerCase().includes(term));
  renderLookup(filtered);
}

function handleExit() { window.location.href = '../../index.html'; }

window.onload = () => {
  applyFieldSizes(); loadNextId();
  loadDropdown('/api/practices', 'practice-id', 'practice_id', 'practice_name');
  loadDropdown('/api/demand-types', 'demand-type-id', 'demand_type_id', 'type_name');
  loadDropdown('/api/grades', 'grade-id', 'grade_id', 'grade_name');
};
