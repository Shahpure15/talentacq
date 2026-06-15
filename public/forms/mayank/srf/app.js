const API_URL = 'http://localhost:3000/api/srfs';

let currentId     = null;
let debounceTimer = null;

// ─── LOAD DROPDOWNS ON PAGE LOAD ─────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  loadDropdowns();
});

async function loadDropdowns() {
  try {
    const response = await fetch(`${API_URL}/dropdowns`);
    const json     = await response.json();

    if (!json.success) {
      showMessage('Failed to load dropdown data.', 'error');
      return;
    }

    const { demands, roles, grades, practices, employees } = json.data;

    populateSelect('demand-id',        demands,   'DEMAND_ID',   'DEMAND_CODE');
    populateSelect('role-id',          roles,     'ROLE_ID',     'ROLE_TITLE');
    populateSelect('grade-id',         grades,    'GRADE_ID',    'GRADE_NAME');
    populateSelect('practice-id',      practices, 'PRACTICE_ID', 'PRACTICE_NAME');
    populateSelect('hiring-manager-id', employees, 'EMPLOYEE_ID', 'FULL_NAME');
    populateSelect('ta-owner-id',      employees, 'EMPLOYEE_ID', 'FULL_NAME');

  } catch (error) {
    showMessage('Could not reach the server. Please check your connection.', 'error');
    console.error(error);
  }
}

function populateSelect(elementId, data, valueKey, labelKey) {
  const select = document.getElementById(elementId);

  // Pehli default option (-- Select --) chhod ke baki sab hata do
  while (select.options.length > 1) {
    select.remove(1);
  }

  data.forEach(item => {
    const option = document.createElement('option');
    option.value = item[valueKey];
    option.text  = item[labelKey];
    select.appendChild(option);
  });
}

// ─── AUTO FETCH ON CODE INPUT ─────────────────────────────────

function handleCodeInput(value) {
  clearTimeout(debounceTimer);
  const code = value.trim();
  if (code.length === 0) {
    resetForm(false);
    return;
  }
  debounceTimer = setTimeout(() => fetchByCode(code), 500);
}

let dropdownsReady;

window.addEventListener('DOMContentLoaded', () => {
  dropdownsReady = loadDropdowns();
});

// fetchByCode mein sabse upar add karo
async function fetchByCode(code) {
  await dropdownsReady; // ← dropdown ready hone ka wait karo pehle
  try {
    const response = await fetch(`${API_URL}/code/${encodeURIComponent(code)}`);
    const json     = await response.json();

    if (response.status === 404) {
      currentId = null;
      clearFields();
      removeGreenTint();
      setSaveMode();
      resetIdBadge();
      showMessage('New SRF code — fill in the details and click Save.', 'info');
      return;
    }

    if (json.success) {
      const d = json.data;
      currentId = d.SRF_ID;

      setSelectValue('demand-id',         d.DEMAND_ID);
      setSelectValue('role-id',           d.ROLE_ID);
      setSelectValue('grade-id',          d.GRADE_ID);
      setSelectValue('practice-id',       d.PRACTICE_ID);
      setSelectValue('hiring-manager-id', d.HIRING_MANAGER_ID);
      setSelectValue('ta-owner-id',       d.TA_OWNER_ID);

      document.getElementById('budget-min').value          = d.BUDGET_MIN          ?? '';
      document.getElementById('budget-max').value          = d.BUDGET_MAX          ?? '';
      document.getElementById('currency-code').value       = d.CURRENCY_CODE       ?? 'INR';
      document.getElementById('target-join-date').value    = formatDate(d.TARGET_JOIN_DATE);
      document.getElementById('number-of-positions').value = d.NUMBER_OF_POSITIONS ?? '';
      document.getElementById('key-skills').value          = d.KEY_SKILLS          ?? '';
      document.getElementById('srf-status').value          = d.SRF_STATUS          ?? '';
      document.getElementById('approval-date').value       = formatDate(d.APPROVAL_DATE);

      setIdBadge(d.SRF_ID);
      addGreenTint();
      setUpdateMode();
      showMessage('Record found. Make your changes and click Update.', 'success');
    }

  } catch (error) {
    showMessage('Could not reach the server. Please check your connection.', 'error');
    console.error(error);
  }
}

