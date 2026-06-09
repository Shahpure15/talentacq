const API_URL = '/api/offers';
let currentId = null;

function populateForm(data) {
  currentId = data.offer_id;
  setIdBadge(currentId);
  document.getElementById('application-id').value = data.application_id || '';
  document.getElementById('offer-date').value = data.offer_date || '';
  document.getElementById('offered-ctc').value = data.offered_ctc || '';
  document.getElementById('joining-date').value = data.joining_date || '';
  document.getElementById('status').value = data.status || 'Pending';
  document.getElementById('valid-till').value = data.valid_till || '';
  
  document.getElementById('save-btn').textContent = 'Update';
  document.getElementById('save-btn').className = 'btn-save btn-update';
}

function resetForm() {
  currentId = null;
  document.getElementById('application-id').value = '';
  document.getElementById('offer-date').value = '';
  document.getElementById('offered-ctc').value = '';
  document.getElementById('joining-date').value = '';
  document.getElementById('status').value = 'Pending';
  document.getElementById('valid-till').value = '';
  document.getElementById('save-btn').textContent = 'Save';
  document.getElementById('save-btn').className = 'btn-save';
  hideMessage();
  setIdBadge('New Entry');
}

async function handleSave() {
  const payload = {
    application_id: document.getElementById('application-id').value,
    offer_date: document.getElementById('offer-date').value,
    offered_ctc: document.getElementById('offered-ctc').value,
    joining_date: document.getElementById('joining-date').value,
    status: document.getElementById('status').value,
    valid_till: document.getElementById('valid-till').value
  };
  if (!payload.application_id) return showMessage('Application required.', 'error');
  try {
    const res = await fetch(currentId ? `${API_URL}/${currentId}` : API_URL, {
      method: currentId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      if (!currentId) { resetForm(); showMessage('Offer saved.', 'success'); }
      else showMessage('Offer updated.', 'success');
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
        const idx = json.data.findIndex(d => d.offer_id === currentId);
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
        const idx = json.data.findIndex(d => d.offer_id === currentId);
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
};
