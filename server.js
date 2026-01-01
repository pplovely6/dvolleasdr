const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const pdf = require('pdf-parse');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// --- PDF Parsing Logic ---
function parseMatchReport(text) {
    const lines = text.split('\n');
    let report = {
        matchId: "",
        date: "",
        teamA: { name: "", players: [] },
        teamB: { name: "", players: [] },
        sets: ""
    };

    // Match ID
    const matchLine = lines.find(l => l.includes('Match:'));
    if (matchLine) {
        const m = matchLine.match(/Match:\s*(\w+)/);
        if (m) report.matchId = m[1];
    }

    // Date
    const dateLine = lines.find(l => l.includes('Samedi') || l.includes('Dimanche') || l.includes('Lundi'));
    if (dateLine) {
        // Sample: Samedi 06 Décembre 2025 à 15h00
        const m = dateLine.match(/(\d{1,2})\s+([A-ZÉé][a-z]+)\s+(\d{4})/);
        if (m) {
            const months = { 
                'Janvier': '01', 'Février': '02', 'Mars': '03', 'Avril': '04', 'Mai': '05', 'Juin': '06', 
                'Juillet': '07', 'Août': '08', 'Septembre': '09', 'Octobre': '10', 'Novembre': '11', 'Décembre': '12',
                'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04', 'mai': '05', 'juin': '06', 
                'juillet': '07', 'août': '08', 'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
            };
            const day = m[1].padStart(2, '0');
            report.date = `${day}/${months[m[2]] || '01'}/${m[3]}`;
        } else {
            report.date = dateLine.trim();
        }
    }

    // Teams & Players
    // Find Team sections (RHÔDIA-VAISE and AS DARDILLY)
    let dardillyFound = false;
    let otherTeamFound = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('AS DARDILLY') && !dardillyFound) {
            report.teamB.name = 'AS DARDILLY';
            dardillyFound = true;
            // Search for players
            for (let j = i + 1; j < i + 60 && j < lines.length; j++) {
                const playerMatch = lines[j].match(/^\s*(\d+)\s+([A-Z\s\-]{3,})(?!\s*\d{7})/);
                if (playerMatch) {
                    report.teamB.players.push({
                        number: playerMatch[1],
                        name: playerMatch[2].trim()
                    });
                }
            }
        } else if ((line.includes('RHÔDIA-VAISE') || line.match(/[A-Z]{3,}/)) && !otherTeamFound && !line.includes('AS DARDILLY') && !line.includes('Match:')) {
             // Heuristic for the other team
             if (line.includes('RHÔDIA-VAISE')) {
                report.teamA.name = 'RHÔDIA-VAISE';
                otherTeamFound = true;
                // Search for players
                for (let j = i + 1; j < i + 60 && j < lines.length; j++) {
                    const playerMatch = lines[j].match(/^\s*(\d+)\s+([A-Z\s\-]{3,})(?!\s*\d{7})/);
                    if (playerMatch) {
                        report.teamA.players.push({
                            number: playerMatch[1],
                            name: playerMatch[2].trim()
                        });
                    }
                }
             }
        }
    }

    return report;
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- MULTER CONFIG ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'public/uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// PDF Upload Endpoint
app.post('/api/upload-report', upload.single('report'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
        console.log('[UPLOAD] Parsing PDF:', req.file.path);
        const dataBuffer = fs.readFileSync(req.file.path);
        
        // Use pdf-parse
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(dataBuffer);
        
        if (!data || !data.text) {
            throw new Error('PDF parsing returned no text');
        }
        
        console.log('[UPLOAD] Parsed text length:', data.text.length);
        const parsed = parseMatchReport(data.text);
        res.json(parsed);
    } catch (err) {
        console.error('PDF Parse Error:', err);
        res.status(500).json({ error: 'Failed to parse PDF: ' + err.message });
    }
});

// --- SSR ROUTES ---

// Helper to get all matches for slider
const getAllRecentMatches = () => {
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

    allMatches.sort((a, b) => parseDate(b.date) - parseDate(a.date));
    return allMatches.slice(0, 6);
};

app.get('/', (req, res) => {
    const recentMatches = getAllRecentMatches();
    const news = getJsonData('news');
    res.render('index', { recentMatches, news });
});

app.get('/news/:id', (req, res) => {
    const newsData = getJsonData('news');
    const article = newsData.find(n => n.id === req.params.id);
    if (!article) return res.status(404).send("Article non trouvé");
    res.render('news-detail', { article });
});

// --- NEWS API ---
app.get('/api/news', (req, res) => {
    res.json(getJsonData('news'));
});

app.post('/api/news/update', (req, res) => {
    const newsItem = req.body;
    let news = getJsonData('news');
    if (!Array.isArray(news)) news = [];

    const idx = news.findIndex(n => n.id === newsItem.id);
    if (idx !== -1) {
        news[idx] = newsItem;
    } else {
        news.push(newsItem);
    }

    saveJsonData('news', news);
    res.json({ success: true });
});

app.delete('/api/news/:id', (req, res) => {
    let news = getJsonData('news');
    news = news.filter(n => n.id !== req.params.id);
    saveJsonData('news', news);
    res.json({ success: true });
});

