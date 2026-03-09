# Google Calendar & Drive Photo Integration

The server supports displaying Google Calendar events and random photos from a Google Drive folder. Both use a Google Service Account for authentication.

## Prerequisites

1. A Google Cloud project (create at https://console.cloud.google.com)
2. **Google Calendar API** enabled
3. **Google Drive API** enabled
4. A **Service Account** with a downloaded JSON key file

## Setup

### 1. Create a Service Account

1. Go to **Google Cloud Console** > **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Name it (e.g. `epaper-dashboard`)
4. Click **Create and Continue**, then **Done**
5. Click the new service account > **Keys** tab > **Add Key** > **Create new key** > **JSON**
6. Save the downloaded JSON file as `google-service-account.json`

### 2. Enable APIs

1. Go to **APIs & Services** > **Library**
2. Search and enable **Google Calendar API**
3. Search and enable **Google Drive API**

### 3. Share Resources with the Service Account

The service account email looks like: `name@project-id.iam.gserviceaccount.com`

**Calendar:**
1. Open Google Calendar settings
2. Find the calendar you want to display
3. Under **Share with specific people**, add the service account email
4. Set permission to **See all event details**
5. Copy the **Calendar ID** from the calendar's settings (under "Integrate calendar")

**Drive folder:**
1. Create or open a Google Drive folder with your photos
2. Click **Share**, add the service account email as **Viewer**
3. Copy the **Folder ID** from the URL: `https://drive.google.com/drive/folders/<FOLDER_ID>`

### 4. Deploy the Key File

Copy the JSON key file to the server:

```bash
scp google-service-account.json root@192.168.1.32:/mnt/All/iocage/jails/render-server/root/app/google-service-account.json
```

### 5. Configure Environment Variables

Set these in `docker-compose.yml` or as environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_KEY_FILE` | Path to service account JSON key | `/app/google-service-account.json` (default) |
| `GOOGLE_CALENDAR_ID` | Calendar ID from settings | `abc123@group.calendar.google.com` |
| `GOOGLE_DRIVE_FOLDER_ID` | Folder ID from Drive URL | `1aBcDeFgHiJkLmNoPqRsT` |

### 6. Enable in Grid Layout

The server endpoints (`/api/calendar` and `/api/photo`) are already active. To display them in the grid, update `public/grid.html`:

1. Replace the Japanese word widget with the calendar widget:
```html
<div class="lang-widget">
  <div class="word-label">Kalenteri</div>
  <div class="word-sub" id="calendarEvents">Ladataan...</div>
</div>
```

2. Add a middle column for the photo:
```html
<div class="grid-middle">
  <img id="drivePhoto" src="/api/photo" alt="Photo">
</div>
```

3. Update `grid.css` to 3 columns: `grid-template-columns: 300px 200px 300px`

4. Add the script tags:
```html
<script src="calendar.js"></script>
<script src="drive-photo.js"></script>
```

## API Endpoints

### `GET /api/calendar`
Returns upcoming events (next 3 days, max 5).

```json
{
  "events": [
    { "summary": "Meeting", "start": "2026-03-09T14:00:00+02:00", "end": "2026-03-09T15:00:00+02:00", "allDay": false },
    { "summary": "Holiday", "start": "2026-03-10", "end": "2026-03-11", "allDay": true }
  ]
}
```

Cache: 15 minutes. Pre-fetched on startup.

### `GET /api/photo`
Returns a random image from the Drive folder as binary (JPEG/PNG).

Cache: Photo rotates every 15 minutes. File list refreshes every hour.

## Troubleshooting

- **"Google service account key not found"** - The JSON key file is missing at the configured path
- **"Calendar not configured"** - `GOOGLE_CALENDAR_ID` env var is not set
- **403 errors** - The calendar/folder hasn't been shared with the service account email
- **No photos returned** - Verify the folder contains image files and is shared with the service account
