# LifeOrg

A private planner you check into every morning: your calendar, to-dos, chores, bills, mood and notes in one place. It runs on your own computer, keeps everything encrypted, and never goes online.

---

## Install

You don't need to know how to code to install it.

### 1. Download

1. Go to the **[Releases page](https://github.com/wtfdaved/LifeOrg/releases/latest)**.
2. Under **Assets**, click the file for your computer:

| Your computer | File to download |
| --- | --- |
| **Windows 10 / 11** | `LifeOrg-…-win-x64.exe` |
| **Mac with Apple chip** (M1, M2, M3, M4, most Macs from 2021 on) | `LifeOrg-…-mac-arm64.dmg` |
| **Mac with Intel chip** (older Macs) | `LifeOrg-…-mac-x64.dmg` |
| **Linux** | `LifeOrg-…-linux-x86_64.AppImage` |

> Not sure which Mac you have? Click the  Apple menu → **About This Mac**. If it says "Chip: Apple M…", use **arm64**. If it says "Processor: Intel", use **x64**.

### 2. Install

<details open>
<summary><b>Windows</b></summary>

1. Double-click the downloaded `.exe` file.
2. Windows may show a blue box saying **"Windows protected your PC"**. This happens because the app isn't signed with a paid Microsoft certificate. Click **More info**, then **Run anyway**.
3. Click **Next → Install → Finish**.
4. Open **LifeOrg** from the desktop shortcut or the Start menu.

</details>

<details open>
<summary><b>Mac</b></summary>

1. Double-click the downloaded `.dmg` file.
2. Drag the **LifeOrg** icon into the **Applications** folder.
3. Open **Applications** and double-click **LifeOrg**. macOS will say it "can't be verified". Click **Done**. This happens because the app isn't signed with a paid Apple certificate.
4. Open  **System Settings → Privacy & Security**, scroll down, and click **Open Anyway** next to "LifeOrg was blocked". Enter your Mac password if asked.
5. From now on, LifeOrg opens normally. Drag it to your Dock so it's handy every morning.

</details>

<details>
<summary><b>Linux</b></summary>

1. Right-click the `.AppImage` → **Properties → Permissions** → tick **Allow executing file as program**. In a terminal, `chmod +x LifeOrg-*.AppImage` does the same.
2. Double-click it to run.

</details>

### 3. First launch

1. Choose a **master password**. It encrypts everything.
2. **Write it down somewhere safe.** There is no "forgot password" option: without it, nobody can open your data, including you.

### Updating

Download the newest version from the Releases page and install it over the old one. Your data is stored separately and stays in place.

---

## What's inside

| | |
| --- | --- |
| 🧭 **Morning check-in** | A guided routine of about 3 minutes: how you feel → brain dump → quick review of overdue items, bills and chores → pick your **Top 3** for the day. Before noon, the app opens straight into it. |
| ☀️ **Today** | Everything for today on one screen: Top 3, morning/evening routines, schedule, chores, bills due this week, and a 🏆 "wins today" counter. |
| 📅 **Calendar** | Month, week, day and agenda views. To-dos and bills show up on it. Drag to reschedule. |
| ✅ **To-dos** | Lists, priorities and due dates. Break a big task into **tiny steps** and tag it by **energy needed**. |
| ▶ **Focus mode** | One task, full screen, visual countdown timer (5/15/25/45 min), its next tiny step, and a gentle chime when time's up. |
| 🧹 **Chores & routines** | Repeating chores that come back on their own schedule, counted from when you last did them. Filter by **"my energy right now"** or **quick wins ≤10 min**. Morning and evening routine checklists you can customize. |
| 💵 **Bills** | Amount, due date, how often it repeats, autopay. "Mark paid" rolls it forward. Shows past-due bills, the next 2 weeks, and monthly totals by category. |
| 🌈 **Mood** | Daily mood, energy, tags and journal, with a color-coded calendar and trends. |
| 📝 **Whiteboard** | Notion-style pages: type `/` for headings, checklists, tables, toggles and images. |

### Built with ADHD in mind

- **Small next step.** Break tasks into tiny steps. Focus mode shows only the next one.
- **Brain dump first.** Empty your head before you plan.
- **Top 3, not 30.** A short list you can actually finish.
- **Match tasks to your energy.** Low-energy days still get wins.
- **No guilt.** Overdue items are framed as "catch up", and you can move or drop them in one click.
- **Visible wins.** Every finished to-do, chore and routine step counts toward today's total.

## Privacy

- Everything is stored in **one encrypted file** on your computer. Its location is shown in Settings.
- Encryption is **AES-256-GCM**. The key is derived from your master password with **scrypt** and is never saved.
- The app **blocks all internet access**. Nothing is synced or sent anywhere.
- It **locks itself** after a period of inactivity (adjustable) and when closed.
- Use **Settings → Export encrypted backup** now and then, and keep the copy on a USB drive or in cloud storage. The copy is still encrypted.

---

## For developers

Requires Node.js 22+.

```bash
npm install
npm run dev          # run with hot reload
npm test             # encryption + recurrence tests
npm run typecheck
npm run dist         # build an installer for this OS into dist/
```

**Making a release:** every push builds Windows, Mac and Linux installers in GitHub Actions (downloadable from the run's **Artifacts**). To publish them on the Releases page, either push a version tag:

```bash
git tag v0.2.0 && git push origin v0.2.0
```

or open **Actions → Build installers → Run workflow** and tick **Publish a GitHub Release**.

### Built on

| Project | Used for | License |
| --- | --- | --- |
| [Electron](https://github.com/electron/electron) + [electron-vite](https://github.com/alex8088/electron-vite) + [electron-builder](https://github.com/electron-userland/electron-builder) | Desktop app, build and installers | MIT |
| [FullCalendar](https://github.com/fullcalendar/fullcalendar) | Calendar views, drag & drop | MIT |
| [BlockNote](https://github.com/TypeCellOS/BlockNote) | Notion-style block editor | MPL-2.0 |
| [React](https://github.com/facebook/react) | UI | MIT |
