const API_URL = 'http://localhost:3000/api/demands';

let currentId = null;
let debounceTimer = null;
let lookupLoadPromise = null;

function ensureLookupsLoaded() {
  if (!lookupLoadPromise) lookupLoadPromise = loadLookups();
  return lookupLoadPromise;
}

async function loadLookups() {
  try {
    const response = await fetch(`${API_URL}/lookups`);
    const json = await response.json();
    if (!json.success) {
      showMessage('Could not load dropdowns. Try refreshing.', 'error');
      return;
    }
    populateSelect('raised-by-employee-id', json.data.employees, '-- Select Employee --');
    populateSelect('practice-id',           json.data.practices, '-- Select Practice --');
    populateSelect('role-id',               json.data.roles,     '-- Select Role --');
    populateSelect('ta-reviewer-id',        json.data.employees, '-- Select Reviewer --');

    await loadDemandTypes();
  } catch (error) {
    showMessage('Could not load dropdowns. Try refreshing.', 'error');
    console.error(error);
  }
}

async function loadDemandTypes() {
  try {
    const response = await fetch(`${API_URL}/demand-types`);
    const json = await response.json();
    if (!json.success) return;

    const select = document.getElementById('demand-type');
    json.data.forEach(row => {
      const exists = Array.from(select.options).some(
        o => o.value.toLowerCase() === row.TYPE_VALUE.toLowerCase()
      );
      if (!exists) {
        const opt = document.createElement('option');
        opt.value = row.TYPE_VALUE;
        opt.textContent = row.TYPE_LABEL;
        select.appendChild(opt);
      }
    });
  } catch (error) {
    console.error('Could not load demand types:', error);
  }
}

/* ── Inline + button — reads from #new-demand-type-input ── */
async function addDemandType() {
  const input = document.getElementById('new-demand-type-input');
  const trimmed = input.value.trim();

  if (!trimmed) {
    showMessage('Type a name in the box next to the dropdown.', 'error');
    return;
  }

  const value = trimmed.replace(/\s+/g, '');

  const select = document.getElementById('demand-type');
  const exists = Array.from(select.options).some(
    o => o.value.toLowerCase() === value.toLowerCase()
  );
  if (exists) {
    showMessage(`"${trimmed}" already exists.`, 'error');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/demand-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type_value: value, type_label: trimmed })
    });
    const json = await response.json();

    if (json.success) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = trimmed;
      select.appendChild(opt);
      select.value = value;
      input.value = '';
      showMessage(`"${trimmed}" added.`, 'success');
    } else {
      showMessage('Could not save. Try again.', 'error');
    }
  } catch (error) {
    showMessage('Server unreachable. Check your connection.', 'error');
    console.error(error);
  }
}

function populateSelect(selectId, options, placeholderText) {
  const select = document.getElementById(selectId);
  const currentValue = select.value;
  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = placeholderText;
  select.appendChild(placeholder);
  options.forEach(option => {
    const item = document.createElement('option');
    item.value = String(option.VALUE);
    item.textContent = option.LABEL;
    select.appendChild(item);
  });
  if (currentValue) select.value = currentValue;
}

document.addEventListener('DOMContentLoaded', () => {
  ensureLookupsLoaded();
});

function handleCodeInput(value) {
  clearTimeout(debounceTimer);
  const code = value.trim();
  if (code.length === 0) { resetForm(false); return; }
  debounceTimer = setTimeout(() => fetchByCode(code), 500);
}

async function fetchByCode(code) {
  try {
    await ensureLookupsLoaded();
    const response = await fetch(`${API_URL}/code/${encodeURIComponent(code)}`);
    const json = await response.json();

    if (response.status === 404) {
      currentId = null;
      clearFields();
      removeGreenTint();
      setSaveMode();
      resetIdBadge();
      showMessage('New code — fill in the details and save.', 'info');
      return;
    }

    if (json.success) {
      currentId = json.data.demand_id;
      document.getElementById('demand-type').value            = json.data.demand_type;
      document.getElementById('raised-by-employee-id').value  = json.data.raised_by_employee_id ?? '';
      document.getElementById('practice-id').value            = json.data.practice_id ?? '';
      document.getElementById('role-id').value                = json.data.role_id ?? '';
      document.getElementById('number-of-positions').value    = json.data.number_of_positions ?? '';
      document.getElementById('priority').value               = json.data.priority;
      document.getElementById('demand-status').value          = json.data.demand_status;
      document.getElementById('demand-date').value            = json.data.demand_date ?? '';
      document.getElementById('ta-reviewer-id').value         = json.data.ta_reviewer_id ?? '';
      document.getElementById('remarks').value                = json.data.remarks ?? '';
      setIdBadge(json.data.demand_id);
      addGreenTint();
      setUpdateMode();
      showMessage('Record loaded.', 'success');
    }
  } catch (error) {
    showMessage('Server unreachable. Check your connection.', 'error');
    console.error(error);
  }
}