// ─── SAVE / UPDATE ────────────────────────────────────────────

async function handleSave() {
  const srf_code            = document.getElementById('srf-code').value.trim();
  const target_join_date    = document.getElementById('target-join-date').value;
  const number_of_positions = document.getElementById('number-of-positions').value;
  const srf_status          = document.getElementById('srf-status').value;

  if (!srf_code)             { showMessage('SRF Code is required.',             'error'); return; }
  if (!target_join_date)     { showMessage('Target Join Date is required.',     'error'); return; }
  if (!number_of_positions)  { showMessage('Number of Positions is required.',  'error'); return; }
  if (!srf_status)           { showMessage('SRF Status is required.',           'error'); return; }

  const payload = {
    srf_code,
    demand_id:           document.getElementById('demand-id').value          || null,
    role_id:             document.getElementById('role-id').value            || null,
    grade_id:            document.getElementById('grade-id').value           || null,
    practice_id:         document.getElementById('practice-id').value        || null,
    hiring_manager_id:   document.getElementById('hiring-manager-id').value  || null,
    ta_owner_id:         document.getElementById('ta-owner-id').value        || null,
    budget_min:          document.getElementById('budget-min').value         || null,
    budget_max:          document.getElementById('budget-max').value         || null,
    currency_code:       document.getElementById('currency-code').value,
    target_join_date,
    number_of_positions,
    key_skills:          document.getElementById('key-skills').value         || null,
    srf_status,
    approval_date:       document.getElementById('approval-date').value      || null
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
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    const json = await response.json();
    if (json.success) {
      resetForm(true);
      showMessage('SRF saved successfully.', 'success');
    } else {
      if (json.message && json.message.includes('unique')) {
        showMessage('This SRF Code already exists. Please use a different code.', 'error');
      } else {
        showMessage('Something went wrong while saving. Please try again.', 'error');
      }
    }
  } catch (error) {
    showMessage('Could not reach the server. Please check your connection.', 'error');
  }
}

