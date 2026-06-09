const API_URL = '/api/onboardings';
let currentId = null;

function populateForm(data) {
  currentId = data.onboarding_id;
  setIdBadge(currentId);
  document.getElementById('candidate-id').value = data.candidate_id || '';
  document.getElementById('offer-id').value = data.offer_id || '';
  document.getElementById('start-date').value = data.start_date || '';
  document.getElementById('expected-completion-date').value = data.expected_completion_date || '';
  document.getElementById('status').value = data.status || 'In Progress';
  
  document.getElementById('save-btn').textContent = 'Update';
  document.getElementById('save-btn').className = 'btn-save btn-update';
}

function resetForm() {
  currentId = null;
  document.getElementById('candidate-id').value = '';
  document.getElementById('offer-id').value = '';
  document.getElementById('start-date').value = '';
  document.getElementById('expected-completion-date').value = '';
  document.getElementById('status').value = 'In Progress';
  document.getElementById('save-btn').textContent = 'Save';
  document.getElementById('save-btn').className = 'btn-save';
  hideMessage();
  setIdBadge('New Entry');
}

async function handleSave() {
  const payload = {
    candidate_id: document.getElementById('candidate-id').value,
    offer_id: document.getElementById('offer-id').value,
    start_date: document.getElementById('start-date').value,
    expected_completion_date: document.getElementById('expected-completion-date').value,
    status: document.getElementById('status').value
  };
  if (!payload.candidate_id) return showMessage('Candidate required.', 'error');
  try {
    const res = await fetch(currentId ? `${API_URL}/${currentId}` : API_URL, {
      method: currentId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      if (!currentId) { resetForm(); showMessage('Onboarding saved.', 'success'); }
      else showMessage('Onboarding updated.', 'success');
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
        const idx = json.data.findIndex(d => d.onboarding_id === currentId);
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
        const idx = json.data.findIndex(d => d.onboarding_id === currentId);
        if (idx > 0) populateForm(json.data[idx - 1]);
        else showMessage('First record.', 'info');
      }
    } else showMessage('No records found.', 'info');
  } catch (e) {}
}

function handleExit() { window.location.href = '../../index.html'; }

window.onload = () => {
  resetForm();
  loadDropdown('/api/candidates', 'candidate-id', 'candidate_id', 'first_name', item => `${item.candidate_code} - ${item.first_name} ${item.last_name || ''}`);
  loadDropdown('/api/offers', 'offer-id', 'offer_id', 'offer_id', item => `Offer ID: ${item.offer_id}`);
};
