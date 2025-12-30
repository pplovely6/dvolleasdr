document.addEventListener("DOMContentLoaded", () => {
    const containers = document.querySelectorAll("[data-match-container]");

    // Updated to use relative path for API
    fetch("/api/data/matches-db")
        .then(res => res.json())
        .then(data => {
            // parse date robustly
            function parseDateString(s) {
                if (!s) return NaN;
                s = s.toString().trim();
                // Try Date constructor first (handles '10 JAN 2026' and ISO)
                const byCtor = new Date(s);
                if (!isNaN(byCtor)) return byCtor.getTime();
                // Digit parts like 11/10/25 or 6/12/2025
                const parts = s.match(/\d+/g);
                if (parts && parts.length >= 3) {
                    let day = parts[0], month = parts[1], year = parts[2];
                    if (year.length === 2) year = '20' + year;
                    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)).getTime();
                }
                // Fallback: try parsing month names (e.g. '10 JAN 2026')
                const tokens = s.split(/\s+/);
                if (tokens.length >= 3) {
                    const mnames = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
                    const day = parseInt(tokens[0], 10);
                    const mon = tokens[1].toLowerCase().slice(0, 3);
                    const yearT = tokens[2];
                    const month = mnames[mon];
                    const year = (yearT && yearT.length === 2) ? parseInt('20' + yearT, 10) : parseInt(yearT, 10);
                    if (!isNaN(day) && month !== undefined && !isNaN(year)) return new Date(year, month, day).getTime();
                }
                return NaN;
            }

            containers.forEach(container => {
                const limit = parseInt(container.dataset.limit) || 3;
                const playerPoints = JSON.parse(container.dataset.playerPoints || "{}");
                container.innerHTML = "";

                const matches = Array.isArray(data.matches) ? data.matches.slice() : [];
                matches.sort((a, b) => {
                    const da = parseDateString(a.date);
                    const db = parseDateString(b.date);
                    return (db || 0) - (da || 0); // newest first
                });

                matches.slice(0, limit).forEach(match => {
                    const points = playerPoints[match.id] || null;
                    container.innerHTML += renderVWCard(match, points);
                });
            });
        })
        .catch(err => console.error("Backend unreachable:", err));
});

// renderVWCard function remains the same as previously implemented
// renderVWCard updated to match results.html design
function renderVWCard(match, playerPoints) {
    const setsLine = Array.isArray(match.sets) ? match.sets.join(" | ") : match.sets;

    // Determine winners
    const scores = (match.score || "0-0").split(/[-:]/).map(s => parseInt(s.trim()));
    const homeScore = scores[0] || 0;
    const awayScore = scores[1] || 0;

    const isHome = (match.home || "").toUpperCase().includes("DARDILLY");
    const isWin = isHome ? (homeScore > awayScore) : (awayScore > homeScore);

    const statusClass = isWin ? "status-win" : "status-loss";
    const badgeClass = isWin ? "badge-win" : "badge-loss";
    const badgeText = isWin ? "VICTOIRE" : "DÉFAITE";

    // Logo Logic
    const logoImg = `<img src="image_fd6867.png" class="team-logo">`;
    const placeholder = (name) => `<div class="logo-placeholder">${name ? name.substring(0, 2).toUpperCase() : '??'}</div>`;

    const homeDisplay = isHome ? logoImg : placeholder(match.home);
    const awayDisplay = !isHome ? logoImg : placeholder(match.away);

    // Tag for linking
    const tag = "m18-m";

    return `
        <a href="match.html?id=${match.id}&tag=${tag}" style="text-decoration:none; display:block; margin-bottom:20px;">
            <div class="result-card ${statusClass}" style="margin:0;">
                <div class="date-col">
                    <div class="date-val">${match.date}</div>
                    <div class="team-cat">M18 GARÇONS</div>
                </div>

                <div class="team-col home">
                    <span>${match.home}</span>
                    ${homeDisplay}
                </div>

                <div class="score-col">
                    <div class="final-score" style="font-family:var(--font-head);">${match.score}</div>
                    <div class="score-sets">${setsLine}</div>
                    <div class="result-badge ${badgeClass}">${badgeText}</div>
                </div>

                <div class="team-col away">
                    ${awayDisplay}
                    <span>${match.away}</span>
                </div>
            </div>
            ${playerPoints ? `
                <div style="background:#1a1d24; padding:10px 20px; border-radius:0 0 8px 8px; border:1px solid #333; border-top:none; display:flex; justify-content:space-between; align-items:center; font-size:0.9rem; margin-top:-2px; position:relative; z-index:1;">
                    <span style="color:#aaa;"><i class="fa-solid fa-star" style="color:var(--brand-yellow); margin-right:8px;"></i>Performance Joueur</span>
                    <span style="color:white; font-weight:800; font-family:var(--font-head);">${playerPoints} Pts</span>
                </div>
            ` : ''}
        </a>
    `;
}