// --- UPLOAD API ---
app.post('/api/upload', (req, res, next) => {
    console.log('--- Upload Request Started ---');
    console.log('Headers:', req.headers);
    next();
}, upload.single('image'), (req, res) => {
    console.log('Multer processing finished');
    if (!req.file) {
        console.error('No file found in request');
        return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log('File saved:', req.file.path);
    res.json({ url: `/uploads/${req.file.filename}` });
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
    const teamCfg = TEAM_MAP[team];

    // 1. Try to find the database name in TEAM_MAP first (if team is a slug)
    let dbName, matchesFile;
    if (teamCfg) {
        dbName = teamCfg.db;
        matchesFile = teamCfg.matches;
    } else {
        // 2. Fallback to previous logic (if team is already a db name or direct link)
        dbName = team.startsWith('db-') ? team : `db-${team}`;
        matchesFile = team.replace('db-', 'matches-');
    }

    const data = getJsonData(dbName);
    const player = (data.players || []).find(p => p.number == number);

    if (player) {
        // Fetch recent matches for the team
        const mData = getJsonData(matchesFile);
        const allMatches = mData.matches || [];
        // Sort by date desc
        const parseDate = (d) => {
            if (!d) return 0;
            const p = d.split('/');
            return new Date(p[2], p[1] - 1, p[0]).getTime();
        };
        const recentMatches = allMatches.sort((a, b) => parseDate(b.date) - parseDate(a.date)).slice(0, 3);

        res.render('player', {
            player,
            teamName: data.team || team,
            teamSlug: team,
            heroImage: data.metadata?.heroImage || 'logo.jpg',
            recentMatches: recentMatches
        });
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

// 4. SAVE PLAYERS (with Smart Merge to prevent data loss)
app.post('/api/players/update', (req, res) => {
    const { team, playerInfo } = req.body;
    const file = team.startsWith('db-') ? team : `db-${team}`;
    console.log(`[POST] Saving Player to ${file} (Smart Merge)`);

    let data = getJsonData(file);
    if (!data.players) data.players = [];

    const idx = data.players.findIndex(p => p.number == playerInfo.number);
    if (idx !== -1) {
        const existing = data.players[idx];

        // Smart Merge for Bio Fields: Only overwrite if the new value is NOT empty/0
        const updatedPlayer = { ...existing };

        ['name', 'pos', 'position', 'profile', 'nationality', 'dob', 'height'].forEach(field => {
            if (playerInfo[field] !== undefined && playerInfo[field] !== "" && playerInfo[field] !== null) {
                updatedPlayer[field] = playerInfo[field];
            }
        });

        if (playerInfo.age && playerInfo.age > 0) updatedPlayer.age = playerInfo.age;
        if (playerInfo.captain !== undefined) updatedPlayer.captain = playerInfo.captain;

        // Deep Merge for Stats
        if (playerInfo.stats) {
            if (!updatedPlayer.stats) updatedPlayer.stats = {};

            updatedPlayer.stats.totalPoints = playerInfo.stats.totalPoints || updatedPlayer.stats.totalPoints || 0;
            updatedPlayer.stats.avgPerMatch = playerInfo.stats.avgPerMatch || updatedPlayer.stats.avgPerMatch || 0;

            ['attack', 'block', 'serve'].forEach(cat => {
                if (playerInfo.stats[cat]) {
                    if (!updatedPlayer.stats[cat]) updatedPlayer.stats[cat] = {};
                    Object.keys(playerInfo.stats[cat]).forEach(key => {
                        const val = playerInfo.stats[cat][key];
                        if (val !== undefined && val !== "" && val !== 0) {
                            updatedPlayer.stats[cat][key] = val;
                        }
                    });
                }
            });
        }

        data.players[idx] = updatedPlayer;
    } else {
        // New player: use provided info
        data.players.push(playerInfo);
    }

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
// --- SITEMAP & AI ACCESSIBILITY ---
app.get('/sitemap.xml', (req, res) => {
    const baseUrl = 'https://as-dardilly.replit.app'; // Fallback base URL
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Core Pages
    ['/', '/results', '/contact', '/planning', '/admin.html'].forEach(p => {
        xml += `  <url><loc>${baseUrl}${p}</loc><priority>0.8</priority></url>\n`;
    });

    // Team & Player Pages
    Object.keys(TEAM_MAP).forEach(slug => {
        xml += `  <url><loc>${baseUrl}/equipe/${slug}</loc><priority>0.7</priority></url>\n`;

        // Load players for this team
        const data = getJsonData(TEAM_MAP[slug].db);
        if (data && data.players) {
            data.players.forEach(p => {
                if (p.number) {
                    xml += `  <url><loc>${baseUrl}/player/${slug}/${p.number}</loc><priority>0.6</priority></url>\n`;
                }
            });
        }
    });

    xml += `</urlset>`;
    res.header('Content-Type', 'application/xml');
    res.send(xml);
});

// Start Server
app.listen(PORT, HOST, () => {
    console.log(`--------------------------------------------------`);
    console.log(`SERVER RUNNING at http://${HOST}:${PORT}/admin.html`);
    console.log(`--------------------------------------------------`);
});