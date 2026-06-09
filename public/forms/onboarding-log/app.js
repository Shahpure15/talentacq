const API_URL = '/api/onboarding-logs';
let currentId = null;

function populateForm(data) {
  currentId = data.log_id;
  setIdBadge(currentId);
  document.getElementById('onboarding-id').value = data.onboarding_id || '';
  document.getElementById('activity-id').value = data.activity_id || '';
  document.getElementById('assigned-to-employee-id').value = data.assigned_to_employee_id || '';
  document.getElementById('status').value = data.status || 'Pending';
  document.getElementById('completion-date').value = data.completion_date || '';
  document.getElementById('remarks').value = data.remarks || '';
  
  document.getElementById('save-btn').textContent = 'Update';
  document.getElementById('save-btn').className = 'btn-save btn-update';
}

function resetForm() {
  currentId = null;
  document.getElementById('onboarding-id').value = '';
  document.getElementById('activity-id').value = '';
  document.getElementById('assigned-to-employee-id').value = '';
  document.getElementById('status').value = 'Pending';
  document.getElementById('completion-date').value = '';
  document.getElementById('remarks').value = '';
  document.getElementById('save-btn').textContent = 'Save';
  document.getElementById('save-btn').className = 'btn-save';
  hideMessage();
  setIdBadge('New Entry');
}

async function handleSave() {
  const payload = {
    onboarding_id: document.getElementById('onboarding-id').value,
    activity_id: document.getElementById('activity-id').value,
    assigned_to_employee_id: document.getElementById('assigned-to-employee-id').value,
    status: document.getElementById('status').value,
    completion_date: document.getElementById('completion-date').value,
    remarks: document.getElementById('remarks').value.trim()
  };
  if (!payload.onboarding_id || !payload.activity_id) return showMessage('Onboarding and Activity required.', 'error');
  try {
    const res = await fetch(currentId ? `${API_URL}/${currentId}` : API_URL, {
      method: currentId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      if (!currentId) { resetForm(); showMessage('Log saved.', 'success'); }
      else showMessage('Log updated.', 'success');
    } else showMessage(json.message || 'Error saving.', 'error');
  } catch (e) { showMessage('Server error.', 'error'); }
}

async function handleNext() {
  try {
    const res = await fetch(`${API_URL}`);
    const json = await res.json();
    if (json.success && json.data.length > 0) {
      if (!currentId) populateForm(json.data[0]);
      else {
        const idx = json.data.findIndex(d => d.log_id === currentId);
        if (idx < json.data.length - 1) populateForm(json.data[idx + 1]);
        else { resetForm(); showMessage('Ready for new entry.', 'info'); }
      }
    } else showMessage('No records found.', 'info');
  } catch (e) {}
}

async function handlePrevious() {
  try {
    const res = await fetch(`${API_URL}`);
    const json = await res.json();
    if (json.success && json.data.length > 0) {
      if (!currentId) populateForm(json.data[json.data.length - 1]);
      else {
        const idx = json.data.findIndex(d => d.log_id === currentId);
        if (idx > 0) populateForm(json.data[idx - 1]);
        else showMessage('First record.', 'info');
      }
    } else showMessage('No records found.', 'info');
  } catch (e) {}
}

function handleExit() { window.location.href = '../../index.html'; }

window.onload = () => {
  resetForm();
  loadDropdown('/api/onboardings', 'onboarding-id', 'onboarding_id', 'onboarding_id', item => `Onboarding ID: ${item.onboarding_id}`);
  loadDropdown('/api/onboarding-activities', 'activity-id', 'activity_id', 'activity_name');
  loadDropdown('/api/employees', 'assigned-to-employee-id', 'employee_id', 'first_name', item => `${item.first_name || ''} ${item.last_name || ''}`.trim());
};
