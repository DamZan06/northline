(function () {
    // Single source of truth for both the public objectives page and the admin panel.
    const definitions = {
        cantons: [
            { key: 'sh', badgeId: 'csh', label: 'Schaffhausen', image: 'assets/Badge/Cantons/Badge_canton_sh.png' },
            { key: 'zh', badgeId: 'czh', label: 'Zürich', image: 'assets/Badge/Cantons/Badge_canton_zh.png' },
            { key: 'zg', badgeId: 'czg', label: 'Zug', image: 'assets/Badge/Cantons/Badge_canton_zg.png' },
            { key: 'lu', badgeId: 'clu', label: 'Lucerne', image: 'assets/Badge/Cantons/Badge_canton_lu.png' },
            { key: 'sz', badgeId: 'csz', label: 'Schwyz', image: 'assets/Badge/Cantons/Badge_canton_sz.png' },
            { key: 'ur', badgeId: 'cur', label: 'Uri', image: 'assets/Badge/Cantons/Badge_canton_ur.png' },
            { key: 'ti', badgeId: 'cti', label: 'Ticino', image: 'assets/Badge/Cantons/Badge_canton_ti.png' }
        ],
        passes: [
            { key: 'gotthard', badgeId: 'pgotthard', label: 'Gotthard Pass', image: 'assets/Badge/Mountains/Badge_mountain_gotthard.png', point: { latitude: 46.5593, longitude: 8.5612 } }
        ]
    };

    const normalize = (value) => String(value || '').trim().toLocaleLowerCase('en').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    function ordered(type) {
        const items = (definitions[type] || []).slice();
        const direction = window.HorizonConfig?.achievementDirection;
        if (direction === 'reverse') return items.reverse();
        if (direction === 'forward') return items;

        // This also lets the same code work for NorthLine in the opposite direction:
        // setting its start location to the other endpoint is sufficient.
        const start = normalize(window.HorizonConfig?.startLocation);
        const last = items.at(-1);
        return last && (start === normalize(last.key) || start.includes(normalize(last.label))) ? items.reverse() : items;
    }

    function progressThrough(type, currentKey) {
        const items = ordered(type);
        const index = items.findIndex((item) => item.key === normalize(currentKey));
        return index < 0 ? 0 : index + 1;
    }

    window.HorizonAchievements = { definitions, ordered, progressThrough };
})();