async function handleSave() {
  const demand_code           = document.getElementById('demand-code').value.trim();
  const demand_type           = document.getElementById('demand-type').value;
  const raised_by_employee_id = document.getElementById('raised-by-employee-id').value.trim();
  const practice_id           = document.getElementById('practice-id').value.trim();
  const role_id               = document.getElementById('role-id').value.trim();
  const number_of_positions   = document.getElementById('number-of-positions').value.trim();
  const priority              = document.getElementById('priority').value;
  const demand_status         = document.getElementById('demand-status').value;
  const demand_date           = document.getElementById('demand-date').value;
  const ta_reviewer_id        = document.getElementById('ta-reviewer-id').value.trim();
  const remarks               = document.getElementById('remarks').value.trim();

  if (!demand_code)           { showMessage('Demand Code is required.',      'error'); return; }
  if (!demand_type)           { showMessage('Demand Type is required.',      'error'); return; }
  if (!raised_by_employee_id) { showMessage('Raised By is required.',        'error'); return; }
  if (!practice_id)           { showMessage('Practice is required.',         'error'); return; }
  if (!role_id)               { showMessage('Role is required.',             'error'); return; }
  if (!number_of_positions)   { showMessage('No. of Positions is required.', 'error'); return; }
  if (!priority)              { showMessage('Priority is required.',         'error'); return; }
  if (!demand_status)         { showMessage('Status is required.',           'error'); return; }
  if (!demand_date)           { showMessage('Demand Date is required.',      'error'); return; }
  if (!ta_reviewer_id)        { showMessage('TA Reviewer is required.',      'error'); return; }

  const payload = {
    demand_code, demand_type, raised_by_employee_id,
    practice_id, role_id, number_of_positions,
    priority, demand_status, demand_date, ta_reviewer_id, remarks
  };

  if (currentId) {
    await updateRecord(payload);
  } else {
    await insertRecord(payload);
  }
}

async function insertRecord(payload) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    if (json.success) {
      resetForm(true);
      showMessage('Demand saved.', 'success');
    } else {
      if (json.message && json.message.includes('unique')) {
        showMessage('This Demand Code already exists.', 'error');
      } else {
        showMessage('Save failed. Please try again.', 'error');
      }
    }
  } catch (error) {
    showMessage('Server unreachable. Check your connection.', 'error');
  }
}

async function updateRecord(payload) {
  try {
    const response = await fetch(`${API_URL}/${currentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    if (json.success) {
      showMessage('Changes saved.', 'success');
    } else {
      showMessage('Update failed. Please try again.', 'error');
    }
  } catch (error) {
    showMessage('Server unreachable. Check your connection.', 'error');
  }
}

async function handleNext() {
  if (currentId === null) {
    showMessage('Load a record first, then use Next.', 'error');
    return;
  }
  try {
    await ensureLookupsLoaded();
    const response = await fetch(`${API_URL}/next/${currentId}`);
    const json = await response.json();

    if (response.status === 404) {
      showMessage('No more records.', 'info');
      return;
    }

    if (json.success) {
      currentId = json.data.demand_id;
      document.getElementById('demand-code').value            = json.data.demand_code;
      document.getElementById('demand-type').value            = json.data.demand_type;
      document.getElementById('raised-by-employee-id').value  = json.data.raised_by_employee_id ?? '';
      document.getElementById('practice-id').value            = json.data.practice_id ?? '';
      document.getElementById('role-id').value                = json.data.role_id ?? '';
      document.getElementById('number-of-positions').value    = json.data.number_of_positions ?? '';
      document.getElementById('priority').value               = json.data.priority;
      document.getElementById('demand-status').value          = json.data.demand_status;
      document.getElementById('demand-date').value            = json.data.demand_date ?? '';
      document.getElementById('ta-reviewer-id').value         = json.data.ta_reviewer_id ?? '';
      document.getElementById('remarks').value                = json.data.remarks ?? '';
      setIdBadge(json.data.demand_id);
      addGreenTint();
      setUpdateMode();
      showMessage('Next record.', 'info');
    }
  } catch (error) {
    showMessage('Server unreachable. Check your connection.', 'error');
  }
}

function handleExit() {
  resetForm(true);
  showMessage('Form cleared.', 'info');
}

function setSaveMode() {
  const btn = document.getElementById('save-btn');
  btn.textContent = 'Save';
  btn.classList.remove('update-mode');
}

function setUpdateMode() {
  const btn = document.getElementById('save-btn');
  btn.textContent = 'Update';
  btn.classList.add('update-mode');
}

function clearFields() {
  ['demand-type','raised-by-employee-id','practice-id','role-id',
   'number-of-positions','priority','demand-status','demand-date',
   'ta-reviewer-id','remarks'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

function resetForm(clearCode) {
  currentId = null;
  if (clearCode) document.getElementById('demand-code').value = '';
  clearFields();
  removeGreenTint();
  setSaveMode();
  resetIdBadge();
  hideMessage();
}

function setIdBadge(id)  { document.getElementById('display-id').textContent = id; }
function resetIdBadge()  { document.getElementById('display-id').textContent = '--'; }

const FIELD_IDS = [
  'demand-type','raised-by-employee-id','practice-id','role-id',
  'number-of-positions','priority','demand-status','demand-date',
  'ta-reviewer-id','remarks'
];

function addGreenTint()    { FIELD_IDS.forEach(id => document.getElementById(id).classList.add('fetched')); }
function removeGreenTint() { FIELD_IDS.forEach(id => document.getElementById(id).classList.remove('fetched')); }

function showMessage(text, type) {
  const msg = document.getElementById('message');
  msg.textContent = text;
  msg.className = `message ${type}`;
  clearTimeout(msg._timer);
  msg._timer = setTimeout(hideMessage, 4000);
}

function hideMessage() {
  const msg = document.getElementById('message');
  msg.className = 'message message-placeholder';
  msg.textContent = '';
}