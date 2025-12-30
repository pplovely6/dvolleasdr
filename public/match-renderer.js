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

    const isHome = match.home.toUpperCase().includes("DARDILLY");
    const isWin = isHome ? (homeScore > awayScore) : (awayScore > homeScore);

    const statusClass = isWin ? "status-win" : "status-loss";
    const badgeClass = isWin ? "badge-win" : "badge-loss";
    const badgeText = isWin ? "VICTOIRE" : "DÉFAITE";

    // Logo Logic
    const logoImg = `<img src="image_fd6867.png" class="team-logo" style="height:40px; width:auto;">`;
    const placeholder = (name) => `<div class="logo-placeholder" style="height:35px; width:35px; background:#252525; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.7rem; color:#555;">${name.substring(0, 3).toUpperCase()}</div>`;

    const homeDisplay = isHome ? logoImg : placeholder(match.home);
    const awayDisplay = !isHome ? logoImg : placeholder(match.away);

    // Tag for M18 Boys is m18-m
    const tag = "m18-m";

    return `
        <a href="match.html?id=${match.id}&tag=${tag}" style="text-decoration:none; display:block; margin-bottom:15px;">
            <div class="result-card ${statusClass}" style="margin:0; padding:15px; grid-template-columns: 80px 1fr 100px 1fr;">
                <div class="date-col" style="padding-right:15px;">
                    <div class="date-val" style="font-size:0.9rem;">${match.date}</div>
                    <div class="team-cat" style="font-size:0.7rem;">M18 GARÇONS</div>
                </div>

                <div class="team-col home" style="font-size:0.95rem;">
                    <span>${match.home}</span>
                    ${homeDisplay}
                </div>

                <div class="score-col">
                    <div class="final-score" style="font-size:1.8rem;">${match.score}</div>
                    <div class="score-sets" style="font-size:0.75rem;">${setsLine}</div>
                    <div class="result-badge ${badgeClass}" style="font-size:0.6rem;">${badgeText}</div>
                </div>

                <div class="team-col away" style="font-size:0.95rem;">
                    ${awayDisplay}
                    <span>${match.away}</span>
                </div>
            </div>
            ${playerPoints ? `
                <div style="background:#222; padding:5px 15px; border-radius:0 0 6px 6px; border:1px solid #333; border-top:none; display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; color:#aaa; width:90%; margin:0 auto; transform:translateY(-2px);">
                    <span><i class="fa-solid fa-star" style="color:var(--brand-yellow)"></i> Performance Joueur</span>
                    <span style="color:white; font-weight:bold;">${playerPoints} Pts</span>
                </div>
            ` : ''}
        </a>
    `;
}