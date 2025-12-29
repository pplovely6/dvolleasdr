document.addEventListener("DOMContentLoaded", () => {
    const containers = document.querySelectorAll("[data-match-container]");
    
    // Updated to use the full backend API URL
    fetch("http://localhost:3000/api/data/matches-db")
        .then(res => res.json())
        .then(data => {
            containers.forEach(container => {
                const limit = parseInt(container.dataset.limit) || 3;
                const playerPoints = JSON.parse(container.dataset.playerPoints || "{}");
                container.innerHTML = ""; 

                [...data.matches].reverse().slice(0, limit).forEach(match => {
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