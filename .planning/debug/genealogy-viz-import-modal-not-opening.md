---
status: awaiting_human_verify
trigger: "Clicking 'Import Data' changes URL to #import but no modal/dialog opens"
created: 2026-04-08T00:00:00Z
updated: 2026-04-08T00:01:00Z
---

## Current Focus

hypothesis: <base href="/genealogy-viz/"> in admin/index.html causes hash-only hrefs like href="#import" to resolve against the base URL, producing /genealogy-viz/#import (the visualiser URL) instead of staying on the admin page. The browser performs a full navigation. showTab() IS called and works (user confirmed back-button shows correct tab), but the navigation still happens because onclick does not call event.preventDefault().
test: confirmed by reading admin/index.html line 5 (<base href="/genealogy-viz/">) and comparing with nav links <a href="#import" onclick="showTab('import', this)">
expecting: adding event.preventDefault() in showTab, or removing href values from nav anchors, will stop the navigation
next_action: apply fix — pass event to showTab from onclick and call event.preventDefault() in the function body

## Symptoms

expected: Clicking "Import Data" button opens an import modal/dialog window
actual: URL changes to https://genealogy-viz.fly.dev/genealogy-viz/#import but no modal appears
errors: None reported (error is swallowed by browser/onclick handler)
reproduction: Visit https://genealogy-viz.fly.dev/genealogy-viz/admin, click "Import data" nav link
started: Unknown — user just noticed it

## Eliminated

- hypothesis: missing hash change event listener on app.html
  evidence: the import UI is in admin/index.html as a tab, not app.html — app.html has no import button at all
  timestamp: 2026-04-08T00:01:00Z

## Evidence

- timestamp: 2026-04-08T00:00:30Z
  checked: public/app.html
  found: No import button, no import modal, no hash routing — this page is only the 3D visualiser
  implication: the "Import Data" link is in admin/index.html, not app.html

- timestamp: 2026-04-08T00:00:45Z
  checked: public/admin/index.html nav links
  found: <a href="#import" onclick="showTab('import')">Import data</a> — href changes hash, onclick calls showTab with string only, no event passed
  implication: showTab receives name='import' but not the event object

- timestamp: 2026-04-08T00:00:50Z
  checked: public/js/admin.js showTab function
  found: function uses bare `event` identifier on line 41 (event.target.classList.add('active')) — no event parameter in signature — file has 'use strict' at top
  implication: ReferenceError thrown in strict mode when event is not defined as a local/parameter — all tabs get hidden in the forEach but the target tab never gets shown because execution aborts at event.target

## Resolution

root_cause: admin/index.html has <base href="/genealogy-viz/"> on line 5. This causes hash-only hrefs like href="#import" and href="#" to resolve against the base URL, so clicking them navigates the browser to /genealogy-viz/#import (the visualiser) instead of staying on the admin page. showTab() was actually working correctly — the tab content was set (confirmed: back button showed correct tab) — but the href navigation fired immediately after, replacing the page. event.preventDefault() was never called on the anchor click.
fix: changed nav onclick attributes to pass event as first arg to showTab (e.g. onclick="showTab(event,'import',this)"). Updated showTab signature to showTab(e, name, clickedEl) and added e.preventDefault() as first line. Also added inline event.preventDefault() on the other href="#" anchors (Export, Change password, Log out) for the same reason.
verification:
files_changed: [public/js/admin.js, public/admin/index.html]
