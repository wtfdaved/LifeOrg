# LifeOrg

A private desktop life planner. It works offline, stores everything encrypted on your computer, and never sends anything over the network.

- **Calendar**: month, week, day and agenda views. Click or drag across a day or time range to add an event or a to-do. Drag items to reschedule them, and drag the edge of a timed item to change its length.
- **To-dos**: Today, Upcoming, Someday, All and Completed views, plus your own lists, priorities and notes. A to-do with a due date shows on the calendar, and you can tick it off there. To schedule an unscheduled to-do, drag it from the calendar sidebar onto a day or time slot.
- **Mood**: a daily check-in for mood, energy, tags and a journal entry. It also shows a month heat-map, 7- and 30-day averages, your check-in streak, and your average mood for each tag.
- **Whiteboard**: Notion-style pages with nested sub-pages and search. Type `/` for headings, checklists, toggles, tables, quotes, code and images.
- **Today**: one dashboard with today's to-dos, events, mood and recently edited pages.

## Privacy & encryption

- All data lives in one vault file, `vault.lifeorg`, in the app's data folder. The exact path is shown in Settings.
- The vault is encrypted with **AES-256-GCM**. The key comes from your master password through **scrypt** (N=2¹⁷, r=8, p=1) and is kept only in memory while the vault is unlocked.
- Images pasted into pages are embedded in the encrypted vault.
- The app blocks every network request and denies all browser permissions (camera, location and so on).
- It locks automatically after a period of inactivity (configurable) and when you close it.
- **There is no password recovery.** If you forget the master password, the data cannot be recovered. Use *Settings → Export encrypted backup* to keep copies.

## Development

Requires Node.js 22+.

```bash
npm install
npm run dev        # run with hot reload
npm test           # vault encryption tests
npm run typecheck
npm run dist       # build an installer for your OS into dist/
```

## Built on

| Project | Used for | License |
| --- | --- | --- |
| [Electron](https://github.com/electron/electron) + [electron-vite](https://github.com/alex8088/electron-vite) | Desktop shell and build | MIT |
| [FullCalendar](https://github.com/fullcalendar/fullcalendar) | Calendar views, drag & drop | MIT |
| [BlockNote](https://github.com/TypeCellOS/BlockNote) | Notion-style block editor | MPL-2.0 |
| [React](https://github.com/facebook/react) | UI | MIT |

[AFFiNE](https://github.com/toeverything/AFFiNE) and [AppFlowy](https://github.com/AppFlowy-IO/AppFlowy) were also considered. Both are full workspace suites with sync servers and no built-in vault encryption, so LifeOrg uses their kind of building blocks instead of forking either one.
