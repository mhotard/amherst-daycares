# Pioneer Valley Daycares

A searchable database of daycares in the Pioneer Valley area near Amherst, MA.

## Project Structure

```
pioneer-valley-daycares/
├── index.html          # Main page with search/filter UI
├── css/styles.css      # All styles
├── js/app.js           # Client-side filtering, modal, rendering
├── data/
│   ├── daycares.json   # Main daycare database
│   └── regions.json    # Towns in coverage area
```

## Data Model

Each daycare in `daycares.json` has:
- `id`, `name`, `organization`
- `location`: { town, address, region }
- `hours`: { startTime, endTime, daysOfWeek[] }
- `ages`: { minMonths, maxYears } — min in months (infant care starts at 6 weeks = 1.5 months), max in years
- `tuition`: { perWeek, perMonth, notes, subsidyAccepted }
- `priorityAffiliation`: string or null — some daycares give enrollment priority to specific groups (e.g. "UMass faculty/staff", "Amherst College employees")
- `summerClosures`: string — describes any summer closure schedule (e.g. "Closed last 2 weeks of August", "Open year-round")
- `homeBased`: boolean — true if licensed family home daycare, false if center
- `description`: string
- `source`: { url, lastVerified, notes } — notes used if not found via standard web search
- `incomplete`: array of field names that are missing or unverified

## Example Entry

```json
{
  "id": "example-daycare-amherst",
  "name": "Example Daycare",
  "organization": null,
  "location": {
    "town": "Amherst",
    "address": "123 Main St, Amherst, MA 01002",
    "region": "Hampshire"
  },
  "hours": {
    "startTime": "7:30am",
    "endTime": "5:30pm",
    "daysOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  },
  "ages": {
    "minMonths": 2,
    "maxYears": 5
  },
  "tuition": {
    "perWeek": null,
    "perMonth": 1800,
    "notes": "Sliding scale available",
    "subsidyAccepted": true
  },
  "priorityAffiliation": null,
  "summerClosures": "Open year-round",
  "homeBased": false,
  "description": "...",
  "source": {
    "url": "https://example.com",
    "lastVerified": "2026-05-11",
    "notes": null
  },
  "incomplete": ["tuition.perWeek"]
}
```

## Common Tasks

### Adding a new daycare
1. Add entry to `data/daycares.json` following the schema
2. Update `totalDaycares` count in the JSON
3. Commit and push to deploy

### Updating daycare info
1. Edit the entry in `data/daycares.json`
2. Update `source.lastVerified` date
3. Remove fields from `incomplete` array if now complete

## Coverage Area

Hampshire County, Franklin County, Hampden County — all towns within ~45 min of Amherst, MA.

## Deployment

- Hosted on GitHub Pages
- Push to `main` branch to deploy
