const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 5000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- SSR ROUTES ---

// Helper to get all matches for slider
const getAllRecentMatches = () => {
    const teamFiles = [
        { file: 'db-m18-m', label: 'M18 GARÇONS', code: 'm18-m' },
        { file: 'db-m15-m', label: 'M15 GARÇONS', code: 'm15-m' },
        { file: 'db-sen-f', label: 'SÉNIORS FILLES', code: 'sen-f' },
        { file: 'db-sen-m', label: 'SÉNIORS GARÇONS', code: 'sen-m' }
    ];

    let allMatches = [];
    teamFiles.forEach(t => {
        const data = getJsonData(t.file);
        if (data.matches) {
            data.matches.forEach(m => {
                allMatches.push({ ...m, category: t.label, tag: t.code });
            });
        }
    });

    // Simple date parser for sorting (DD MMM YY)
    const parseDate = (s) => {
        const tokens = s.split(/\s+/);
        if (tokens.length >= 2) {
            const mnames = {
                jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
                janv: 0, fev: 1, mars: 2, avr: 3, mai: 4, juin: 5, juil: 6, aout: 7, sept: 8, oct: 9, nov: 10, dec: 11
            };
            const day = parseInt(tokens[0], 10);
            const monStr = tokens[1].toLowerCase().substring(0, 4).replace('.', '');
            const month = mnames[monStr];
            let year = 2025;
            if (tokens[2]) {
                const yearT = tokens[2];
                year = (yearT.length === 2) ? parseInt('20' + yearT, 10) : parseInt(yearT, 10);
            }
            if (!isNaN(day) && month !== undefined) return new Date(year, month, day).getTime();
        }
        return 0;
    };

    allMatches.sort((a, b) => parseDate(b.date) - parseDate(a.date));
    return allMatches.slice(0, 6);
};

app.get('/', (req, res) => {
    const recentMatches = getAllRecentMatches();
    res.render('index', { recentMatches });
});

app.get('/home', (req, res) => {
    res.redirect('/');
});

app.get('/index.html', (req, res) => {
    res.redirect('/');
});

app.get('/equipes', (req, res) => {
    res.render('equipes');
});

app.get('/equipes.html', (req, res) => {
    res.redirect('/equipes');
});

const getAllSchedule = () => {
    const teams = [
        { file: "schedule-dep-garcons", label: "DEP GARÇONS", code: "dep" },
        { file: "schedule-m18-garcons", label: "M18 GARÇONS", code: "m18" },
        { file: "schedule-m18-filles-1", label: "M18 FILLES 1", code: "m18" },
        { file: "schedule-m18-filles-2", label: "M18 FILLES 2", code: "m18" },
        { file: "schedule-senior-filles-1", label: "SENIOR FILLES 1", code: "dep" },
        { file: "schedule-senior-filles-2", label: "SENIOR FILLES 2", code: "dep" },
        { file: "schedule-m15-filles", label: "M15 FILLES", code: "m15" },
        { file: "schedule-m13-mixte", label: "M13 MIXTE", code: "m13" }
    ];

    let allMatches = [];
    teams.forEach(t => {
        const data = getJsonData(t.file);
        if (data.schedule) {
            data.schedule.forEach(m => {
                allMatches.push({ ...m, category: t.label, tag: t.code });
            });
        }
    });

    const parseDate = (dateStr, timeStr) => {
        if (!dateStr) return new Date(8640000000000000).getTime();
        const months = { "JAN": 0, "JANV": 0, "FÉV": 1, "FEV": 1, "MAR": 2, "AVR": 3, "MAI": 4, "JUIN": 5, "JUIL": 6, "AOÛT": 7, "AOUT": 7, "SEP": 8, "SEPT": 8, "OCT": 9, "NOV": 10, "DÉC": 11, "DEC": 11 };
        try {
            const parts = dateStr.toUpperCase().split(" ");
            const day = parseInt(parts[0]);
            const month = months[parts[1]] || 0;
            const year = parts[2] ? parseInt(parts[2]) : 2026;
            const hourPart = timeStr ? timeStr.split(":")[0] : "0";
            const minPart = timeStr ? timeStr.split(":")[1] : "0";
            return new Date(year, month, day, parseInt(hourPart), parseInt(minPart)).getTime();
        } catch (e) { return 0; }
    };

    return allMatches.sort((a, b) => parseDate(a.date, a.time) - parseDate(b.date, b.time));
};

app.get('/planning', (req, res) => {
    const allMatches = getAllSchedule();
    res.render('planning', { allMatches });
});

app.get('/planning.html', (req, res) => {
    res.redirect('/planning');
});

