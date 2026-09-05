(function () {
    let metadataPromise;
    let geometryPromise;

    function fetchMetadata() {
        if (!metadataPromise) metadataPromise = fetch(window.HorizonConfig.routeMetaUrl, { headers:{Accept:'application/json'} }).then((response)=>{if(!response.ok)throw new Error(`${window.HorizonI18n?.t?.('errors.routeMetadataUnavailable') || 'Route metadata unavailable'} (${response.status})`);return response.json();});
        return metadataPromise;
    }

    function fetchGeometry() {
        if (!geometryPromise) geometryPromise = fetch(window.HorizonConfig.routeGeoJsonUrl, { headers:{Accept:'application/geo+json,application/json'} })
            .then((response)=>{if(!response.ok)throw new Error(`${window.HorizonI18n?.t?.('errors.routeMetadataUnavailable') || 'Route geometry unavailable'} (${response.status})`);return response.json();});
        return geometryPromise;
    }

    function haversineKm(aLat, aLng, bLat, bLng) {
        const rad = Math.PI / 180;
        const dLat = (bLat - aLat) * rad;
        const dLng = (bLng - aLng) * rad;
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
        return 12742.0176 * Math.asin(Math.sqrt(Math.min(1, h)));
    }

    function getCoordinates(routeGeometry) {
        if (Array.isArray(routeGeometry)) return routeGeometry;
        if (routeGeometry?.type === 'LineString') return routeGeometry.coordinates || [];
        if (routeGeometry?.type === 'Feature' && routeGeometry.geometry?.type === 'LineString') return routeGeometry.geometry.coordinates || [];
        if (routeGeometry?.type === 'FeatureCollection') {
            const line = routeGeometry.features?.find((feature)=>feature?.geometry?.type === 'LineString');
            return line?.geometry?.coordinates || [];
        }
        return [];
    }

    function locateProgress(point, routeGeometry) {
        const lat = Number(point?.latitude ?? point?.lat);
        const lng = Number(point?.longitude ?? point?.lng ?? point?.lon);
        const coordinates = getCoordinates(routeGeometry);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || coordinates.length < 2) return null;

        const latRad = lat * Math.PI / 180;
        const kmPerLng = 111.320 * Math.cos(latRad);
        const kmPerLat = 110.574;
        let cumulativeKm = 0;
        let best = null;

        for (let i = 1; i < coordinates.length; i++) {
            const a = coordinates[i - 1];
            const b = coordinates[i];
            const aLng = Number(a?.[0]), aLat = Number(a?.[1]);
            const bLng = Number(b?.[0]), bLat = Number(b?.[1]);
            if (![aLng,aLat,bLng,bLat].every(Number.isFinite)) continue;

            const segmentKm = haversineKm(aLat, aLng, bLat, bLng);
            const ax = (aLng - lng) * kmPerLng;
            const ay = (aLat - lat) * kmPerLat;
            const bx = (bLng - lng) * kmPerLng;
            const by = (bLat - lat) * kmPerLat;
            const dx = bx - ax;
            const dy = by - ay;
            const len2 = dx * dx + dy * dy;
            const t = len2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
            const px = ax + dx * t;
            const py = ay + dy * t;
            const distanceKm = Math.sqrt(px * px + py * py);

            if (!best || distanceKm < best.distanceToRouteKm) {
                best = {
                    progressKm: cumulativeKm + segmentKm * t,
                    distanceToRouteKm: distanceKm,
                    segmentIndex: i - 1,
                    segmentFraction: t
                };
            }
            cumulativeKm += segmentKm;
        }

        return best ? { ...best, routeDistanceKm: cumulativeKm } : null;
    }

    window.HorizonRoute = { fetchMetadata, fetchGeometry, locateProgress };
})();
