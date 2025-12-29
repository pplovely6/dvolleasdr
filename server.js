const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
// Change const PORT = 3000; to:
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

// Start Server
app.listen(PORT, () => {
    console.log(`--------------------------------------------------`);
    console.log(`SERVER RUNNING at http://localhost:${PORT}/admin.html`);
    console.log(`--------------------------------------------------`);
});