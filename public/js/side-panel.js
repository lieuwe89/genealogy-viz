'use strict';

let currentPersonId = null;
let currentData = null;
let editMode = false;
let secondPersonId = null;
let secondPersonData = null;

async function openPanel(personId) {
  // Reset two-person mode on direct graph click
  secondPersonId = null;
  secondPersonData = null;
  currentPersonId = personId;
  editMode = false;
  const res = await fetch(`api/persons/${encodeURIComponent(personId)}`);
  if (!res.ok) return;
  currentData = await res.json();
  renderPanel(currentData);
  document.getElementById('side-panel').classList.add('open');
  // Trigger overlap colours in 3D graph
  if (window.applyOverlapColors) window.applyOverlapColors(personId);
}

function closePanel() {
  document.getElementById('side-panel').classList.remove('open');
  currentPersonId = null;
  currentData = null;
  secondPersonId = null;
  secondPersonData = null;
  editMode = false;
  if (window.clearOverlapColors) window.clearOverlapColors();
}

async function openCompare(personId) {
  if (!currentPersonId || personId === currentPersonId) return;
  secondPersonId = personId;
  const res = await fetch(`api/persons/${encodeURIComponent(personId)}`);
  if (!res.ok) return;
  secondPersonData = await res.json();
  renderTwoPersonMode();
}

function backToSingle() {
  secondPersonId = null;
  secondPersonData = null;
  renderPanel(currentData);
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

  html += '<div class="panel-section">' +
    '<div class="panel-label">' + escHtml(i18n.t('panel_vitals')) + '</div>' +
    '<div>' + (data.sex === 'M' ? escHtml(i18n.t('panel_sex_male')) : data.sex === 'F' ? escHtml(i18n.t('panel_sex_female')) : escHtml(i18n.t('panel_sex_unknown'))) + '</div>';
  if (data.birth_date) html += `<div>b. ${escHtml(data.birth_date)}${data.birth_place ? ' · ' + escHtml(data.birth_place) : ''}</div>`;
  if (data.death_date) html += `<div>d. ${escHtml(data.death_date)}${data.death_place ? ' · ' + escHtml(data.death_place) : ''}</div>`;
  html += '</div>';

  if (data.roles.length) {
    html += '<div class="panel-section"><div class="panel-label">' + escHtml(i18n.t('panel_roles')) + '</div>';
    html += data.roles.map(r => `<span class="role-badge">${escHtml(r.label)}</span>`).join('');
    html += '</div>';
  }

  if (data.relationships.length) {
    html += '<div class="panel-section"><div class="panel-label">' + escHtml(i18n.t('panel_connections')) + '</div>';
    html += data.relationships.map(r => {
      const otherId = r.person_a_id === data.id ? r.person_b_id : r.person_a_id;
      const otherName = [r.name_prefix, r.given_name, r.surname].filter(Boolean).join(' ');
      return `<a class="connection-link" data-id="${escHtml(otherId)}">${escHtml(otherName)} <span style="color:#6e7681;font-size:11px">(${escHtml(r.type)})</span></a>` +
        `<button class="btn btn-secondary" style="font-size:10px;padding:2px 8px;margin-bottom:4px" onclick="openCompare('${escHtml(otherId)}')">${escHtml(i18n.t('timeline_button'))}</button>`;
    }).join('');
    html += '</div>';
  }

  if (data.notes) {
    html += '<div class="panel-section"><div class="panel-label">' + escHtml(i18n.t('panel_notes')) + '</div><div style="font-size:12px;color:#8b949e">' + escHtml(data.notes) + '</div></div>';
  }

  html += '<div class="panel-section"><div class="panel-label">' + escHtml(i18n.t('panel_annotations')) + '</div>';
  if (data.annotations.length === 0) {
    html += '<div style="color:#6e7681;font-size:12px">' + escHtml(i18n.t('panel_no_annotations')) + '</div>';
  } else {
    html += data.annotations.map(a => `
      <div class="annotation-item">
        ${a.content ? `<div>${escHtml(a.content)}</div>` : ''}
        ${a.url ? `<a href="${isSafeUrl(a.url) ? escHtml(a.url) : '#'}" target="_blank" rel="noopener">${escHtml(a.url_label || a.url)}</a>` : ''}
        ${a.image_path ? `<img src="${escHtml(a.image_path)}" class="annotation-img" alt="${escHtml(a.image_caption || '')}">` : ''}
        ${a.image_path && a.image_caption ? `<div class="annotation-img-caption">${escHtml(a.image_caption)}</div>` : ''}
      </div>
    `).join('');
  }
  html += '</div>';

  // Compare button — clicking it puts the graph in compare-selection mode
  html += '<div style="padding:0 16px 12px">' +
    '<button class="btn btn-secondary" id="btn-compare-select" onclick="startCompareSelect()" style="width:100%">' +
    escHtml(i18n.t('compare_select_prompt')) + '</button>' +
    '</div>';

  if (window.__isAdmin) {
    html += '<div style="padding:0 16px 12px">' +
      '<button class="btn btn-secondary" onclick="enterEditMode()" style="width:100%">' + escHtml(i18n.t('panel_edit')) + '</button>' +
      '</div>';
  }

  body.innerHTML = html;
}

