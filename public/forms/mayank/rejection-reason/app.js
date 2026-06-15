// app.js — Rejection Reason smart form

const API_URL = 'http://localhost:3000/api/rejection-reasons';

let currentId     = null;
let debounceTimer = null;

// ─── Auto-fetch when user types Reason Code ───────────────────────────────────

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
    const json     = await response.json();

    if (response.status === 404) {
      currentId = null;
      clearFields();
      removeGreenTint();
      setSaveMode();
      resetIdBadge();
      showMessage('New reason code — fill in the details and click Save.', 'info');
      return;
    }

    if (json.success) {
      currentId = json.data.reason_id;
      document.getElementById('reason-description').value = json.data.reason_description;
      document.getElementById('applicable-stage').value   = json.data.applicable_stage;
      setIdBadge(json.data.reason_id);
      addGreenTint();
      setUpdateMode();
      showMessage('Record found. Make your changes and click Update.', 'success');
    }

  } catch (error) {
    showMessage('Could not reach the server. Please check your connection.', 'error');
    console.error(error);
  }
}

// ─── Save / Update ────────────────────────────────────────────────────────────

async function handleSave() {
  const reason_code        = document.getElementById('reason-code').value.trim();
  const reason_description = document.getElementById('reason-description').value.trim();
  const applicable_stage   = document.getElementById('applicable-stage').value;

  if (!reason_code) {
    showMessage('Reason Code is required. Please enter a value.', 'error');
    return;
  }
  if (!reason_description) {
    showMessage('Description is required. Please enter a value.', 'error');
    return;
  }
  if (!applicable_stage) {
    showMessage('Stage is required. Please select a stage.', 'error');
    return;
  }

  if (currentId) {
    await updateRecord(reason_code, reason_description, applicable_stage);
  } else {
    await insertRecord(reason_code, reason_description, applicable_stage);
  }
}

async function insertRecord(reason_code, reason_description, applicable_stage) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason_code, reason_description, applicable_stage })
    });

    const json = await response.json();

    if (json.success) {
      resetForm(true);
      showMessage('Data entered successfully. The record has been saved.', 'success');
    } else {
      if (json.message && json.message.includes('unique')) {
        showMessage('This Reason Code already exists. Please use a different code.', 'error');
      } else {
        showMessage('Something went wrong while saving. Please try again.', 'error');
      }
    }

  } catch (error) {
    showMessage('Could not reach the server. Please check your connection.', 'error');
  }
}

async function updateRecord(reason_code, reason_description, applicable_stage) {
  try {
    const response = await fetch(`${API_URL}/${currentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason_code,
        reason_description,
        applicable_stage,
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

// ─── Next ─────────────────────────────────────────────────────────────────────

async function handleNext() {
  if (currentId === null) {
    showMessage('Please load an existing record first before using Next.', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/next/${currentId}`);
    const json     = await response.json();

    if (response.status === 404) {
      showMessage('You have reached the last record in the list.', 'info');
      return;
    }

    if (json.success) {
      currentId = json.data.reason_id;
      document.getElementById('reason-code').value        = json.data.reason_code;
      document.getElementById('reason-description').value = json.data.reason_description;
      document.getElementById('applicable-stage').value   = json.data.applicable_stage;
      setIdBadge(json.data.reason_id);
      addGreenTint();
      setUpdateMode();
      showMessage('Showing next record.', 'info');
    }

  } catch (error) {
    showMessage('Could not reach the server. Please check your connection.', 'error');
  }
}

// ─── Exit ─────────────────────────────────────────────────────────────────────

function handleExit() {
  resetForm(true);
  showMessage('Form has been cleared. Ready for a new entry.', 'info');
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

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
  document.getElementById('reason-description').value = '';
  document.getElementById('applicable-stage').value   = '';
}

function resetForm(clearCode) {
  currentId = null;
  if (clearCode) {
    document.getElementById('reason-code').value = '';
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
  document.getElementById('reason-description').classList.add('fetched');
  document.getElementById('applicable-stage').classList.add('fetched');
}

function removeGreenTint() {
  document.getElementById('reason-description').classList.remove('fetched');
  document.getElementById('applicable-stage').classList.remove('fetched');
}

function showMessage(text, type) {
  const msg = document.getElementById('message');
  msg.textContent = text;
  msg.className   = `message ${type}`;

  clearTimeout(msg._timer);
  msg._timer = setTimeout(() => {
    hideMessage();
  }, 4000);
}

function hideMessage() {
  const msg = document.getElementById('message');
  msg.className   = 'message message-placeholder';
  msg.textContent = '';
}