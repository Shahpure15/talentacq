const API_URL = '/api/interviews';
let currentId = null;

function populateForm(data) {
  currentId = data.interview_id;
  setIdBadge(currentId);
  document.getElementById('application-id').value = data.application_id || '';
  document.getElementById('round-id').value = data.round_id || '';
  document.getElementById('interviewer-employee-id').value = data.interviewer_employee_id || '';
  document.getElementById('interview-date').value = data.interview_date || '';
  document.getElementById('status').value = data.status || 'Scheduled';
  document.getElementById('score').value = data.score != null ? data.score : '';
  document.getElementById('feedback').value = data.feedback || '';
  
  document.getElementById('save-btn').textContent = 'Update';
  document.getElementById('save-btn').className = 'btn-save btn-update';
}

function resetForm() {
  currentId = null;
  document.getElementById('application-id').value = '';
  document.getElementById('round-id').value = '';
  document.getElementById('interviewer-employee-id').value = '';
  document.getElementById('interview-date').value = '';
  document.getElementById('status').value = 'Scheduled';
  document.getElementById('score').value = '';
  document.getElementById('feedback').value = '';
  document.getElementById('save-btn').textContent = 'Save';
  document.getElementById('save-btn').className = 'btn-save';
  hideMessage();
  setIdBadge('New Entry');
}

async function handleSave() {
  const payload = {
    application_id: document.getElementById('application-id').value,
    round_id: document.getElementById('round-id').value,
    interviewer_employee_id: document.getElementById('interviewer-employee-id').value,
    interview_date: document.getElementById('interview-date').value,
    status: document.getElementById('status').value,
    score: document.getElementById('score').value,
    feedback: document.getElementById('feedback').value.trim()
  };
  if (!payload.application_id || !payload.round_id) return showMessage('Application and Round required.', 'error');
  try {
    const res = await fetch(currentId ? `${API_URL}/${currentId}` : API_URL, {
      method: currentId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      if (!currentId) { resetForm(); showMessage('Interview saved.', 'success'); }
      else showMessage('Interview updated.', 'success');
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
        const idx = json.data.findIndex(d => d.interview_id === currentId);
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
        const idx = json.data.findIndex(d => d.interview_id === currentId);
        if (idx > 0) populateForm(json.data[idx - 1]);
        else showMessage('First record.', 'info');
      }
    } else showMessage('No records found.', 'info');
  } catch (e) {}
}

function handleExit() { window.location.href = '../../index.html'; }

window.onload = () => {
  resetForm();
  loadDropdown('/api/applications', 'application-id', 'application_id', 'application_code');
  loadDropdown('/api/interview-rounds', 'round-id', 'round_id', 'round_name');
  loadDropdown('/api/employees', 'interviewer-employee-id', 'employee_id', 'first_name', item => `${item.first_name || ''} ${item.last_name || ''}`.trim());
};
