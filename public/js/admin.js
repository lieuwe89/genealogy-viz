'use strict';

let allPersons = [], allRels = [];

async function checkSession() {
  const r = await fetch('/admin/session');
  const data = await r.json();
  if (!data.isAdmin) {
    document.getElementById('login-overlay').style.display = 'flex';
  } else {
    document.getElementById('login-overlay').style.display = 'none';
    loadPersons();
  }
}

async function doLogin() {
  const password = document.getElementById('login-password').value;
  const r = await fetch('/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (r.ok) {
    document.getElementById('login-overlay').style.display = 'none';
    loadPersons();
  } else {
    document.getElementById('login-error').textContent = 'Wrong password.';
  }
}

async function doLogout() {
  await fetch('/admin/logout', { method: 'POST' });
  location.reload();
}

function showTab(name) {
  ['persons', 'relationships', 'import'].forEach(t => {
    document.getElementById(`tab-${t}`).style.display = t === name ? '' : 'none';
  });
  document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));
  event.target.classList.add('active');
  if (name === 'relationships') loadRels();
}

async function loadPersons() {
  const r = await fetch('/api/graph');
  const data = await r.json();
  allPersons = data.nodes;
  renderPersonsTable(allPersons);
}

function renderPersonsTable(persons) {
  const tbody = document.getElementById('persons-tbody');
  tbody.innerHTML = persons.map(p => `
    <tr>
      <td>${escHtml(p.name)}</td>
      <td>${escHtml(String(p.birthYear || ''))}</td>
      <td>${escHtml(String(p.deathYear || ''))}</td>
      <td>${escHtml((p.roles || []).slice(0,2).join(', '))}</td>
      <td><button class="btn btn-secondary edit-person-btn" data-id="${escHtml(p.id)}">Edit</button></td>
    </tr>
  `).join('');
}

function filterPersons(query) {
  const q = query.toLowerCase();
  renderPersonsTable(allPersons.filter(p => p.name.toLowerCase().includes(q)));
}

async function showPersonForm(id) {
  const modal = document.getElementById('person-modal');
  modal.style.display = 'flex';
  document.getElementById('pm-delete').style.display = id ? '' : 'none';
  document.getElementById('person-modal-title').textContent = id ? 'Edit person' : 'Add person';

  if (id) {
    const r = await fetch(`/api/persons/${encodeURIComponent(id)}`);
    const p = await r.json();
    document.getElementById('pm-id').value = p.id;
    ['given_name','surname','name_prefix','name_suffix','birth_date','birth_place','death_date','death_place','notes'].forEach(f => {
      const el = document.getElementById(`pm-${f}`);
      if (el) el.value = p[f] || '';
    });
    document.getElementById('pm-sex').value = p.sex || 'U';
  } else {
    document.getElementById('pm-id').value = '';
    ['given_name','surname','name_prefix','name_suffix','birth_date','birth_place','death_date','death_place','notes'].forEach(f => {
      const el = document.getElementById(`pm-${f}`);
      if (el) el.value = '';
    });
  }
}

function closePersonModal() {
  document.getElementById('person-modal').style.display = 'none';
}

async function savePersonForm() {
  const id = document.getElementById('pm-id').value;
  const fields = ['given_name','surname','name_prefix','name_suffix','sex','birth_date','birth_place','death_date','death_place','notes'];
  const body = {};
  fields.forEach(f => { body[f] = document.getElementById(`pm-${f}`)?.value || ''; });

  if (id) {
    await fetch(`/api/persons/${encodeURIComponent(id)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  } else {
    body.id = 'P' + Date.now();
    await fetch('/api/persons', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  }
  closePersonModal();
  loadPersons();
}

async function deletePerson() {
  const id = document.getElementById('pm-id').value;
  if (!confirm(`Delete ${id}? This cannot be undone.`)) return;
  await fetch(`/api/persons/${encodeURIComponent(id)}`, { method: 'DELETE' });
  closePersonModal();
  loadPersons();
}

async function loadRels() {
  const r = await fetch('/api/relationships');
  allRels = await r.json();
  const nameMap = {};
  allPersons.forEach(p => { nameMap[p.id] = p.name; });
  const tbody = document.getElementById('rels-tbody');
  tbody.innerHTML = allRels.map(r => `
    <tr>
      <td>${escHtml(nameMap[r.person_a_id] || r.person_a_id)}</td>
      <td>${escHtml(nameMap[r.person_b_id] || r.person_b_id)}</td>
      <td>${escHtml(r.type)}</td>
      <td><button class="btn btn-danger delete-rel-btn" data-id="${r.id}">Delete</button></td>
    </tr>
  `).join('');
}

async function showRelForm() {
  const personAId = prompt('Person A ID:');
  if (!personAId) return;
  const personBId = prompt('Person B ID:');
  if (!personBId) return;
  const type = prompt('Type (parent-child / spouse / adopted / custom):', 'custom');
  if (!type) return;
  await fetch('/api/relationships', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ person_a_id: personAId, person_b_id: personBId, type }),
  });
  loadRels();
}

async function deleteRel(id) {
  if (!confirm('Delete this relationship?')) return;
  await fetch(`/api/relationships/${id}`, { method: 'DELETE' });
  loadRels();
}

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('import-file');
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const ext = fileInput.value.split('.').pop().toLowerCase();
      document.getElementById('mapping-group').style.display = ext === 'xml' ? '' : 'none';
    });
  }

  document.getElementById('persons-tbody')?.addEventListener('click', e => {
    const btn = e.target.closest('.edit-person-btn');
    if (btn) showPersonForm(btn.dataset.id);
  });

  document.getElementById('rels-tbody')?.addEventListener('click', e => {
    const btn = e.target.closest('.delete-rel-btn');
    if (btn) deleteRel(Number(btn.dataset.id));
  });
});

async function doImport() {
  const file = document.getElementById('import-file').files[0];
  if (!file) { alert('Please select a file.'); return; }
  const status = document.getElementById('import-status');
  status.textContent = 'Importing…';
  const fd = new FormData();
  fd.append('file', file);
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'xml') {
    fd.append('mapping', document.getElementById('import-mapping').value);
  }
  const r = await fetch('/admin/import', { method: 'POST', body: fd });
  const data = await r.json();
  if (r.ok) {
    status.style.color = '#3fb950';
    status.textContent = `✓ Imported ${data.personsImported} persons (format: ${data.format})`;
    loadPersons();
  } else {
    status.style.color = '#f85149';
    status.textContent = `Error: ${data.error}`;
  }
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

checkSession();
