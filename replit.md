# AS Dardilly Volleyball Club Website

## Overview

This is a full-stack web application for AS Dardilly Volleyball Club, a French volleyball organization established in 1944. The application serves as the club's official website, providing team information, match results, schedules, player profiles, and registration information. It features a bilingual interface (French/English) with a modern dark-themed design using yellow brand accents.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Static HTML pages** served from the `/public` directory
- **Vanilla JavaScript** for client-side interactivity (no frontend framework)
- **CSS** with custom properties (CSS variables) for theming
- **Font Awesome** for icons
- **Google Fonts** (Outfit, Barlow) for typography

Key frontend files:
- `style.css` - Main stylesheet with brand variables and global styles
- `player-style.css` - Player profile specific styles
- `lang.js` - Client-side internationalization (FR/EN translation system)
- `player-db.js` - Fetches and renders team roster data
- `match-renderer.js` - Fetches and displays match results

### Backend Architecture
- **Express.js 5.x** running on Node.js
- **File-based JSON storage** in `/data` directory (no database)
- Server configured to run on port 5000, bound to 0.0.0.0

API Design Pattern:
- RESTful endpoints under `/api/data/[filename]`
- Helper functions `getJsonData()` and `saveJsonData()` handle file I/O
- Data files auto-created with sensible defaults if missing

### Data Storage
JSON files in `/data` directory organized by:
- **Team databases**: `db-[team-name].json` - Player rosters
- **Match results**: `matches-[team-name].json` - Historical match data
- **Schedules**: `schedule-[team-name].json` - Upcoming games
- **Global match database**: `matches-db.json` - Cross-team match data

Data structure example for teams:
```json
{
  "team": "Team Name",
  "players": [
    { "number": 1, "name": "PLAYER NAME", "position": "S", "profile": "player-page.html", "captain": false }
  ]
}
```

### Page Structure
Each team has a dedicated page (e.g., `m18.html`, `dep-garcons.html`) that:
1. Displays team roster via JavaScript fetch
2. Shows recent match results
3. Shows upcoming schedule
4. Links to individual player profile pages

## External Dependencies

### NPM Packages
- **express** (5.2.1) - Web server framework
- **body-parser** (2.2.1) - Request body parsing middleware
- **cors** (2.8.5) - Cross-origin resource sharing

### CDN Resources
- **Font Awesome 6.4.0** - Icon library
- **Google Fonts** - Outfit and Barlow font families

### No External Services
- No database service (uses local JSON files)
- No authentication system
- No external APIs consumed
- No cloud storage integrations

### Notes for Development
- The `results.js` file in `/public` appears to be misplaced server code and may cause issues if loaded as client-side JavaScript
- Frontend JavaScript files use relative paths (`/api/data/...`) for API calls
- The admin panel (`admin.html`) provides a management interface for data entry