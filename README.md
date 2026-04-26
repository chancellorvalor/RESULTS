# APRP Supabase Election Sites

This package turns the old single live-results HTML file into two separate website areas:

- `public/` — the public live results map that regular users see.
- `admin/` — the private admin backend where approved admins enter election data.

The public site does **not** use Google Sheets. Both sites use Supabase.

## How the math works

In the admin backend, every state has these fields:

- `Total Turnout` = expected full turnout / total possible votes for that state in this election.
- `Turnout %` = percent of that turnout currently counted or reporting.
- `GOP Vote %`
- `DNC Vote %`
- `IND Vote %`

The public site calculates live votes as:

```text
counted votes = total turnout × turnout %
party votes = counted votes × party vote %
```

Example:

```text
Total Turnout: 1,000,000
Turnout %: 40
GOP Vote %: 55
DNC Vote %: 43
IND Vote %: 2

Counted votes = 400,000
GOP votes = 220,000
DNC votes = 172,000
IND votes = 8,000
```

## Setup Supabase

1. Create a new Supabase project.
2. Go to **SQL Editor**.
3. Run `sql/schema.sql`.
4. Go to **Authentication → Users** and create admin users.
5. Go to **Project Settings → API** and copy:
   - Project URL
   - anon public key
6. Paste them into `shared/config.js`:

```js
window.APRP_CONFIG = {
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR-SUPABASE-ANON-PUBLIC-KEY',
  refreshSeconds: 15,
  defaultElectionSlug: 'current'
};
```

The anon key is okay to publish because the SQL enables Row Level Security. Public users can only read active election data. Logged-in Supabase Auth users can edit.

## Deploy on GitHub Pages

1. Create a new GitHub repo.
2. Upload everything in this folder.
3. In GitHub, go to **Settings → Pages**.
4. Set source to **Deploy from branch**.
5. Select `main` and `/root`.
6. Your two links will be:

```text
https://YOURNAME.github.io/REPO/public/
https://YOURNAME.github.io/REPO/admin/
```

You can also use a custom domain later, like:

```text
results.yourdomain.com
admin.yourdomain.com
```

## First use

1. Open the admin link.
2. Login with your Supabase admin user.
3. Click **Create missing states**. This creates 50 states + DC using the uploaded GeoJSON/map file.
4. Edit election title, candidates, colors, electoral votes, turnout, and vote percentages.
5. Click **Save all rows**.
6. Open the public link to see the map update.

## Files

```text
public/index.html      Public live results page
public/app.js          Public display logic
public/styles.css      Public styling
public/data/states.geojson  State map file
admin/index.html       Admin backend page
admin/app.js           Admin editing logic
admin/styles.css       Admin styling
shared/config.js       Supabase connection settings
sql/schema.sql         Supabase database + security setup
```

## Notes

- No Google Sheet is used.
- No Mapbox token is used.
- Public page auto-refreshes every 15 seconds by default.
- Admin can change candidate names, parties, colors, and image URLs.
- State calls can be manual with the `Call` dropdown, or left as auto/none.