async function updateRecord(payload) {
  try {
    const response = await fetch(`${API_URL}/${currentId}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    const json = await response.json();
    if (json.success) {
      showMessage('SRF updated successfully.', 'success');
    } else {
      showMessage('Something went wrong while updating. Please try again.', 'error');
    }
  } catch (error) {
    showMessage('Could not reach the server. Please check your connection.', 'error');
  }
}

// ─── NEXT ─────────────────────────────────────────────────────

async function handleNext() {
  if (currentId === null) {
    showMessage('Please load an existing record first before using Next.', 'error');
    return;
  }
  try {
    const response = await fetch(`${API_URL}/next/${currentId}`);
    const json     = await response.json();

    if (response.status === 404) {
      showMessage('You have reached the last record.', 'info');
      return;
    }

    if (json.success) {
      const d = json.data;
      currentId = d.SRF_ID;

      document.getElementById('srf-code').value            = d.SRF_CODE;
      setSelectValue('demand-id',         d.DEMAND_ID);
      setSelectValue('role-id',           d.ROLE_ID);
      setSelectValue('grade-id',          d.GRADE_ID);
      setSelectValue('practice-id',       d.PRACTICE_ID);
      setSelectValue('hiring-manager-id', d.HIRING_MANAGER_ID);
      setSelectValue('ta-owner-id',       d.TA_OWNER_ID);

      document.getElementById('budget-min').value          = d.BUDGET_MIN          ?? '';
      document.getElementById('budget-max').value          = d.BUDGET_MAX          ?? '';
      document.getElementById('currency-code').value       = d.CURRENCY_CODE       ?? 'INR';
      document.getElementById('target-join-date').value    = formatDate(d.TARGET_JOIN_DATE);
      document.getElementById('number-of-positions').value = d.NUMBER_OF_POSITIONS ?? '';
      document.getElementById('key-skills').value          = d.KEY_SKILLS          ?? '';
      document.getElementById('srf-status').value          = d.SRF_STATUS          ?? '';
      document.getElementById('approval-date').value       = formatDate(d.APPROVAL_DATE);

      setIdBadge(d.SRF_ID);
      addGreenTint();
      setUpdateMode();
      showMessage('Showing next record.', 'info');
    }
  } catch (error) {
    showMessage('Could not reach the server. Please check your connection.', 'error');
  }
}

async function handlePrev() {
  if (currentId === null) {
    showMessage('Please load an existing record first before using Previous.', 'error');
    return;
  }
  try {
    const response = await fetch(`${API_URL}/prev/${currentId}`);
    const json     = await response.json();

    if (response.status === 404) {
      showMessage('You are already at the first record.', 'info');
      return;
    }

    if (json.success) {
      const d = json.data;
      currentId = d.SRF_ID;

      document.getElementById('srf-code').value            = d.SRF_CODE;
      setSelectValue('demand-id',         d.DEMAND_ID);
      setSelectValue('role-id',           d.ROLE_ID);
      setSelectValue('grade-id',          d.GRADE_ID);
      setSelectValue('practice-id',       d.PRACTICE_ID);
      setSelectValue('hiring-manager-id', d.HIRING_MANAGER_ID);
      setSelectValue('ta-owner-id',       d.TA_OWNER_ID);

      document.getElementById('budget-min').value          = d.BUDGET_MIN          ?? '';
      document.getElementById('budget-max').value          = d.BUDGET_MAX          ?? '';
      document.getElementById('currency-code').value       = d.CURRENCY_CODE       ?? 'INR';
      document.getElementById('target-join-date').value    = formatDate(d.TARGET_JOIN_DATE);
      document.getElementById('number-of-positions').value = d.NUMBER_OF_POSITIONS ?? '';
      document.getElementById('key-skills').value          = d.KEY_SKILLS          ?? '';
      document.getElementById('srf-status').value          = d.SRF_STATUS          ?? '';
      document.getElementById('approval-date').value       = formatDate(d.APPROVAL_DATE);

      setIdBadge(d.SRF_ID);
      addGreenTint();
      setUpdateMode();
      showMessage('Showing previous record.', 'info');
    }
  } catch (error) {
    showMessage('Could not reach the server. Please check your connection.', 'error');
  }
}

// ─── EXIT ─────────────────────────────────────────────────────

function handleExit() {
  resetForm(true);
  showMessage('Form cleared. Ready for new entry.', 'info');
}

// ─── HELPERS ──────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().split('T')[0];
}

function setSelectValue(elementId, value) {
  const select = document.getElementById(elementId);
  select.value = value ?? '';
}

const GREEN_FIELDS = [
  'demand-id', 'role-id', 'grade-id', 'practice-id',
  'hiring-manager-id', 'ta-owner-id', 'budget-min', 'budget-max',
  'currency-code', 'target-join-date', 'number-of-positions',
  'key-skills', 'srf-status', 'approval-date'
];

function addGreenTint() {
  GREEN_FIELDS.forEach(id => document.getElementById(id).classList.add('fetched'));
}

function removeGreenTint() {
  GREEN_FIELDS.forEach(id => document.getElementById(id).classList.remove('fetched'));
}

function clearFields() {
  GREEN_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el.tagName === 'SELECT') el.value = '';
    else el.value = '';
  });
  document.getElementById('currency-code').value = 'INR';
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

function resetForm(clearCode) {
  currentId = null;
  if (clearCode) document.getElementById('srf-code').value = '';
  clearFields();
  removeGreenTint();
  setSaveMode();
  resetIdBadge();
  hideMessage();
}

function setIdBadge(id) {
  document.getElementById('display-id').textContent = id;
}

function resetIdBadge() {
  document.getElementById('display-id').textContent = '--';
}

function showMessage(text, type) {
  const msg = document.getElementById('message');
  msg.textContent = text;
  msg.className   = `message ${type}`;
  clearTimeout(msg._timer);
  msg._timer = setTimeout(() => hideMessage(), 4000);
}

function hideMessage() {
  const msg = document.getElementById('message');
  msg.className   = 'message message-placeholder';
  msg.textContent = '';
}

