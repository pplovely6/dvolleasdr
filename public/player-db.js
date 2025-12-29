document.addEventListener("DOMContentLoaded", () => {
    const list = document.getElementById("roster-list");
    if (!list) return;

    // 1. Determine which team to load based on current page or default
    // You can create different variables for m15, seniors, etc.
    const TEAM_FILE = "db-m18-garcons"; 

    fetch(`http://localhost:3000/api/data/${TEAM_FILE}`)
        .then(res => res.json())
        .then(data => {
            list.innerHTML = "";
            
            // 2. Filter & Sort Players
            const validPlayers = data.players
                .filter(p => p.number && p.name)
                .sort((a,b) => a.number - b.number);

            // 3. Generate HTML
            validPlayers.forEach(p => {
                const row = document.createElement("a");
                row.href = p.profile || "#";
                row.className = "roster-row";
                
                // Use the abbreviation (e.g., "S", "OH") as the lookup key
                const positionKey = p.position || "";

                row.innerHTML = `
                    <span class="num">${p.number}</span>
                    <span>${p.name} ${p.captain ? '<span class="captain">C</span>' : ''}</span>
                    <span class="pos" data-i18n="${positionKey}">${positionKey}</span>
                    <i class="fa-solid fa-chevron-right"></i>
                `;
                list.appendChild(row);
            });

            // 4. CRITICAL: Trigger translation AFTER list is built
            const currentLang = localStorage.getItem('language') || 'fr';
            if (window.setLanguage) {
                window.setLanguage(currentLang);
            }
        })
        .catch(err => console.error("Error loading roster:", err));
});