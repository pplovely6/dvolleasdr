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
                    return new Date(parseInt(year,10), parseInt(month,10) - 1, parseInt(day,10)).getTime();
                }
                // Fallback: try parsing month names (e.g. '10 JAN 2026')
                const tokens = s.split(/\s+/);
                if (tokens.length >= 3) {
                    const mnames = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
                    const day = parseInt(tokens[0],10);
                    const mon = tokens[1].toLowerCase().slice(0,3);
                    const yearT = tokens[2];
                    const month = mnames[mon];
                    const year = (yearT && yearT.length===2) ? parseInt('20'+yearT,10) : parseInt(yearT,10);
                    if (!isNaN(day) && month !== undefined && !isNaN(year)) return new Date(year, month, day).getTime();
                }
                return NaN;
            }

            containers.forEach(container => {
                const limit = parseInt(container.dataset.limit) || 3;
                const playerPoints = JSON.parse(container.dataset.playerPoints || "{}");
                container.innerHTML = "";

                const matches = Array.isArray(data.matches) ? data.matches.slice() : [];
                matches.sort((a,b) => {
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
function renderVWCard(match, playerPoints) {
    const setsLine = Array.isArray(match.sets) ? match.sets.join(" ") : match.sets;
    
    // Determine winners for opacity (0-3 -> scores[0]=0, scores[1]=3)
    const scores = match.score.split('-').map(s => parseInt(s.trim()));
    const homeWin = scores[0] > scores[1];
    const awayWin = scores[1] > scores[0];

    // Logo Logic: Only show logo if the team name is AS DARDILLY
    const homeLogo = match.home.includes("DARDILLY") ? '<img src="image_fd6867.png" class="mini-logo-v3">' : '<div class="logo-spacer"></div>';
    const awayLogo = match.away.includes("DARDILLY") ? '<img src="image_fd6867.png" class="mini-logo-v3">' : '<div class="logo-spacer"></div>';

    return `
        <div class="match-card-v3">
            <div class="match-main-v3">
                <div class="match-header-v3">
                    <span class="m-category-tag">${match.category}</span>
                    <span class="m-date-v3">${match.date}</span>
                </div>
                <div class="match-body-v3">
                    <div class="m-teams-col">
                        <div class="m-team-row ${homeWin ? 'winner' : 'loser'}">
                            ${homeLogo}
                            <span>${match.home}</span>
                        </div>
                        <div class="m-team-row ${awayWin ? 'winner' : 'loser'}">
                            ${awayLogo}
                            <span>${match.away}</span>
                        </div>
                    </div>
                    <div class="m-score-col">
                        <div class="m-score-main-v3">${match.score.replace('-', ' - ')}</div>
                        <div class="m-sets-v3">${setsLine}</div>
                    </div>
                </div>
            </div>
            ${playerPoints ? `
                <div class="m-scorers-v3">
                    <div class="perf-label">PERFORMANCE</div>
                    <div class="scorer-row">
                        <span>Points Marqués</span>
                        <span class="scorer-pts">${playerPoints}</span>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}