const getAllResults = () => {
    const teams = [
        { file: "matches-dep-garcons", label: "SENIOR GARÇONS", code: "senior-m" },
        { file: "matches-db", label: "M18 GARÇONS", code: "m18-m" },
        { file: "matches-m18-filles-1", label: "M18 FILLES 1", code: "m18-f" },
        { file: "matches-m18-filles-2", label: "M18 FILLES 2", code: "m18-f" },
        { file: "matches-senior-filles-1", label: "SENIOR FILLES 1", code: "senior-f" },
        { file: "matches-senior-filles-2", label: "SENIOR FILLES 2", code: "senior-f" },
        { file: "matches-m15-filles", label: "M15 FILLES", code: "m15" },
        { file: "matches-m13-mixte", label: "M13 MIXTE", code: "m13" }
    ];

    let allMatches = [];
    teams.forEach(t => {
        const data = getJsonData(t.file);
        if (data.matches) {
            data.matches.forEach(m => {
                allMatches.push({ ...m, category: t.label, tag: t.code });
            });
        }
    });

    const parseDate = (dateStr) => {
        if (!dateStr) return 0;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            let year = parseInt(parts[2]);
            if (year < 100) year += 2000;
            return new Date(year, parts[1] - 1, parts[0]).getTime();
        }
        return 0;
    };

    return allMatches.sort((a, b) => parseDate(b.date) - parseDate(a.date));
};

app.get('/results', (req, res) => {
    const allMatches = getAllResults();
    res.render('results', { allMatches });
});

app.get('/results.html', (req, res) => {
    res.redirect('/results');
});

app.get('/contact', (req, res) => {
    res.render('contact');
});

app.get('/contact.html', (req, res) => {
    res.redirect('/contact');
});

app.get('/player/:team/:number', (req, res) => {
    const { team, number } = req.params;
    const dbName = team.startsWith('db-') ? team : `db-${team}`;
    const data = getJsonData(dbName);
    const player = (data.players || []).find(p => p.number == number);

    if (player) {
        res.render('player', { player, teamName: data.team || team, teamSlug: team });
    } else {
        res.status(404).send("Joueur non trouvé");
    }
});

app.get('/match', (req, res) => {
    const matchId = req.query.id;
    if (!matchId) return res.redirect('/results');

    const result = findMatchInFiles(matchId);
    if (result) {
        res.render('match', { match: result.match });
    } else {
        res.status(404).send("Match non trouvé");
    }
});

app.get('/match.html', (req, res) => {
    if (req.query.id) {
        res.redirect(`/match?id=${req.query.id}`);
    } else {
        res.redirect('/results');
    }
});

const TEAM_MAP = {
    'reg-filles': { db: 'db-senior-filles-1', matches: 'matches-senior-filles-1', schedule: 'schedule-senior-filles-1' },
    'dep-filles': { db: 'db-senior-filles-2', matches: 'matches-senior-filles-2', schedule: 'schedule-senior-filles-2' },
    'dep-garcons': { db: 'db-dep-garcons', matches: 'matches-dep-garcons', schedule: 'schedule-dep-garcons' },
    'm18': { db: 'db-m18-garcons', matches: 'matches-db', schedule: 'schedule-m18-garcons' },
    'm18-filles-1': { db: 'db-m18-filles-1', matches: 'matches-m18-filles-1', schedule: 'schedule-m18-filles-1' },
    'm18-f-2': { db: 'db-m18-filles-2', matches: 'matches-m18-filles-2', schedule: 'schedule-m18-filles-2' },
    'm15-f': { db: 'db-m15-filles', matches: 'matches-m15-filles', schedule: 'schedule-m15-filles' },
    'm13-mx': { db: 'db-m13-mixte', matches: 'matches-m13-mixte', schedule: 'schedule-m13-mixte' }
};

app.get('/equipe/:slug', (req, res) => {
    const teamCfg = TEAM_MAP[req.params.slug];
    if (!teamCfg) return res.status(404).send("Équipe non trouvée");

    const rosterData = getJsonData(teamCfg.db);
    const matchesData = getJsonData(teamCfg.matches);
    const scheduleData = getJsonData(teamCfg.schedule);

    res.render('team', {
        slug: req.params.slug,
        metadata: rosterData.metadata || {},
        roster: rosterData.players || [],
        matches: matchesData.matches || [],
        schedule: scheduleData.schedule || [],
        teamName: rosterData.team || req.params.slug.toUpperCase()
    });
});

Object.keys(TEAM_MAP).forEach(slug => {
    app.get(`/${slug}.html`, (req, res) => res.redirect(`/equipe/${slug}`));
});

app.get('/inscription', (req, res) => {
    res.render('inscription');
});

app.get('/inscription.html', (req, res) => {
    res.redirect('/inscription');
});

app.get('/beach', (req, res) => {
    res.render('beach');
});

app.get('/beach-dardilly.html', (req, res) => {
    res.redirect('/beach');
});

// Ensure data folder exists
const DATA_PATH = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_PATH)) fs.mkdirSync(DATA_PATH);

