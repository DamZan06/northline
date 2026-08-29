(function () {
    const SESSION_KEY = 'northline-visit-counted';
    const MAX_ATTEMPTS = 4;

    function getEndpoint() {
        const config = window.HorizonConfig || {};
        const base = String(config.contentDatabaseURL || '').replace(/\/$/, '');
        const path = String(config.contentDatabasePath || 'content').replace(/^\/+|\/+$/g, '');
        return base ? `${base}/${path}/siteStats/visits.json` : '';
    }

    function renderCount(value) {
        const count = Number(value);
        const container = document.getElementById('visitorCount');
        const output = document.getElementById('visitorCountValue');
        if (!container || !output || !Number.isFinite(count) || count < 0) return;
        output.dataset.value = String(count);
        output.textContent = new Intl.NumberFormat(document.documentElement.lang || 'en').format(count);
        container.hidden = false;
    }

    async function readCount(endpoint) {
        const response = await fetch(endpoint, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Visitor count read failed (${response.status})`);
        return Number(await response.json()) || 0;
    }

    async function incrementCount(endpoint) {
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
            const currentResponse = await fetch(endpoint, { cache: 'no-store', headers: { 'X-Firebase-ETag': 'true' } });
            if (!currentResponse.ok) throw new Error(`Visitor count read failed (${currentResponse.status})`);
            const current = Number(await currentResponse.json()) || 0;
            const etag = currentResponse.headers.get('ETag');
            if (!etag) throw new Error('Visitor count ETag is unavailable');
            const updateResponse = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'If-Match': etag },
                body: JSON.stringify(current + 1)
            });
            if (updateResponse.ok) return Number(await updateResponse.json()) || current + 1;
            if (updateResponse.status !== 412) throw new Error(`Visitor count update failed (${updateResponse.status})`);
        }
        return readCount(endpoint);
    }

    async function initialize() {
        const endpoint = getEndpoint();
        if (!endpoint) return;
        let alreadyCounted = false;
        try { alreadyCounted = sessionStorage.getItem(SESSION_KEY) === 'true'; } catch (error) { /* Storage may be unavailable. */ }
        try {
            const count = alreadyCounted ? await readCount(endpoint) : await incrementCount(endpoint);
            if (!alreadyCounted) {
                try { sessionStorage.setItem(SESSION_KEY, 'true'); } catch (error) { /* Storage may be unavailable. */ }
            }
            renderCount(count);
        } catch (error) {
            console.warn('[visitor-counter] Counter unavailable.', error);
        }
    }

    document.addEventListener('horizon:languagechange', () => {
        const value = document.getElementById('visitorCountValue')?.dataset.value;
        if (value) renderCount(value);
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
    else initialize();
})();
