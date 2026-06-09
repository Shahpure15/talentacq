// Message display
function showMessage(text, type) {
  const msg = document.getElementById('message');
  if (!msg) return;
  msg.textContent = text;
  msg.className   = `message ${type}`;
  clearTimeout(msg._timer);
  msg._timer = setTimeout(() => hideMessage(), 4000);
}

function hideMessage() {
  const msg = document.getElementById('message');
  if (!msg) return;
  msg.className   = 'message message-placeholder';
  msg.textContent = '';
}

// ID Badge
function setIdBadge(val) { 
  const el = document.getElementById('display-id');
  if(el) el.textContent = val; 
}

function resetIdBadge()  { 
  const el = document.getElementById('display-id');
  if(el) el.textContent = '--'; 
}

// Green tint helpers
function addGreenTint(ids) { 
  ids.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.add('fetched');
  }); 
}

function removeGreenTint(ids) { 
  ids.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.remove('fetched');
  }); 
}

// Generic dropdown loader
async function loadDropdown(apiUrl, selectId, valueField, labelField, labelFn) {
  try {
    const res  = await fetch(apiUrl);
    const json = await res.json();
    const sel  = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select --</option>';
    if (json.data) {
      json.data.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item[valueField];
        opt.text  = labelFn ? labelFn(item) : item[labelField];
        sel.appendChild(opt);
      });
    }
  } catch (e) { 
    console.error('Dropdown load failed:', selectId, e); 
  }
}
