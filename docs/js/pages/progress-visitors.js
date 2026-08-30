(function () {
    const badgeBase = 'assets/Badge/Visitors/';
    const translations = {
        en: {
            'progress.visitors.title': 'Visitors',
            'progress.visitors.description': 'Community milestones reached as more people discover and follow NorthLine 2.0.',
            'progress.visitors.achievement': 'Visitor achievement',
            'progress.badges.v10': 'First 10 visitors',
            'progress.badges.v25': '25 visitors',
            'progress.badges.v50': '50 visitors',
            'progress.badges.v100': '100 visitors',
            'progress.badges.v175': '175 visitors · Legendary'
        },
        it: {
            'progress.visitors.title': 'Visitatori',
            'progress.visitors.description': 'Traguardi della community sbloccati man mano che sempre più persone scoprono e seguono NorthLine 2.0.',
            'progress.visitors.achievement': 'Obiettivo visitatori',
            'progress.badges.v10': 'Primi 10 visitatori',
            'progress.badges.v25': '25 visitatori',
            'progress.badges.v50': '50 visitatori',
            'progress.badges.v100': '100 visitatori',
            'progress.badges.v175': '175 visitatori · Leggendario'
        },
        de: {
            'progress.visitors.title': 'Besucher',
            'progress.visitors.description': 'Community-Meilensteine, die freigeschaltet werden, wenn immer mehr Menschen NorthLine 2.0 entdecken und verfolgen.',
            'progress.visitors.achievement': 'Besucher-Erfolg',
            'progress.badges.v10': 'Die ersten 10 Besucher',
            'progress.badges.v25': '25 Besucher',
            'progress.badges.v50': '50 Besucher',
            'progress.badges.v100': '100 Besucher',
            'progress.badges.v175': '175 Besucher · Legendär'
        },
        fr: {
            'progress.visitors.title': 'Visiteurs',
            'progress.visitors.description': 'Des étapes communautaires débloquées à mesure que davantage de personnes découvrent et suivent NorthLine 2.0.',
            'progress.visitors.achievement': 'Objectif visiteurs',
            'progress.badges.v10': 'Les 10 premiers visiteurs',
            'progress.badges.v25': '25 visiteurs',
            'progress.badges.v50': '50 visiteurs',
            'progress.badges.v100': '100 visiteurs',
            'progress.badges.v175': '175 visiteurs · Légendaire'
        }
    };

    let visitorCount = 0;

    function installTranslations() {
        const i18n = window.HorizonI18n;
        if (!i18n || typeof i18n.t !== 'function' || i18n.__northlineVisitorBadges) return;
        const original = i18n.t.bind(i18n);
        i18n.t = function (key) {
            const language = document.documentElement.lang || 'en';
            return translations[language]?.[key] || translations.en[key] || original(key);
        };
        i18n.__northlineVisitorBadges = true;
    }

    function getEndpoint() {
        const config = window.HorizonConfig || {};
        const base = String(config.contentDatabaseURL || '').replace(/\/$/, '');
        const path = String(config.contentDatabasePath || 'content').replace(/^\/+|\/+$/g, '');
        return base ? `${base}/${path}/siteStats/visits.json` : '';
    }

    async function loadVisitorCount() {
        const endpoint = getEndpoint();
        if (!endpoint) return;
        try {
            const response = await fetch(endpoint, { cache: 'no-store' });
            if (!response.ok) return;
            visitorCount = Math.max(0, Number(await response.json()) || 0);
            window.HorizonProgress?.refresh?.();
        } catch (error) {
            console.warn('[progress-visitors] Visitor count unavailable.', error);
        }
    }

    installTranslations();

    const category = {
        id: 'visitors',
        max: 175,
        unit: '',
        value: () => visitorCount,
        b: [
            ['v10', 10, 'First 10 visitors', `${badgeBase}visitor-10.png`],
            ['v25', 25, '25 visitors', `${badgeBase}visitor-25.png`],
            ['v50', 50, '50 visitors', `${badgeBase}visitor-50.png`],
            ['v100', 100, '100 visitors', `${badgeBase}visitor-100.png`],
            ['v175', 175, '175 visitors · Legendary', `${badgeBase}visitor-175.png`]
        ]
    };

    const categories = window.HorizonProgress?.categories;
    if (Array.isArray(categories) && !categories.some((item) => item.id === category.id)) {
        const passesIndex = categories.findIndex((item) => item.id === 'passes');
        categories.splice(passesIndex >= 0 ? passesIndex + 1 : categories.length, 0, category);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadVisitorCount, { once: true });
    else loadVisitorCount();
})();