// --- HELPER: Read/Create JSON ---
const getJsonData = (file) => {
    const filePath = path.join(DATA_PATH, `${file}.json`);

    // 1. Create file if it doesn't exist
    if (!fs.existsSync(filePath)) {
        console.log(`[INFO] Creating new database file: ${file}.json`);
        let defaultData = {};
        if (file.includes('schedule')) defaultData = { schedule: [] };
        else if (file.includes('matches')) defaultData = { matches: [] };
        else if (file.includes('db-')) defaultData = { players: [] };

        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
        return defaultData;
    }

    // 2. Read file
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content ? JSON.parse(content) : {};
    } catch (e) {
        console.error(`[ERROR] Reading ${file}:`, e);
        return {};
    }
};

const saveJsonData = (file, data) => {
    const filePath = path.join(DATA_PATH, `${file}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[SUCCESS] Saved data to ${file}.json`);
};

// --- ROUTES ---

// 1. GET DATA
app.get('/api/data/:file', (req, res) => {
    console.log(`[GET] Requesting ${req.params.file}`);
    res.json(getJsonData(req.params.file));
});

// 2. SAVE SCHEDULE (Upcoming)
app.post('/api/schedule/update', (req, res) => {
    const { dbName, scheduleData } = req.body;
    console.log(`[POST] Saving Schedule to ${dbName}`, scheduleData);

    let data = getJsonData(dbName);
    if (!data.schedule) data.schedule = [];

    const idx = data.schedule.findIndex(s => s.id === scheduleData.id);
    if (idx !== -1) data.schedule[idx] = scheduleData; // Update
    else data.schedule.push(scheduleData); // Add new

    saveJsonData(dbName, data);
    res.json({ success: true });
});

// 3. SAVE RESULTS (Past Matches)
app.post('/api/matches/update', (req, res) => {
    const { dbName, matchData } = req.body;
    console.log(`[POST] Saving Result to ${dbName}`);

    let data = getJsonData(dbName);
    if (!data.matches) data.matches = [];

    const idx = data.matches.findIndex(m => m.id === matchData.id);
    if (idx !== -1) data.matches[idx] = matchData;
    else data.matches.push(matchData);

    saveJsonData(dbName, data);
    res.json({ success: true });
});

// 4. SAVE PLAYERS
app.post('/api/players/update', (req, res) => {
    const { team, playerInfo } = req.body;
    const file = team.startsWith('db-') ? team : `db-${team}`;
    console.log(`[POST] Saving Player to ${file}`);

    let data = getJsonData(file);
    if (!data.players) data.players = [];

    const idx = data.players.findIndex(p => p.number == playerInfo.number);
    if (idx !== -1) data.players[idx] = { ...data.players[idx], ...playerInfo };
    else data.players.push(playerInfo);

    saveJsonData(file, data);
    res.json({ success: true });
});

// 5. DELETE ITEM
app.delete('/api/delete/:file/:id', (req, res) => {
    const { file, id } = req.params;
    console.log(`[DELETE] Removing ${id} from ${file}`);

    let data = getJsonData(file);

    if (data.schedule) data.schedule = data.schedule.filter(s => s.id != id);
    if (data.matches) data.matches = data.matches.filter(m => m.id != id);
    if (data.players) data.players = data.players.filter(p => p.number != id);

    saveJsonData(file, data);
    res.json({ success: true });
});
// --- NEW CODE: Match Editing API ---

const DATA_FOLDER = path.join(__dirname, 'data');

// Helper: Find which file contains a specific match ID
function findMatchInFiles(matchId) {
    const files = fs.readdirSync(DATA_FOLDER).filter(f => f.endsWith('.json'));

    for (const file of files) {
        const filePath = path.join(DATA_FOLDER, file);
        try {
            const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (fileData.matches) {
                const matchIndex = fileData.matches.findIndex(m => m.id === matchId);
                if (matchIndex !== -1) {
                    return { filePath, fileData, matchIndex, match: fileData.matches[matchIndex] };
                }
            }
        } catch (err) {
            console.error("Error reading file:", file, err);
        }
    }
    return null;
}

// 1. Get Match Details (including Lineup)
app.get('/api/match/:id', (req, res) => {
    const result = findMatchInFiles(req.params.id);
    if (result) {
        res.json(result.match);
    } else {
        res.status(404).json({ error: "Match non trouvé" });
    }
});

// 2. Save Match Details (Score + Lineup)
app.post('/api/match/:id', (req, res) => {
    const result = findMatchInFiles(req.params.id);

    if (result) {
        const { filePath, fileData, matchIndex } = result;

        // Merge existing match data with new data (score, sets, lineup)
        fileData.matches[matchIndex] = { ...fileData.matches[matchIndex], ...req.body };

        // Save back to the file
        fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));
        res.json({ success: true, message: "Match mis à jour" });
    } else {
        res.status(404).json({ error: "Match non trouvé pour mise à jour" });
    }
});
// Start Server
app.listen(PORT, HOST, () => {
    console.log(`--------------------------------------------------`);
    console.log(`SERVER RUNNING at http://${HOST}:${PORT}/admin.html`);
    console.log(`--------------------------------------------------`);
});