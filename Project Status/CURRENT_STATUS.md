# Station 13 Board Status

Last updated: 2026-04-22

## Project Location
`C:\Users\codyn\iCloudDrive\Desktop\Station13Board`

## Main Pages
- `index.html` - Riding Board
- `manage.html` - Member and Position Manager
- `staffing.html` - Staffing Hours
- `weekly.html` - Weekly Staffing
- `archived.html` - Archived Hours
- `daily-crews.html` - Daily Crews

## Shared Files
- `styles.css` - global styling
- `data-store.js` - shared member/role/color data
- `board.js` - Riding Board logic
- `manage.js` - manager logic
- `staffing.js` - staffing-hours logic
- `weekly.js` - weekly staffing logic
- `archived.js` - archived hours logic
- `daily-crews.js` - daily crews logic

## Current State
- Site uses a dark modern dashboard style with apparatus color themes.
- Riding Board includes apparatus cards, command cards, and a daily staffing calendar.
- Weekly Staffing stacks 7 future days.
- Archived Hours stacks the previous 7 days.
- Daily Crews shows hourly apparatus blocks for A/B/C/D shifts.
- Daily Crews also includes read-only mirrored staffing panels for:
  - Today
  - +1 Day

## Important Logic
- Member/position lists are managed in `manage.html`.
- Color rules are stored separately per list in `data-store.js`.
- Riding Board `Today` and Weekly Staffing `Today` mirror the same data.
- Daily Crews lower staffing panels are read-only mirrors of weekly staffing data.
- Archived Hours is currently a separate page and is not yet auto-filled by rollover logic.

## Recent Requests Completed
- Added Archived Hours page.
- Added Daily Crews page.
- Corrected shift time ranges:
  - A: `0000 - 0600`
  - B: `0600 - 1200`
  - C: `1200 - 1800`
  - D: `1800 - 0000`
- Added read-only mirrored shift calendars under each Daily Crews shift.
- Added `+1 Day` mirrored panel beside `Today` on Daily Crews.

## Likely Next Steps
- Tune Daily Crews layout/spacing based on visual review.
- Add future rollover/archive automation if desired.
- Deploy to Cloudflare Pages or another static host.

## Notes For Future Sessions
- Codex conversations do not sync across devices.
- Use this file as the quick handoff note.
- If working from another device, start by opening this folder and referencing this file.
