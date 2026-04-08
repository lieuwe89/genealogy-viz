'use strict';

let currentPersonId = null;
let currentData = null;
let editMode = false;

async function openPanel(personId) {
  currentPersonId = personId;
  editMode = false;
  const res = await fetch(`api/persons/${encodeURIComponent(personId)}`);
  if (!res.ok) return;
  currentData = await res.json();
  renderPanel(currentData);
  document.getElementById('side-panel').classList.add('open');
}

function closePanel() {
  document.getElementById('side-panel').classList.remove('open');
  currentPersonId = null;
  currentData = null;
  editMode = false;
}

function renderPanel(data) {
  const fullName = [data.name_prefix, data.given_name, data.surname, data.name_suffix]
    .filter(Boolean).join(' ');
  document.getElementById('panel-name').textContent = fullName || '(unknown)';

  const roleHeader = document.getElementById('panel-role-header');
  roleHeader.innerHTML = data.roles.length
    ? `<span class="role-badge">${escHtml(data.roles[0].label)}</span>`
    : '';

  const body = document.getElementById('panel-body');

  if (editMode && window.__isAdmin) {
    renderEditMode(body, data);
    document.getElementById('panel-edit-actions').style.display = 'flex';
    return;
  }
  document.getElementById('panel-edit-actions').style.display = 'none';

  let html = '';

  html += `<div class="panel-section">
    <div class="panel-label">Vitals</div>
    <div>${data.sex === 'M' ? 'Male' : data.sex === 'F' ? 'Female' : 'Unknown'}</div>`;
  if (data.birth_date) html += `<div>b. ${escHtml(data.birth_date)}${data.birth_place ? ' · ' + escHtml(data.birth_place) : ''}</div>`;
  if (data.death_date) html += `<div>d. ${escHtml(data.death_date)}${data.death_place ? ' · ' + escHtml(data.death_place) : ''}</div>`;
  html += `</div>`;

  if (data.roles.length) {
    html += `<div class="panel-section"><div class="panel-label">Roles</div>`;
    html += data.roles.map(r => `<span class="role-badge">${escHtml(r.label)}</span>`).join('');
    html += `</div>`;
  }

  if (data.relationships.length) {
    html += `<div class="panel-section"><div class="panel-label">Connections</div>`;
    html += data.relationships.map(r => {
      const otherId = r.person_a_id === data.id ? r.person_b_id : r.person_a_id;
      const otherName = [r.name_prefix, r.given_name, r.surname].filter(Boolean).join(' ');
      return `<a class="connection-link" data-id="${escHtml(otherId)}">${escHtml(otherName)} <span style="color:#6e7681;font-size:11px">(${escHtml(r.type)})</span></a>`;
    }).join('');
    html += `</div>`;
  }

  if (data.notes) {
    html += `<div class="panel-section"><div class="panel-label">Notes</div><div style="font-size:12px;color:#8b949e">${escHtml(data.notes)}</div></div>`;
  }

  html += `<div class="panel-section"><div class="panel-label">Annotations & Links</div>`;
  if (data.annotations.length === 0) {
    html += `<div style="color:#6e7681;font-size:12px">No annotations yet.</div>`;
  } else {
    html += data.annotations.map(a => `
      <div class="annotation-item">
        ${a.content ? `<div>${escHtml(a.content)}</div>` : ''}
        ${a.url ? `<a href="${isSafeUrl(a.url) ? escHtml(a.url) : '#'}" target="_blank" rel="noopener">${escHtml(a.url_label || a.url)}</a>` : ''}
      </div>
    `).join('');
  }
  html += `</div>`;

  if (window.__isAdmin) {
    html += `<div style="padding:12px 16px">
      <button class="btn btn-secondary" onclick="enterEditMode()" style="width:100%">Edit this person</button>
    </div>`;
  }

  body.innerHTML = html;
}

function renderEditMode(body, data) {
  const fields = [
    { key: 'given_name', label: 'Given name' },
    { key: 'name_prefix', label: 'Prefix (van, de…)' },
    { key: 'surname', label: 'Surname' },
    { key: 'name_suffix', label: 'Suffix (jr., sr…)' },
    { key: 'sex', label: 'Sex', type: 'select', options: [['M','Male'],['F','Female'],['U','Unknown']] },
    { key: 'birth_date', label: 'Birth date' },
    { key: 'birth_place', label: 'Birth place' },
    { key: 'death_date', label: 'Death date' },
    { key: 'death_place', label: 'Death place' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  let html = '<div class="panel-section">';
  for (const f of fields) {
    html += `<div class="edit-field"><label>${f.label}</label>`;
    if (f.type === 'select') {
      html += `<select id="ef-${f.key}">` +
        f.options.map(([v, l]) => `<option value="${v}"${data[f.key] === v ? ' selected' : ''}>${l}</option>`).join('') +
        `</select>`;
    } else if (f.type === 'textarea') {
      html += `<textarea id="ef-${f.key}" rows="3">${escHtml(data[f.key] || '')}</textarea>`;
    } else {
      html += `<input id="ef-${f.key}" value="${escHtml(data[f.key] || '')}">`;
    }
    html += `</div>`;
  }
  html += `</div>`;

  html += `<div class="panel-section">
    <div class="panel-label">Add annotation</div>
    <div class="edit-field"><label>Text</label><input id="new-ann-content"></div>
    <div class="edit-field"><label>URL (optional)</label><input id="new-ann-url" type="url"></div>
    <div class="edit-field"><label>Link label</label><input id="new-ann-label"></div>
    <button class="btn btn-secondary" onclick="addAnnotation()" style="width:100%">+ Add annotation</button>
  </div>`;

  body.innerHTML = html;
}

async function saveEdit() {
  const fields = ['given_name','name_prefix','surname','name_suffix','sex','birth_date','birth_place','death_date','death_place','notes'];
  const updates = {};
  for (const f of fields) {
    const el = document.getElementById(`ef-${f}`);
    if (el) updates[f] = el.value;
  }
  await fetch(`api/persons/${encodeURIComponent(currentPersonId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  editMode = false;
  await openPanel(currentPersonId);
}

function cancelEdit() {
  editMode = false;
  renderPanel(currentData);
}

function enterEditMode() {
  editMode = true;
  renderPanel(currentData);
  document.getElementById('panel-edit-actions').style.display = 'flex';
}

async function addAnnotation() {
  const content = document.getElementById('new-ann-content').value;
  const url = document.getElementById('new-ann-url').value;
  const url_label = document.getElementById('new-ann-label').value;
  await fetch('api/annotations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ person_id: currentPersonId, content, url, url_label }),
  });
  await openPanel(currentPersonId);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function isSafeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch { return false; }
}

document.getElementById('side-panel').addEventListener('click', e => {
  const link = e.target.closest('.connection-link');
  if (link) {
    const id = link.dataset.id;
    flyToNode(id);
    openPanel(id);
  }
});

window.openPanel = openPanel;
window.closePanel = closePanel;
window.enterEditMode = enterEditMode;
window.saveEdit = saveEdit;
window.cancelEdit = cancelEdit;
window.addAnnotation = addAnnotation;
