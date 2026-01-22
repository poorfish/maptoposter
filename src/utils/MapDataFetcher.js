/**
 * MapDataFetcher - Utility to fetch OpenStreetMap data from Overpass API
 * 
 * Fetches roads, water bodies, and parks for a given location and radius.
 * Implements caching and rate limiting to avoid excessive API calls.
 */

// Multiple Overpass API instances to rotate between
const OVERPASS_SERVERS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.openstreetmap.ru/api/interpreter',
    'https://overpass.nchc.org.tw/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
];

// Server health tracking for Strategy 4
const serverHealth = {};
OVERPASS_SERVERS.forEach(server => {
    serverHealth[server] = {
        failures: 0,
        lastFailure: 0,
        lastSuccess: Date.now()
    };
});

let currentServerIndex = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const REQUEST_DELAY = 1000; // 1s delay

// Simple in-memory cache
const cache = new Map();
let lastRequestTime = 0;

/**
 * Build a single combined Overpass QL query for all data types
 */
function buildCombinedQuery(lat, lon, radius) {
    return `
        [out:json][timeout:60];
        (
            way["highway"~"motorway|trunk|primary|secondary|tertiary|residential|service|unclassified"](around:${radius},${lat},${lon});
            way["natural"="water"](around:${radius},${lat},${lon});
            way["waterway"~"river|stream|canal"](around:${radius},${lat},${lon});
            relation["natural"="water"](around:${radius},${lat},${lon});
            way["leisure"="park"](around:${radius},${lat},${lon});
            way["landuse"~"grass|forest|recreation_ground"](around:${radius},${lat},${lon});
        );
        out geom;
    `;
}

function buildMajorFeaturesQuery(lat, lon, radius) {
    // Stage 1 Slim: Only infrastructure that defines the core map
    const coreRoads = "motorway|trunk|primary"; // Removed secondary to Stage 2
    return `
        [out:json][timeout:15][maxsize:268435456];
        (
            way["highway"~"${coreRoads}"](around:${radius},${lat},${lon});
            way["natural"="water"](around:${radius},${lat},${lon});
            way["waterway"~"river|stream|canal"](around:${radius},${lat},${lon});
            way["leisure"="park"](around:${radius},${lat},${lon});
        );
        out geom;
    `;
}

/**
 * Build query for minor roads (Stage 2: detail loading)
 * Fetches: tertiary, residential, service, unclassified roads
 * 
 * @param {boolean} aggressive - If true, only fetch tertiary + residential (skip service/unclassified)
 */
function buildMinorRoadsQuery(lat, lon, radius, aggressive = false) {
    // Strategy: Catch everything Stage 1 missed + minor roads
    const secondaryRoads = "secondary";
    const minorRoads = aggressive
        ? "tertiary|residential"
        : "tertiary|residential|service|unclassified";

    return `
        [out:json][timeout:20][maxsize:536870912];
        (
            way["highway"~"${secondaryRoads}|${minorRoads}"](around:${radius},${lat},${lon});
            relation["natural"="water"](around:${radius},${lat},${lon});
            way["landuse"~"grass|forest|recreation_ground"](around:${radius},${lat},${lon});
        );
        out geom;
    `;
}

/**
 * Strategy 3: Build batched queries for specific road types
 * Allows incremental loading by road importance
 */
function buildRoadTypeQuery(lat, lon, radius, roadType) {
    return `
        [out:json][timeout:15];
        (
            way["highway"~"${roadType}"](around:${radius},${lat},${lon});
        );
        out geom;
    `;
}


/**
 * Douglas-Peucker algorithm for geometry simplification
 */
