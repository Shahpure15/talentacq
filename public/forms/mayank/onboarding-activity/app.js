// app.js — Onboarding Activity smart form

const API_URL = 'http://localhost:3000/api/onboarding-activities';

let currentId = null;
let debounceTimer = null;

function handleCodeInput(value) {
  clearTimeout(debounceTimer);

  const code = value.trim();

  if (code.length === 0) {
    resetForm(false);
    return;
  }

  debounceTimer = setTimeout(() => {
    fetchByCode(code);
  }, 500);
}

async function fetchByCode(code) {
  try {
    const response = await fetch(`${API_URL}/code/${encodeURIComponent(code)}`);
    const json = await response.json();

    if (response.status === 404) {
      currentId = null;
      clearFields();
      removeGreenTint();
      setSaveMode();
      resetIdBadge();
      showMessage('New activity code — fill in the details and click Save.', 'info');
      return;
    }

    if (json.success) {
      currentId = json.data.activity_id;
      document.getElementById('activity-name').value = json.data.activity_name;
      document.getElementById('phase').value = json.data.phase;
      document.getElementById('owner-type').value = json.data.owner_type;
      document.getElementById('sla-days').value = json.data.sla_days ?? '';
      setIdBadge(json.data.activity_id);
      addGreenTint();
      setUpdateMode();
      showMessage('Record found. Make your changes and click Update.', 'success');
    }
  } catch (error) {
    showMessage('Could not reach the server. Please check your connection.', 'error');
    console.error(error);
  }
}

async function handleSave() {
  const activity_code = document.getElementById('activity-code').value.trim();
  const activity_name = document.getElementById('activity-name').value.trim();
  const phase = document.getElementById('phase').value;
  const owner_type = document.getElementById('owner-type').value;
  const sla_days = document.getElementById('sla-days').value.trim();

  if (!activity_code) {
    showMessage('Activity Code is required. Please enter a value.', 'error');
    return;
  }
  if (!activity_name) {
    showMessage('Activity Name is required. Please enter a value.', 'error');
    return;
  }
  if (!phase) {
    showMessage('Phase is required. Please select a phase.', 'error');
    return;
  }
  if (!owner_type) {
    showMessage('Owner Type is required. Please select an owner type.', 'error');
    return;
  }

  if (currentId) {
    await updateRecord(activity_code, activity_name, phase, owner_type, sla_days);
  } else {
    await insertRecord(activity_code, activity_name, phase, owner_type, sla_days);
  }
}

async function insertRecord(activity_code, activity_name, phase, owner_type, sla_days) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity_code, activity_name, phase, owner_type, sla_days })
    });

    const json = await response.json();

    if (json.success) {
      resetForm(true);
      showMessage('Data entered successfully. The record has been saved.', 'success');
    } else {
      if (json.message && json.message.includes('unique')) {
        showMessage('This Activity Code already exists. Please use a different code.', 'error');
      } else {
        showMessage('Something went wrong while saving. Please try again.', 'error');
      }
    }
  } catch (error) {
    showMessage('Could not reach the server. Please check your connection.', 'error');
  }
}

async function updateRecord(activity_code, activity_name, phase, owner_type, sla_days) {
  try {
    const response = await fetch(`${API_URL}/${currentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_code,
        activity_name,
        phase,
        owner_type,
        sla_days,
        is_active: 1
      })
    });

    const json = await response.json();

    if (json.success) {
      showMessage('Record updated successfully.', 'success');
    } else {
      showMessage('Something went wrong while updating. Please try again.', 'error');
    }
  } catch (error) {
    showMessage('Could not reach the server. Please check your connection.', 'error');
  }
}

async function handleNext() {
  if (currentId === null) {
    showMessage('Please load an existing record first before using Next.', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/next/${currentId}`);
    const json = await response.json();

    if (response.status === 404) {
      showMessage('You have reached the last record in the list.', 'info');
      return;
    }

    if (json.success) {
      currentId = json.data.activity_id;
      document.getElementById('activity-code').value = json.data.activity_code;
      document.getElementById('activity-name').value = json.data.activity_name;
      document.getElementById('phase').value = json.data.phase;
      document.getElementById('owner-type').value = json.data.owner_type;
      document.getElementById('sla-days').value = json.data.sla_days ?? '';
      setIdBadge(json.data.activity_id);
      addGreenTint();
      setUpdateMode();
      showMessage('Showing next record.', 'info');
    }
  } catch (error) {
    showMessage('Could not reach the server. Please check your connection.', 'error');
  }
}

function handleExit() {
  resetForm(true);
  showMessage('Form has been cleared. Ready for a new entry.', 'info');
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
  document.getElementById('activity-name').value = '';
  document.getElementById('phase').value = '';
  document.getElementById('owner-type').value = '';
  document.getElementById('sla-days').value = '';
}

function resetForm(clearCode) {
  currentId = null;
  if (clearCode) {
    document.getElementById('activity-code').value = '';
  }
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

function addGreenTint() {
  document.getElementById('activity-name').classList.add('fetched');
  document.getElementById('phase').classList.add('fetched');
  document.getElementById('owner-type').classList.add('fetched');
  document.getElementById('sla-days').classList.add('fetched');
}

function removeGreenTint() {
  document.getElementById('activity-name').classList.remove('fetched');
  document.getElementById('phase').classList.remove('fetched');
  document.getElementById('owner-type').classList.remove('fetched');
  document.getElementById('sla-days').classList.remove('fetched');
}

function showMessage(text, type) {
  const msg = document.getElementById('message');
  msg.textContent = text;
  msg.className = `message ${type}`;

  clearTimeout(msg._timer);
  msg._timer = setTimeout(() => {
    hideMessage();
  }, 4000);
}

function hideMessage() {
  const msg = document.getElementById('message');
  msg.className = 'message message-placeholder';
  msg.textContent = '';
}