function renderTwoPersonMode() {
  const panel = document.getElementById('side-panel');
  panel.classList.add('open');

  // Header shows both names
  const nameA = [currentData.name_prefix, currentData.given_name, currentData.surname].filter(Boolean).join(' ');
  const nameB = [secondPersonData.name_prefix, secondPersonData.given_name, secondPersonData.surname].filter(Boolean).join(' ');
  document.getElementById('panel-name').textContent = `${nameA} & ${nameB}`;
  document.getElementById('panel-role-header').innerHTML = '';

  const body = document.getElementById('panel-body');
  document.getElementById('panel-edit-actions').style.display = 'none';

  // Find shortest path
  if (!window.graphData || !window.OverlapLogic) {
    body.innerHTML = '<div class="panel-section" style="color:#6e7681">' + escHtml(i18n.t('timeline_no_graph')) + '</div>';
    return;
  }
  const path = OverlapLogic.shortestPath(window.graphData, currentPersonId, secondPersonId);
  if (path.length === 0) {
    body.innerHTML = '<div class="panel-section" style="color:#6e7681">' + escHtml(i18n.t('timeline_no_connection')) + '</div>';
    return;
  }

  // Collect path nodes with lifespans
  const pathNodes = path.map(id => window.graphData.nodes.find(n => String(n.id) === String(id))).filter(Boolean);
  const lifespans = pathNodes.map(n => OverlapLogic.estimateLifespan(n, window.graphData));

  // Determine axis range
  const allYears = lifespans.flatMap(l => [l.birthYear, l.deathYear]).filter(Boolean);
  if (allYears.length === 0) {
    body.innerHTML = '<div class="panel-section" style="color:#6e7681">' + escHtml(i18n.t('timeline_no_years')) + '</div>';
    return;
  }
  const axisMin = Math.min(...allYears) - 5;
  const axisMax = Math.max(...allYears) + 5;
  const axisSpan = axisMax - axisMin || 1;

  // Build HTML
  let html = '<div class="panel-section"><div class="panel-label">' + escHtml(i18n.t('timeline_heading').replace('{n}', path.length)) + '</div>';

  // Axis labels: show ~4 ticks
  const tickStep = Math.ceil(axisSpan / 4 / 50) * 50 || 50;
  html += '<div class="timeline-axis">';
  for (let y = Math.ceil(axisMin / tickStep) * tickStep; y <= axisMax; y += tickStep) {
    const pct = ((y - axisMin) / axisSpan * 100).toFixed(1);
    html += `<span class="timeline-axis-label" style="left:${pct}%">${y}</span>`;
  }
  html += '</div>';

  // One bar per path node
  pathNodes.forEach((node, i) => {
    const ls = lifespans[i];
    const isFocal = String(node.id) === String(currentPersonId) || String(node.id) === String(secondPersonId);
    const shortName = [node.givenName, node.surname].filter(Boolean).join(' ') || node.name || '?';

    html += '<div class="timeline-bar-row">';
    html += `<div class="timeline-bar-name" title="${escHtml(node.name || '')}">${escHtml(shortName)}</div>`;
    html += '<div class="timeline-bar-track">';

    if (ls.birthYear) {
      const left = ((ls.birthYear - axisMin) / axisSpan * 100).toFixed(1);
      const width = (((ls.deathYear || ls.birthYear + 70) - ls.birthYear) / axisSpan * 100).toFixed(1);
      const cls = ['timeline-bar-fill', ls.estimated ? 'estimated' : '', isFocal ? 'focal' : ''].filter(Boolean).join(' ');
      html += `<div class="${cls}" style="left:${left}%;width:${width}%"></div>`;
    }
    html += '</div>';
    if (ls.estimated) html += '<span class="timeline-estimated-label">' + escHtml(i18n.t('timeline_estimated')) + '</span>';
    html += '</div>';
  });

  html += '</div>'; // panel-section

  // Relationship label section (per D-10, D-11, D-13)
  html += '<div class="panel-section">';
  html += '<div class="panel-label">' + escHtml(i18n.t('rel_section_heading')) + '</div>';
  if (window.RelPath) {
    var relResult = RelPath.classifyRelationship(path, window.graphData);
    var relLabel = RelPath.formatRelLabel(relResult, i18n.t);
    html += '<p style="font-size:14px;color:#c9d1d9">' +
      '<span style="color:#6e7681">' + escHtml(i18n.t('rel_prefix')) + ' </span>' +
      escHtml(relLabel) + '</p>';
  } else {
    html += '<p style="font-size:14px;color:#6e7681">' + escHtml(i18n.t('rel_error')) + '</p>';
  }
  html += '</div>';

  // Back button
  html += '<div style="padding:12px 16px">' +
    '<button class="btn btn-secondary" onclick="backToSingle()" style="width:100%">' +
    escHtml(i18n.t('back_to_single').replace('{name}', [currentData.given_name, currentData.surname].filter(Boolean).join(' '))) +
    '</button>' +
    '</div>';

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
    html += '</div>';
  }
  html += '</div>';

  if (data.annotations.length) {
    html += `<div class="panel-section"><div class="panel-label">Afbeeldingen bij annotaties</div>`;
    html += data.annotations.map(a => {
      let block = `<div class="annotation-item" style="margin-bottom:8px">`;
      block += `<div style="font-size:11px;color:#8b949e;margin-bottom:6px">${escHtml(a.content || a.url || '(annotatie #' + a.id + ')')}</div>`;
      if (a.image_path) {
        block += `<img src="${escHtml(a.image_path)}" class="annotation-img" alt="${escHtml(a.image_caption || '')}">`;
        if (a.image_caption) block += `<div class="annotation-img-caption">${escHtml(a.image_caption)}</div>`;
        block += `<button class="btn btn-danger" style="font-size:11px;padding:3px 10px;margin-top:6px" onclick="deleteAnnotationImage(${a.id})">Verwijder afbeelding</button>`;
      } else {
        block += `<div class="edit-field"><label>Afbeelding</label><input type="file" id="img-file-${a.id}" accept="image/*"></div>`;
        block += `<div class="edit-field"><label>Bijschrift</label><input id="img-caption-${a.id}" placeholder="Optioneel bijschrift"></div>`;
        block += `<button class="btn btn-secondary" style="font-size:11px;padding:3px 10px" onclick="uploadAnnotationImage(${a.id})">+ Afbeelding toevoegen</button>`;
      }
      block += `</div>`;
      return block;
    }).join('');
    html += `</div>`;
  }

  html += `<div class="panel-section">
    <div class="panel-label">Add annotation</div>
    <div class="edit-field"><label>Text</label><input id="new-ann-content"></div>
    <div class="edit-field"><label>URL (optional)</label><input id="new-ann-url" type="url"></div>
    <div class="edit-field"><label>Link label</label><input id="new-ann-label"></div>
    <button class="btn btn-secondary" onclick="addAnnotation()" style="width:100%">+ Add annotation</button>
  </div>`;

  html += `<div class="panel-section">
    <button class="btn btn-danger" onclick="deletePerson()" style="width:100%">Persoon verwijderen</button>
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

async function uploadAnnotationImage(annotationId) {
  const fileInput = document.getElementById(`img-file-${annotationId}`);
  const caption = document.getElementById(`img-caption-${annotationId}`).value;
  if (!fileInput || !fileInput.files[0]) return;
  const formData = new FormData();
  formData.append('image', fileInput.files[0]);
  formData.append('caption', caption);
  const res = await fetch(`api/annotations/${encodeURIComponent(annotationId)}/image`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert('Upload mislukt: ' + (err.error || res.status));
    return;
  }
  await openPanel(currentPersonId);
}

async function deleteAnnotationImage(annotationId) {
  const res = await fetch(`api/annotations/${encodeURIComponent(annotationId)}/image`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert('Verwijderen mislukt: ' + (err.error || res.status));
    return;
  }
  await openPanel(currentPersonId);
}

async function deletePerson() {
  const name = [currentData.given_name, currentData.surname].filter(Boolean).join(' ') || '(unknown)';
  if (!confirm(`Weet je zeker dat je "${name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
  const res = await fetch(`api/persons/${encodeURIComponent(currentPersonId)}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert('Verwijderen mislukt: ' + (err.error || res.status));
    return;
  }
  closePanel();
  if (window.graphData) {
    window.graphData.nodes = window.graphData.nodes.filter(n => String(n.id) !== String(currentPersonId));
    window.graphData.links = window.graphData.links.filter(l =>
      String(l.source?.id ?? l.source) !== String(currentPersonId) &&
      String(l.target?.id ?? l.target) !== String(currentPersonId)
    );
    if (window.graph) window.graph.graphData(window.graphData);
  }
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

// Re-render panel on language change
window.addEventListener('langchange', function() {
  if (secondPersonId && secondPersonData) {
    renderTwoPersonMode();
  } else if (currentData) {
    renderPanel(currentData);
  }
});

function startCompareSelect() {
  window.isSelectingCompare = true;
  const btn = document.getElementById('btn-compare-select');
  if (btn) {
    btn.textContent = i18n.t('compare_select_cancel');
    btn.onclick = cancelCompareSelect;
  }
}

function cancelCompareSelect() {
  window.isSelectingCompare = false;
  const btn = document.getElementById('btn-compare-select');
  if (btn) {
    btn.textContent = i18n.t('compare_select_prompt');
    btn.onclick = startCompareSelect;
  }
}

window.openPanel = openPanel;
window.closePanel = closePanel;
window.openCompare = openCompare;
window.backToSingle = backToSingle;
window.enterEditMode = enterEditMode;
window.saveEdit = saveEdit;
window.cancelEdit = cancelEdit;
window.addAnnotation = addAnnotation;
window.startCompareSelect = startCompareSelect;
window.cancelCompareSelect = cancelCompareSelect;
window.uploadAnnotationImage = uploadAnnotationImage;
window.deleteAnnotationImage = deleteAnnotationImage;
window.deletePerson = deletePerson;
