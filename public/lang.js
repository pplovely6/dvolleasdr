/**
 * AS DARDILLY - Translation Script
 * Handles text replacement and language switching.
 */

const translations = {
    // --- MAIN NAVIGATION ---
    "nav_home": { "fr": "Accueil", "en": "Home" },
    "nav_teams": { "fr": "Les Équipes", "en": "Teams" },
    "nav_beach": { "fr": "Beach Volley", "en": "Beach Volleyball" },
    "nav_register": { "fr": "S'inscrire", "en": "Register" },
    "nav_contact": { "fr": "Contact", "en": "Contact" },

    // --- BUTTONS & UI ---
    "btn_join": { "fr": "Rejoindre", "en": "Join Us" },
    "btn_back": { "fr": "<i class='fa-solid fa-arrow-left'></i> Retour Équipe", "en": "<i class='fa-solid fa-arrow-left'></i> Back to Team" },
    "btn_see_team": { "fr": "Voir l'Équipe <i class='fa-solid fa-arrow-right'></i>", "en": "See Team <i class='fa-solid fa-arrow-right'></i>" },

    // --- HOME PAGE & HERO ---
    "hero_title": { 
        "fr": "Un Club,<br><span style='color: var(--brand-yellow); font-weight: 800;'>Une Passion</span>", 
        "en": "One Club,<br><span style='color: var(--brand-yellow); font-weight: 800;'>One Passion</span>" 
    },
    "hero_subtitle": { "fr": "AS Dardilly Volley-Ball • Depuis 1944", "en": "AS Dardilly Volleyball • Since 1944" },

    // --- TEAM PAGE SECTIONS ---
    "roster_title": { "fr": "EFFECTIF", "en": "ROSTER" },
    "matches_title": { "fr": "DERNIERS MATCHS", "en": "LATEST MATCHES" },
    "planning_title": { "fr": "PLANNING", "en": "SCHEDULE" },
    "gyms_title": { "fr": "GYMNASES", "en": "GYMNASIUMS" },

    // --- FOOTER ---
    "footer_club": { "fr": "Le Club", "en": "The Club" },
    "footer_practical": { "fr": "Pratique", "en": "Practical" },
    "footer_links": { "fr": "Liens Utiles", "en": "Useful Links" },
    "footer_planning": { "fr": "Planning", "en": "Schedule" },
    "footer_gyms": { "fr": "Gymnases", "en": "Gyms" },
    "footer_rights": { "fr": "© 2025 AS Dardilly Volley. Tous droits réservés.", "en": "© 2025 AS Dardilly Volley. All rights reserved." },
    // TEAM
    "boy_garcon": { "fr": "Garcons", "en": "Boys" },
    "prochain_match_card": { "fr": "PROCHAIN MATCH", "en": "NEXT MATCH" },
};

/**
 * GLOBAL FUNCTION: setLanguage
 * Attached to 'window' so HTML buttons can call onclick="window.setLanguage('fr')"
 */
window.setLanguage = function(lang) {
    // 1. Save preference
    localStorage.setItem('language', lang);
    
    // 2. Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        
        if (translations[key]) {
            // If the translation contains HTML tags (like <br> or <span>), use innerHTML
            if (translations[key][lang].includes('<')) {
                element.innerHTML = translations[key][lang];
            } else {
                element.textContent = translations[key][lang];
            }
        }
    });

    // 3. Update active state of buttons (Visual feedback)
    updateButtonStyles(lang);
};

// Helper to style the FR/EN buttons if they exist
function updateButtonStyles(lang) {
    // Looks for buttons that might trigger the language change
    const frBtns = document.querySelectorAll("button[onclick*='fr']");
    const enBtns = document.querySelectorAll("button[onclick*='en']");

    frBtns.forEach(btn => btn.style.opacity = (lang === 'fr' ? '1' : '0.5'));
    enBtns.forEach(btn => btn.style.opacity = (lang === 'en' ? '1' : '0.5'));
}

/**
 * INITIALIZATION
 * Runs when the page finishes loading
 */
document.addEventListener("DOMContentLoaded", () => {
    // 1. Determine language (Local Storage > Browser Default > Fallback to FR)
    const savedLang = localStorage.getItem('language') || (navigator.language.startsWith('en') ? 'en' : 'fr');
    
    // 2. Apply language immediately
    window.setLanguage(savedLang);

    // 3. Mobile Menu Logic (Burger Menu)
    const toggleBtn = document.getElementById('mobile-toggle-btn'); // Ensure your HTML has this ID on the burger
    const nav = document.getElementById('main-nav'); // Ensure your HTML has this ID on the nav ul
    
    if (toggleBtn && nav) {
        toggleBtn.addEventListener('click', () => {
            nav.classList.toggle('mobile-open');
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                if (nav.classList.contains('mobile-open')) {
                    icon.classList.replace('fa-bars', 'fa-xmark');
                } else {
                    icon.classList.replace('fa-xmark', 'fa-bars');
                }
            }
        });
    } else {
        // Fallback for different HTML structure (class based)
        const burger = document.querySelector('.burger');
        const navLinks = document.querySelector('.nav-links');
        if (burger && navLinks) {
            burger.addEventListener('click', () => {
                navLinks.classList.toggle('active');
            });
        }
    }
});