(function () {
    const config = {
        projectName: 'NorthLine 2.0',
        expeditionYear: 2026,
        startDateIso: '2026-08-31T04:00:00+02:00',
        startLocation: 'Bargen',
        finishLocation: 'Chiasso',
        achievementDirection: 'forward',
        expectedDistanceKm: 300,
        expectedElevationM: 7000,
        routeGpxUrl: 'data/route/NorthLine.gpx',
        routeGeoJsonUrl: 'data/route/horizon-route.geojson',
        routeMetaUrl: 'data/route/horizon-route-meta.json',
        // Current public tracker backend; kept separate from the public NorthLine 2.0 branding.
        firebaseURL: 'https://northline-a4eaa-default-rtdb.europe-west1.firebasedatabase.app/livetrack/points.json',
        contentDatabaseURL: 'https://northline-a4eaa-default-rtdb.europe-west1.firebasedatabase.app',
        contentDatabasePath: 'content',
        defaultCenter: [46.6, 10.4],
        defaultZoom: 12,
        adminSessionKey: 'horizon-admin-authenticated',
        supportedLanguages: ['en', 'it', 'de', 'fr'],
        defaultLanguage: 'en',
        languageStorageKey: 'horizon-language',
        staleDataThresholdMs: 180000
    };

    window.HorizonConfig = Object.assign(window.HorizonConfig || {}, config);
})();
