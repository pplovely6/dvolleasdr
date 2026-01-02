const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('/Users/admin/Downloads/doc-6.pdf');

function parseMatchReport(text) {
    const rawLines = text.split(/\r?\n/);
    const lines = rawLines.map(l => l.trim()).filter(l => l.length > 0);
    let report = {
        matchId: "",
        date: "",
        teamA: { name: "", players: [] },
        teamB: { name: "AS DARDILLY", players: [] },
        sets: [],
        score: ""
    };

    const monthMap = {
        'janvier':'01','février':'02','fevrier':'02','mars':'03','avril':'04','mai':'05','juin':'06',
        'juillet':'07','août':'08','aout':'08','septembre':'09','octobre':'10','novembre':'11','décembre':'12','decembre':'12'
    };

    for (const l of lines) {
        const m = l.match(/Match[:\s]+([A-Z0-9\-]+)/i);
        if (m) { report.matchId = m[1]; break; }
    }

    for (const l of lines) {
        const m = l.match(/(Samedi|Dimanche|Lundi|Mardi|Mercredi|Jeudi|Vendredi)\s+(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})/i);
        if (m) {
            const day = m[2].padStart(2,'0');
            const mon = monthMap[m[3].toLowerCase()] || '01';
            report.date = `${day}/${mon}/${m[4]}`;
            break;
        }
        const m2 = l.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (m2) {
            const day = m2[1].padStart(2,'0');
            const mon = m2[2].padStart(2,'0');
            let yr = m2[3]; if (yr.length === 2) yr = '20'+yr;
            report.date = `${day}/${mon}/${yr}`;
            break;
        }
    }

    // Vainqueur quick check
    const winnerLine = lines.find(l => /Vainqueur\b/i.test(l));
    if (winnerLine) {
        const wm = winnerLine.match(/(\d)\s*[\-\/]\s*(\d)/);
        if (wm) {
            report.score = `${wm[1]} - ${wm[2]}`;
        } else {
            const wm2 = winnerLine.match(/\b(\d{1})\/(\d{1})\b/);
            if (wm2) report.score = `${wm2[1]} - ${wm2[2]}`;
        }
    }

    // per-set paired regex
    const setScores = [];
    lines.forEach(l => {
        let match;
        const regex = /(\d{1,2})\s*[:\-\/]\s*(\d{1,2})/g;
        while ((match = regex.exec(l)) !== null) {
            const a = parseInt(match[1],10), b = parseInt(match[2],10);
            if (/\b(Début|Fin|Durée|Durée par Set)\b/i.test(l)) continue;
            if ((a > 5 || b > 5) && !(a > 31 || b > 31)) setScores.push(`${a}:${b}`);
        }
    });

    let setsFromPairs = Array.from(new Set(setScores));

    // header extraction
    const tryHeaderExtract = () => {
        const bMatches = text.match(/P\s+G\s+([0-9\s\']{1,200})/i);
        console.log('DEBUG tryHeaderExtract: bMatches=', !!bMatches, bMatches ? bMatches[1] : null);
        let aMatches = null;
        const pgIndex = text.search(/P\s+G\s+/i);
        if (pgIndex !== -1) {
            const before = text.slice(0, pgIndex);
            const trIdx = before.toUpperCase().lastIndexOf('T R G P');
            if (trIdx !== -1) {
                aMatches = [null, before.slice(trIdx)];
            }
        }
        console.log('DEBUG tryHeaderExtract: aMatches=', !!aMatches, aMatches ? aMatches[1].slice(0,200) : null);
        let aNums = [], bNums = [];
        if (aMatches && aMatches[1]) {
            const nums = (aMatches[1].match(/\d+/g) || []).map(n=>parseInt(n,10));
            const pvals = [];
            for (let i = 3; i < nums.length && pvals.length < 3; i += 4) {
                const v = nums[i]; if (v > 5 && v <= 31) pvals.push(v);
            }
            aNums = pvals;
        }
        if (bMatches && bMatches[1]) {
            const nums = (bMatches[1].match(/\d+/g) || []).map(n=>parseInt(n,10));
            bNums = nums.filter(n=>n>5 && n<=31).slice(0,3);
        }
        if (aNums.length === 3 && bNums.length === 3) {
            const res = [];
            for (let i = 0; i < 3; i++) res.push(`${aNums[i]}:${bNums[i]}`);
            return res;
        }
        return null;
    };

    const headerSets = tryHeaderExtract();
    if (headerSets && headerSets.length) report.sets = headerSets.join(', ');

    // fallback numeric-run heuristic
    if (!report.sets) {
        const numMatches = [];
        const numRe = /\b(\d{1,2})\b/g;
        let mm; let tokenIdx = 0;
        while ((mm = numRe.exec(text)) !== null) {
            const s = mm[1]; const n = parseInt(s,10); const pos = mm.index;
            const prev = text[pos-1] || '';
            const next = text[pos + s.length] || '';
            if (prev === ':' || next === ':' || next === '\'' || /h/i.test(next)) { tokenIdx++; continue; }
            numMatches.push({ n, tokenIdx, pos });
            tokenIdx++;
        }
        const validIdx = numMatches.filter(x => x.n > 5 && x.n <= 31);
        const runs = [];
        if (validIdx.length) {
            let run = [validIdx[0]];
            for (let i = 1; i < validIdx.length; i++) {
                if (validIdx[i].tokenIdx === validIdx[i-1].tokenIdx + 1) run.push(validIdx[i]);
                else { if (run.length >= 3) runs.push(run.map(r=>r.n)); run = [validIdx[i]]; }
            }
            if (run.length >= 3) runs.push(run.map(r=>r.n));
        }
        let finalSets = [];
        if (runs.length) {
            const longRun = runs.find(r => r.length >= 6);
            if (longRun) {
                const first = longRun.slice(0,3);
                const second = longRun.slice(3,6);
                for (let i = 0; i < Math.min(first.length, second.length); i++) finalSets.push(`${first[i]}:${second[i]}`);
            } else if (runs.length >= 2) {
                const a = runs[0].slice(0,3);
                const b = runs[1].slice(0,3);
                for (let i = 0; i < Math.min(a.length, b.length); i++) finalSets.push(`${a[i]}:${b[i]}`);
            }
        }
        if (setsFromPairs.length) report.sets = setsFromPairs.join(', ');
        else if (finalSets.length) report.sets = finalSets.join(', ');
        else report.sets = '';
    }

    return report;
}

pdf(dataBuffer).then(d=>{
    // debug: show neighborhood of 'Durée par Set' and 'P G' so we can tune regex
    const t = d.text;
    const idx = t.indexOf('Durée par Set');
    if (idx !== -1) console.log('\nNEAR Durée par Set:\n', t.slice(idx, idx+300));
    const pgi = t.search(/P\s*G|PG|P G/i);
    if (pgi !== -1) console.log('\nNEAR P G/PG:\n', t.slice(Math.max(0,pgi-80), pgi+160));

    const parsed = parseMatchReport(d.text);
    console.log('\nPARSED SCORE:', parsed.score);
    console.log('PARSED SETS:', parsed.sets);
}).catch(e=>{ console.error(e); process.exit(1); });