function simplifyGeometry(points, tolerance = 0.00001) {
    if (points.length <= 2) return points;

    const sqTolerance = tolerance * tolerance;

    function getSqDist(p1, p2) {
        const dx = p1.lon - p2.lon;
        const dy = p1.lat - p2.lat;
        return dx * dx + dy * dy;
    }

    function getSqSegDist(p, p1, p2) {
        let x = p1.lon, y = p1.lat;
        let dx = p2.lon - x, dy = p2.lat - y;

        if (dx !== 0 || dy !== 0) {
            let t = ((p.lon - x) * dx + (p.lat - y) * dy) / (dx * dx + dy * dy);
            if (t > 1) {
                x = p2.lon; y = p2.lat;
            } else if (t > 0) {
                x += dx * t; y += dy * t;
            }
        }
        dx = p.lon - x; dy = p.lat - y;
        return dx * dx + dy * dy;
    }

    function simplifyStep(points, first, last, sqTolerance, simplified) {
        let maxSqDist = sqTolerance;
        let index;

        for (let i = first + 1; i < last; i++) {
            const sqDist = getSqSegDist(points[i], points[first], points[last]);
            if (sqDist > maxSqDist) {
                index = i;
                maxSqDist = sqDist;
            }
        }

        if (maxSqDist > sqTolerance) {
            if (index - first > 1) simplifyStep(points, first, index, sqTolerance, simplified);
            simplified.push(points[index]);
            if (last - index > 1) simplifyStep(points, index, last, sqTolerance, simplified);
        }
    }

    const simplified = [points[0]];
    simplifyStep(points, 0, points.length - 1, sqTolerance, simplified);
    simplified.push(points[points.length - 1]);
    return simplified;
}

/**
 * Filter elements by type from the combined result
 */
function processElements(elements) {
    let roads = [];
    const water = [];
    const parks = [];

    // Optimization settings
    const MIN_PARK_NODES = 3;
    const SIMPLIFY_TOLERANCE = 0.00002; // Roughly 2 meters
    const DENSE_THRESHOLD = 5000;

    // If data is too dense, we filter out minor roads to keep performance high
    const isVeryDense = elements.length > DENSE_THRESHOLD;
    if (isVeryDense) {
        console.warn(`[MapDataFetcher] Data is very dense (${elements.length} elements). Applying aggressive filtering.`);
    }

    elements.forEach(el => {
        const tags = el.tags || {};
        if (!el.geometry || el.geometry.length < 2) return;

        if (tags.highway) {
            // In dense areas, skip service and unclassified roads
            if (isVeryDense && (tags.highway === 'service' || tags.highway === 'unclassified')) {
                return;
            }

            // Skip extremely short roads (parking lot segments etc)
            if (el.geometry.length < 3 && (tags.highway === 'service' || tags.highway === 'unclassified')) {
                return;
            }

            // Simplify geometry to reduce SVG complexity
            el.geometry = simplifyGeometry(el.geometry, SIMPLIFY_TOLERANCE);
            roads.push(el);
        } else if (tags.natural === 'water' || tags.waterway || tags.water || el.type === 'relation') {
            el.geometry = simplifyGeometry(el.geometry, SIMPLIFY_TOLERANCE);
            water.push(el);
        } else if (tags.leisure === 'park' || tags.landuse === 'grass' || tags.landuse === 'forest' || tags.landuse === 'recreation_ground') {
            if (el.geometry.length >= MIN_PARK_NODES) {
                el.geometry = simplifyGeometry(el.geometry, SIMPLIFY_TOLERANCE);
                parks.push(el);
            }
        }
    });

    return { roads, water, parks };
}

/**
 * Delay execution to respect rate limits
 */
async function respectRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < REQUEST_DELAY) {
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY - timeSinceLastRequest));
    }

    lastRequestTime = Date.now();
}

/**
 * Fetch data from Overpass API with retry mechanism and server rotation
 */
