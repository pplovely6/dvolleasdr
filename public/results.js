const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

const getJsonData = (fileName) => {
    const filePath = path.join(__dirname, 'data', `${fileName}.json`);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const saveJsonData = (fileName, data) => {
    const filePath = path.join(__dirname, 'data', `${fileName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

app.get('/api/players', (req, res) => {
    try {
        const data = getJsonData('db-m18-garcons');
        res.json(data);
    } catch (e) {
        res.status(500).send("Error reading players");
    }
});

app.post('/api/matches/update', (req, res) => {
    const { matchId, newScore, newSets } = req.body;
    try {
        let data = getJsonData('matches-db');
        let match = data.matches.find(m => m.id === matchId);
        if (match) {
            match.score = newScore;
            match.sets = newSets;
            saveJsonData('matches-db', data);
            res.json({ success: true, message: "Match updated successfully!" });
        } else {
            res.status(404).json({ success: false, message: "Match ID not found." });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
    console.log(`Admin interface: http://localhost:${PORT}/admin.html`);
});