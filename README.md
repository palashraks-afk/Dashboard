# Sol

Static web app, no build step. Files: index.html, styles.css, app.js, data.js.

## Run it
Open index.html in a browser, or push to GitHub and turn on Pages (Settings, Pages, deploy from branch, folder /root).

## Where things live
- data.js: seed data (competitions, programs, SAT dates, starter tasks). Edit this to add or change deadlines.
- Your edits (statuses, notes, tasks, schedule) are saved in the browser, and sync to your own Firebase account once connected on the Connect tab.

## Login
- No keys set: PIN lock on this device only. It does not protect data from someone with access to your browser profile.
- Firebase keys set: real email and password login and cross-device sync. Firestore rules are on the Connect tab. Not tested against a live Firebase project yet, so test sign-up and sync once and turn off new sign-ups afterward.

## Reminders
Use Connect, Download deadlines (.ics), and import into Google or Apple Calendar for phone alerts. Browser notifications work only while the tab is open.

## PIN and Touch ID
First open: type your name and the PIN you pick on the setup screen. The PIN is stored only as a hash in your browser, so it is not in the repo.
Then go to Connect, tap "Turn on Touch ID" and approve with your MacBook fingerprint. Next time the page opens, Touch ID pops up on its own, and the PIN is the backup. Needs https (GitHub Pages is) and Safari or Chrome on the Mac. Touch ID is set up per browser and per device.
This is a screen lock for the page, not real security. For real login use the Firebase steps on the Connect tab.

## Assistant
Connect tab, paste your Anthropic API key (stays in your browser only). Press Ctrl/Cmd+K or the Ask button anywhere.

## Colors
Connect tab, Colors. Six looks: Apple, Graphite, Forest, Sunset, Ocean, Paper. Saved per browser.

## Install it on your Mac, PC and phone (and it updates itself)
Put the files on GitHub Pages first (repo Settings, Pages, branch main). Then open your Pages link on each device:
- MacBook, Safari: File, Add to Dock. Chrome or Edge: install icon in the address bar.
- Windows PC, Chrome or Edge: install icon in the address bar, or menu, Apps, Install.
- iPhone, Safari: Share button, Add to Home Screen.
- Android, Chrome: menu, Install app.
Updating: upload the new files to the repo (commit to main). Every time you open the app, or come back to it, it checks the site and reloads itself with the new version. Offline it uses the last copy it saw.
Your data (tasks, statuses, notes) is saved per device. To see the same data on all three devices, turn on the Firebase sync on the Connect tab. Touch ID and the PIN are also set up per device.
