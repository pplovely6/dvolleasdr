const text = `F4 - M18/M21 FEMININES NIVEAU 4 Ville: REYRIEUX
Salle: GYMNASE DU COLLEGE COMPAGNON M21 | FEMININE
Match: JF4A011 - Jour: 03
Samedi 29 Novembre 2025 à 14h00
Comité du Rhône Métropole de Lyon
VV SAÔNE 2 AS DARDILLY 1
Ordre de Service
Formation de Départ
Joueur N°
Remplaçants
Score
1 5
S
E
T
1
VV SAÔNE 2 Début: 13:48 S (this is time)
AS DARDILLY 1 Fin: 14:18 R (this is time)
I II III IV 15
V VI
1 1
11 I II III IV V VI
11
2 2
12 12
13 3 3
13
14 4 4
14
5 5
15 15
6 6
16
7 7
17
8 8
18
9 9
19
X
10 10
20
21
22
23
24
25
S
E
T
2
AS DARDILLY 1 Début: 14:18 S (this is time)
VV SAÔNE 2 Fin: 14:46 R (this is time)
I II III IV V VI
26
1 1
11 21 I II III IV V VI
11
21
2 2
12 12
22 22
13 23 3 3
13
23
14 24 4 4
14
24
25
5 5
15 15
6 6
16 26
16
17 7 7
17
18 8 8
18
9 9
19 19
X
10 10
20 20
2 6
T T
T T
Tours au service
3 7
4 8
Ordre de Service
Formation de Départ
Joueur N°
Remplaçants
Score
1 5
S
E
T
3
VV SAÔNE 2 Début: 14:46 S (this is time)
AS DARDILLY 1 Fin: 15:12 R (this is time)
I II III IV V VI
22
1 1
11 21 I II III IV V VI
11
2 2
12 22 12
13 3 3
13
4 4
14 14
15 5 5
15
16 6 6
16
17 7 7
17
8 8
18 18
9 9
19 19
10 20 X
10
20
21
22
23
24
25
S
E
T
4
Début:
Fin:
I II III IV V VI
I II III IV V VI
2 6
T T
T T
Tours au service
3 7
4 8
S
E
T
5
VV SAÔNE 2 AS DARDILLY 1
I II III IV V VI I II III IV V VI I II III IV V VI
N° Nom Prénom Licence N° Nom Prénom Licence
T T T
DEMANDE NON FONDEE
REMARQUES
SANCTIONS
07 DROUOT AMY 2692886
08 LESCA PORTILLO PALOMA 2898351
24 ZABAT MÉLINA 2597056
44 AUGUSTIN CHLOE 2692881
55 NEBUT CLEMENTINE 2895994
66 MUSTARA JADE 2866550
67 DOULOUMA COCHARD LEONIE 2724138
72 LERMITE MAÏWEN 2796296
91 JOGUET LILLY-MAY 2893984
92 VERNIER EDEN 2812086
02 CARRE INES 2403452
05 LAPALUS PAULINE 2685862
06 MALAFOSSE ELLA 2770512
07 BELDJILALI AMINA 2702166
08 COLLIGNON SIVERBRANT ELISA 2593837
09 OBUCINA MILA 2697151
11 MORAND LOUISE 2681445
13 PONTET EMMA 2583318
14 MOLIERE OCÉANE 2504983
17 LATTE ELOISE 2692810
EQU.A EQU.B
A P E D A/B Set Score
LIBEROS
13 PONTET EMMA 2583318
APPROBATION
RESULTATS
Arbitres NOM Prénom Ligue Licence Signature
Equipe A Equipe B
OFFICIELS
T R G P 1er BLANCHARD AMAURY 1973799
0 0 0 15 2ème GAURON AXEL 2488090
0 0 0 24 0 0 0 22 Marqueur GADROY BASTIEN 2866552
0 0 0 61 Marq.Ass.
Début 13:48 Durée par Set 1 30' 2 28' 3 26' 84' Fin 15:12 P G 25 26 25 76 R T
1 0 0
1 0 0
1 0 0
3 0 0
Durée
1h24
EA BERGOT QUENTIN 2745827 EA BOSC CEDRIC 1737904
SIGNATURES
Juges
Lignes
Capitaine
Capitaine
Vainqueur: AS DARDILLY 1 3/0`;

function parseMatchReport(text) {
    const rawLines = text.split(/\r?\n/);
    const lines = rawLines.map(l => l.trim()).filter(l => l.length > 0);
    let report = { sets: [], score: "" };

    // Using same heuristics as server.js: pairs and numeric runs
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
        } else if (runs.length === 1 && runs[0].length === 3) {
            const idxFirstNum = text.indexOf(String(runs[0][0]));
            const nearby = text.slice(Math.max(0, idxFirstNum - 200), idxFirstNum + 200).match(/\b(\d{1,2})\b/g) || [];
            if (nearby.length >= 6) {
                const nums = nearby.map(n=>parseInt(n,10)).filter(n=>n>5 && n<=31);
                if (nums.length >= 6) {
                    const a = nums.slice(0,3), b = nums.slice(3,6);
                    for (let i = 0; i < Math.min(a.length,b.length); i++) finalSets.push(`${a[i]}:${b[i]}`);
                }
            }
        }
    }

    // header attempt (T R G P / P G)
    const tryHeaderExtract = () => {
        const bMatches = text.match(/P\s+G\s+([0-9\s\']{1,200})/i);
        let aMatches = null;
        const pgIndex = text.search(/P\s+G\s+/i);
        if (pgIndex !== -1) {
            const before = text.slice(0, pgIndex);
            const trIdx = before.toUpperCase().lastIndexOf('T R G P');
            if (trIdx !== -1) aMatches = [null, before.slice(trIdx)];
        }
        let aNums = [], bNums = [];
            if (aMatches && aMatches[1]) {
                const nums = (aMatches[1].match(/\d+/g) || []).map(n=>parseInt(n,10));
                const pvals = nums.filter((v, i) => i >= 3 && v > 5 && v <= 31).slice(0, 3);
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
    // debug
    console.log('DEBUG setsFromPairs=', setsFromPairs);
    console.log('DEBUG runs=', runs);
    console.log('DEBUG headerSets=', headerSets);

    if (setsFromPairs.length) report.sets = setsFromPairs.join(', ');
    else if (headerSets && headerSets.length) report.sets = headerSets.join(', ');
    else if (finalSets.length) report.sets = finalSets.join(', ');
    else report.sets = '';

    return report;
}

const out = parseMatchReport(text);
console.log('Parsed sets:', out.sets);