async function fetchFromOverpass(query, retries = 3, backoff = 2000) {
    await respectRateLimit();

    // Strategy 4: Find the healthiest server
    // Sort servers by failures and then by lastFailure time
    const sortedServers = [...OVERPASS_SERVERS].sort((a, b) => {
        const healthA = serverHealth[a];
        const healthB = serverHealth[b];
        if (healthA.failures !== healthB.failures) return healthA.failures - healthB.failures;
        return healthA.lastFailure - healthB.lastFailure;
    });

    const server = sortedServers[0];
    const serverIndex = OVERPASS_SERVERS.indexOf(server);
    currentServerIndex = serverIndex; // Update the global index for continuity

    try {
        console.log(`[MapDataFetcher] Requesting from server: ${server}`);
        const response = await fetch(server, {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        if (response.status === 429 || response.status === 504 || response.status === 502) {
            serverHealth[server].failures++;
            serverHealth[server].lastFailure = Date.now();

            if (retries > 0) {
                console.warn(`[MapDataFetcher] ${response.status} on ${server}. Retrying in ${backoff}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoff));
                return fetchFromOverpass(query, retries - 1, backoff * 1.5);
            }
            throw new Error(`Server ${server} reported ${response.status}`);
        }

        if (!response.ok) {
            serverHealth[server].failures++;
            serverHealth[server].lastFailure = Date.now();
            let errorMsg = `Overpass API error: ${response.status} ${response.statusText}`;
            throw new Error(errorMsg);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            serverHealth[server].failures++;
            serverHealth[server].lastFailure = Date.now();
            throw new Error('Invalid response format');
        }

        const data = await response.json();

        // Success! Reset failures for this server
        serverHealth[server].failures = 0;
        serverHealth[server].lastSuccess = Date.now();

        return data.elements || [];
    } catch (error) {
        serverHealth[server].failures++;
        serverHealth[server].lastFailure = Date.now();

        if (retries > 0) {
            console.warn(`[MapDataFetcher] Connection error with ${server}. Retrying in ${backoff}ms...`, error.message);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchFromOverpass(query, retries - 1, backoff * 1.5);
        }
        throw error;
    }
}

/**
 * Generate cache key
 */
function getCacheKey(lat, lon, distance) {
    return `combined_${lat.toFixed(4)}_${lon.toFixed(4)}_${distance}`;
}

/**
 * Calculate consistent bounds based on requested center and radius
 */
function getRequestBounds(lat, lon, radius) {
    // 1 degree of latitude is approximately 111,320 meters
    const latDiff = radius / 111320;
    // 1 degree of longitude is approximately 111,320 * cos(lat) meters
    const lonDiff = radius / (111320 * Math.cos(lat * Math.PI / 180));

    return {
        minLat: lat - latDiff,
        maxLat: lat + latDiff,
        minLon: lon - lonDiff,
        maxLon: lon + lonDiff
    };
}

/**
 * Main function to fetch all OSM data for a location
 */
export async function fetchOSMData(lat, lon, distance) {
    const cacheKey = getCacheKey(lat, lon, distance);

    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`[MapDataFetcher] Using cached combined data`);
        return cached.data;
    }

    try {
        console.log(`[MapDataFetcher] Fetching combined OSM data for (${lat}, ${lon}) with radius ${distance}m`);

        // Fetch slightly more to ensure the square bounding box is filled.
        // For a 600x800 poster, the diagonal is ~1.33x the radius.
        // 1.35x is sufficient and much more efficient than 1.5x.
        const fetchRadius = distance * 1.35;
        const query = buildCombinedQuery(lat, lon, fetchRadius);
        const elements = await fetchFromOverpass(query);

        const { roads, water, parks } = processElements(elements);

        // Use fixed bounds based on the request to ensure perfect centering
        const bounds = getRequestBounds(lat, lon, distance);

        console.log(`[MapDataFetcher] Processed ${roads.length} roads, ${water.length} water features, ${parks.length} parks`);

        const result = {
            roads,
            water,
            parks,
            bounds,
        };

        cache.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
        });

        return result;
    } catch (error) {
        console.error('[MapDataFetcher] Error fetching OSM data:', error);
        throw error;
    }
}

/**
 * Progressive fetch - loads data in two stages for better UX
 * Stage 1: Major roads + water + parks (quick preview)
 * Stage 2: Minor roads (detailed completion)
 * 
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude  
 * @param {number} distance - Radius in meters
 * @param {Function} onProgress - Callback function (stage, data) => void
 *   - stage: 'major' | 'complete'
 *   - data: { roads, water, parks, bounds }
 * @returns {Promise<Object>} Complete data
 */
export async function fetchOSMDataProgressive(lat, lon, distance, onProgress) {
    const cacheKey = getCacheKey(lat, lon, distance);

    // Check for complete cached data first
    const cachedComplete = cache.get(cacheKey + '_complete');
    if (cachedComplete && Date.now() - cachedComplete.timestamp < CACHE_DURATION) {
        console.log('[MapDataFetcher] Using complete cached data');
        if (onProgress) onProgress('complete', cachedComplete.data);
        return cachedComplete.data;
    }

    // Check for partial cached data (major features only)
    const cachedMajor = cache.get(cacheKey + '_major');
    if (cachedMajor && Date.now() - cachedMajor.timestamp < CACHE_DURATION) {
        console.log('[MapDataFetcher] Using cached major features, fetching minor roads...');
        if (onProgress) onProgress('major', cachedMajor.data);

        // Continue to fetch minor roads in background
        try {
            const fetchRadius = distance * 1.35;
            const minorQuery = buildMinorRoadsQuery(lat, lon, fetchRadius);
            const minorElements = await fetchFromOverpass(minorQuery);
            const { roads: minorRoads } = processElements(minorElements);

            const completeData = {
                ...cachedMajor.data,
                roads: [...cachedMajor.data.roads, ...minorRoads]
            };

            // Cache complete data
            cache.set(cacheKey + '_complete', {
                data: completeData,
                timestamp: Date.now()
            });

            console.log(`[MapDataFetcher] Progressive complete: ${cachedMajor.data.roads.length} major + ${minorRoads.length} minor roads`);

            if (onProgress) onProgress('complete', completeData);
            return completeData;
        } catch (error) {
            // If minor roads fail, return major roads only
            console.warn('[MapDataFetcher] Failed to fetch minor roads, using major roads only:', error);
            return cachedMajor.data;
        }
    }

    try {
        const fetchRadius = distance * 1.35;
        const bounds = getRequestBounds(lat, lon, distance);

        // Stage 1: Fetch major features (fast)
        console.log('[MapDataFetcher] Stage 1: Fetching major features...');
        const majorQuery = buildMajorFeaturesQuery(lat, lon, fetchRadius);
        const majorElements = await fetchFromOverpass(majorQuery);
        const { roads: majorRoads, water, parks } = processElements(majorElements);

        const majorData = {
            roads: majorRoads,
            water,
            parks,
            bounds
        };

        // Cache major features
        cache.set(cacheKey + '_major', {
            data: majorData,
            timestamp: Date.now()
        });

        console.log(`[MapDataFetcher] Stage 1 complete: ${majorRoads.length} major roads, ${water.length} water, ${parks.length} parks`);

        // Notify progress callback
        if (onProgress) {
            onProgress('major', majorData);
        }

        // Stage 2: Fetch minor roads (background) with graceful degradation
        try {
            // Add small delay between stages to reduce server load
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Use aggressive mode for very dense areas to reduce server load
            const isDense = majorElements.length > 8000;
            if (isDense) {
                console.log('[MapDataFetcher] Dense area detected, using aggressive sampling for Stage 2');
            }

            console.log('[MapDataFetcher] Stage 2: Fetching minor roads...');
            const minorQuery = buildMinorRoadsQuery(lat, lon, fetchRadius, isDense);
            const minorElements = await fetchFromOverpass(minorQuery);
            const { roads: minorRoads } = processElements(minorElements);

            // Merge data
            const completeData = {
                roads: [...majorRoads, ...minorRoads],
                water,
                parks,
                bounds
            };

            console.log(`[MapDataFetcher] Stage 2 complete: ${minorRoads.length} minor roads added. Total: ${completeData.roads.length} roads`);

            // Cache complete data
            cache.set(cacheKey + '_complete', {
                data: completeData,
                timestamp: Date.now()
            });

            // Notify completion
            if (onProgress) {
                onProgress('complete', completeData);
            }

            return completeData;
        } catch (stage2Error) {
            // Graceful degradation: If Stage 2 fails, return Stage 1 data but notify UI of error
            console.warn('[MapDataFetcher] Stage 2 failed:', stage2Error.message);

            if (onProgress) {
                onProgress('error', majorData, stage2Error);
            }

            return majorData;
        }
    } catch (error) {
        console.error('[MapDataFetcher] Error in progressive fetch:', error);
        throw error;
    }
}

/**
 * Strategy 3: Progressive fetch with batched loading
 * Loads minor roads in batches: tertiary → residential
 * 
 * @param {Function} onProgress - Callback (stage, data) => void
 *   - stage: 'major' | 'tertiary' | 'complete'
 */
export async function fetchOSMDataProgressiveBatched(lat, lon, distance, onProgress) {
    const cacheKey = getCacheKey(lat, lon, distance);

    // Check for complete cached data
    const cachedComplete = cache.get(cacheKey + '_complete');
    if (cachedComplete && Date.now() - cachedComplete.timestamp < CACHE_DURATION) {
        console.log('[MapDataFetcher] Using complete cached data');
        if (onProgress) onProgress('complete', cachedComplete.data);
        return cachedComplete.data;
    }

    try {
        const fetchRadius = distance * 1.35;
        const bounds = getRequestBounds(lat, lon, distance);

        // Stage 1: Major features
        console.log('[MapDataFetcher] Stage 1 Batched: Fetching major features...');
        const majorQuery = buildMajorFeaturesQuery(lat, lon, fetchRadius);
        const majorElements = await fetchFromOverpass(majorQuery);
        const { roads: majorRoads, water, parks } = processElements(majorElements);

        let currentRoads = [...majorRoads];
        const majorData = { roads: currentRoads, water, parks, bounds };

        console.log(`[MapDataFetcher] Stage 1 complete: ${majorRoads.length} major roads`);
        if (onProgress) onProgress('major', majorData);

        // Cache partial major data
        cache.set(cacheKey + '_major', { data: majorData, timestamp: Date.now() });

        // Stage 2a: Tertiary roads
        let tertiaryRoads = [];
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('[MapDataFetcher] Stage 2a: Fetching tertiary roads...');
            const tertiaryQuery = buildRoadTypeQuery(lat, lon, fetchRadius, "tertiary");
            const tertiaryElements = await fetchFromOverpass(tertiaryQuery);
            const { roads: fetchedTertiary } = processElements(tertiaryElements);
            tertiaryRoads = fetchedTertiary;

            currentRoads = [...currentRoads, ...tertiaryRoads];
            console.log(`[MapDataFetcher] Stage 2a complete: ${tertiaryRoads.length} tertiary roads added`);
            if (onProgress) onProgress('tertiary', { ...majorData, roads: currentRoads });
        } catch (error) {
            console.warn('[MapDataFetcher] Stage 2a failed:', error.message);
        }

        // Stage 2b: Residential roads
        let residentialRoads = [];
        try {
            await new Promise(resolve => setTimeout(resolve, 1200));
            console.log('[MapDataFetcher] Stage 2b: Fetching residential roads...');
            const residentialQuery = buildRoadTypeQuery(lat, lon, fetchRadius, "residential");
            const residentialElements = await fetchFromOverpass(residentialQuery);
            const { roads: fetchedResidential } = processElements(residentialElements);
            residentialRoads = fetchedResidential;

            currentRoads = [...currentRoads, ...residentialRoads];
            console.log(`[MapDataFetcher] Stage 2b complete: ${residentialRoads.length} residential roads added`);
        } catch (error) {
            console.warn('[MapDataFetcher] Stage 2b failed:', error.message);
        }

        const finalData = { roads: currentRoads, water, parks, bounds };

        // Cache complete data
        cache.set(cacheKey + '_complete', {
            data: finalData,
            timestamp: Date.now()
        });

        if (onProgress) onProgress('complete', finalData);
        return finalData;

    } catch (error) {
        console.error('[MapDataFetcher] Error in batched progressive fetch:', error);
        throw error;
    }
}

/**
 * Transform OSM coordinates to SVG coordinate space while preserving aspect ratio
 * 
 * Accounts for Earth's curvature (latitudinal scaling) and fits data 
 * into the target SVG dimensions without stretching.
 */
export function transformToSVG(geometry, bounds, width = 600, height = 800) {
    const { minLat, maxLat, minLon, maxLon } = bounds;

    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;

    // Scale factor for longitude based on latitude (Mercator-ish correction)
    const cosLat = Math.cos(centerLat * Math.PI / 180);

    // Degree-equivalent ranges
    const latRange = maxLat - minLat;
    const lonRange = (maxLon - minLon) * cosLat;

    // Use the poster width as the primary reference for scale
    // This ensures the requested radius fits the width of the poster
    const scale = width / lonRange;

    return geometry.map(({ lat, lon }) => {
        // Center-relative coordinates
        const xRel = (lon - centerLon) * cosLat * scale;
        const yRel = (lat - centerLat) * scale;

        // Final SVG coordinates (centered on 300, 400)
        const x = width / 2 + xRel;
        const y = height / 2 - yRel; // SVG Y increases downward

        return { x, y };
    });
}

/**
 * Clear the cache
 */
export function clearCache() {
    cache.clear();
    console.log('[MapDataFetcher] Cache cleared');
}
