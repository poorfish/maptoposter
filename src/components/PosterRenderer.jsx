import { useState, useEffect, useMemo } from 'react'
import { getTheme } from '../data/themes'
import { fetchOSMData, fetchOSMDataProgressive, fetchOSMDataProgressiveBatched } from '../utils/MapDataFetcher'
import { renderMapElements } from '../utils/SVGRenderer'
import './PosterRenderer.css'

function PosterRenderer({ mapCenter, distance, city, country, theme, fontFamily, mapData, isLoading, refreshKey, orientation, aspectRatio, onParamsRendered }) {
    // Calculate dimensions based on aspect ratio and orientation
    const parts = aspectRatio.split(':').map(Number)
    const ratioW = orientation === 'portrait' ? parts[0] : parts[1]
    const ratioH = orientation === 'portrait' ? parts[1] : parts[0]

    let baseWidth, baseHeight
    if (orientation === 'portrait') {
        baseHeight = 800
        baseWidth = (ratioW / ratioH) * baseHeight
    } else {
        baseWidth = 800
        baseHeight = (ratioH / ratioW) * baseWidth
    }

    const width = baseWidth
    const height = baseHeight
    const centerX = width / 2
    const centerY = height / 2

    const currentTheme = getTheme(theme)
    const [osmData, setOsmData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [loadingStage, setLoadingStage] = useState(null) // 'major' | 'minor' | null
    const [error, setError] = useState(null)

    const fetchData = async () => {
        if (!mapCenter || !distance) return

        const [lat, lon] = mapCenter
        setLoading(true)
        setLoadingStage('major')
        setError(null)

        try {
            console.log(`Fetching OSM data for ${city}...`)

            // Use progressive loading for better UX (Strategy 1: Aggressive Sampling)
            await fetchOSMDataProgressive(
                lat,
                lon,
                distance,
                (stage, data) => {
                    if (stage === 'major') {
                        // Stage 1: Display major roads quickly
                        console.log('[PosterRenderer] Stage 1 complete: Major features loaded')
                        setOsmData(data)
                        setLoadingStage('minor')
                        setLoading(false) // Main loading overlay removed
                    } else if (stage === 'complete') {
                        // Stage 2: Update with complete (sampled) data
                        console.log('[PosterRenderer] Stage 2 complete: All roads loaded')
                        setOsmData(data)
                        setLoadingStage(null)
                    }
                }
            )

            if (onParamsRendered) {
                onParamsRendered({ center: mapCenter, distance })
            }

            console.log('OSM data loaded successfully')
        } catch (err) {
            console.error('Failed to fetch OSM data:', err)
            setError(err.message)
            setLoading(false)
            setLoadingStage(null)
        }
    }

    // Load data ONLY when refreshKey changes (via manual Preview button)
    useEffect(() => {
        if (refreshKey > 0) {
            fetchData()
        }
    }, [refreshKey])

    // Render SVG elements from OSM data
    const svgElements = useMemo(() => {
        if (!osmData) return { parks: [], water: [], roads: [] }
        // Pass dynamic width and height to SVG transformer
        return renderMapElements(osmData, currentTheme, width, height)
    }, [osmData, currentTheme, width, height])

    const [lat, lon] = mapCenter
    const coords = lat >= 0
        ? `${lat.toFixed(4)}° N / ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`
        : `${Math.abs(lat).toFixed(4)}° S / ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`

    return (
        <div className="poster-renderer">
            {/* Unified Loading & Error Status Indicator */}
            {(loading || loadingStage === 'minor' || error) && (
                <div className={`progressive-loading-status ${error ? 'error' : ''}`}>
                    {error ? (
                        <div className="status-error-icon">⚠️</div>
                    ) : (
                        <div className="status-spinner"></div>
                    )}
                    <span>
                        {error ? (
                            <>
                                Failed to load details.
                                <span className="status-retry-link" onClick={() => fetchData()}>Retry</span>
                            </>
                        ) : (
                            loading ? 'Loading structure...' : 'Loading details...'
                        )}
                    </span>
                </div>
            )}

            <div className="poster-svg-container" style={{ background: currentTheme.bg, aspectRatio: `${width}/${height}`, maxWidth: orientation === 'landscape' ? '100%' : '500px' }}>
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="poster-svg"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Background */}
                    <rect width={width} height={height} fill={currentTheme.bg} />

                    {/* Map content */}
                    <g id="map-content">
                        {/* Parks layer (bottom) */}
                        {svgElements.parks.map(element => (
                            <polygon
                                key={element.key}
                                points={element.points}
                                fill={element.fill}
                                stroke={element.stroke}
                            />
                        ))}

                        {/* Water layer */}
                        {svgElements.water.map(element =>
                            element.type === 'polygon' ? (
                                <polygon
                                    key={element.key}
                                    points={element.points}
                                    fill={element.fill}
                                    stroke={element.stroke}
                                />
                            ) : (
                                <path
                                    key={element.key}
                                    d={element.d}
                                    stroke={element.stroke}
                                    strokeWidth={element.strokeWidth}
                                    fill={element.fill}
                                    strokeLinecap={element.strokeLinecap}
                                />
                            )
                        )}

                        {/* Roads layer (top) */}
                        {svgElements.roads.map(element => (
                            <path
                                key={element.key}
                                d={element.d}
                                stroke={element.stroke}
                                strokeWidth={element.strokeWidth}
                                fill={element.fill}
                                strokeLinecap={element.strokeLinecap}
                                strokeLinejoin={element.strokeLinejoin}
                            />
                        ))}

                        {/* Show placeholder if no data yet - gold colors matching midnight_blue theme */}
                        {!osmData && !loading && (
                            <>
                                <circle cx={centerX} cy={centerY} r="150" fill="none" stroke="#D4AF37" strokeWidth="2" opacity="0.3" />
                                <circle cx={centerX} cy={centerY} r="100" fill="none" stroke="#C9A961" strokeWidth="1.5" opacity="0.3" />
                                <circle cx={centerX} cy={centerY} r="50" fill="none" stroke="#BEA38B" strokeWidth="1" opacity="0.3" />
                                <text x={centerX} y={centerY} textAnchor="middle" fill="#D4AF37" opacity="0.35" fontSize="14">
                                    Map data will render here
                                </text>
                            </>
                        )}
                    </g>

                    {/* Bottom gradient fade */}
                    <defs>
                        <linearGradient id="bottomFade" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={currentTheme.gradient_color} stopOpacity="0" />
                            <stop offset="100%" stopColor={currentTheme.gradient_color} stopOpacity="1" />
                        </linearGradient>
                        <linearGradient id="topFade" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor={currentTheme.gradient_color} stopOpacity="0" />
                            <stop offset="100%" stopColor={currentTheme.gradient_color} stopOpacity="1" />
                        </linearGradient>
                    </defs>

                    <rect width={width} height={height * 0.25} y="0" fill="url(#topFade)" />
                    <rect width={width} height={height * 0.25} y={height * 0.75} fill="url(#bottomFade)" />

                    {/* Typography Rendering Logic */}
                    {(() => {
                        const cityText = city.toUpperCase();
                        const words = cityText.split(/\s+/);
                        const charCount = cityText.length;

                        // Adaptive configuration
                        let baseFontSize = orientation === 'landscape' ? 36 : 48;
                        let letterSpacingValue = 12;

                        // Decision for multi-line
                        const isMultiLine = charCount > 12 && words.length > 1;
                        const lines = isMultiLine ? words : [cityText];

                        // Horizontal padding - safety margin from left/right edges for entire info section
                        const HORIZONTAL_PADDING = Math.max(width * 0.08, 40); // At least 8% of width or 40px
                        const maxLineWidth = width - (HORIZONTAL_PADDING * 2);
                        let currentFontSize = baseFontSize;

                        // More conservative width estimation with safety margin:
                        // Account for: base char width + injected spaces + letter-spacing
                        const getLineWidth = (text, fSize, spacing) => {
                            // Each character base width (more conservative estimate for bold fonts)
                            const charWidth = text.length * (fSize * 0.8);
                            // Two spaces injected between each char: '  '
                            const injectedSpacesWidth = (text.length - 1) * 2 * (fSize * 0.35);
                            // Letter-spacing applied
                            const totalSpacing = (text.length - 1) * spacing;
                            // Add extra safety margin (10%)
                            const totalWidth = charWidth + injectedSpacesWidth + totalSpacing;
                            return totalWidth * 1.1; // 10% safety buffer
                        };

                        // Scale down if any line is too wide
                        let maxLineW = 0;
                        lines.forEach(line => {
                            maxLineW = Math.max(maxLineW, getLineWidth(line, currentFontSize, letterSpacingValue));
                        });

                        if (maxLineW > maxLineWidth) {
                            const scale = maxLineWidth / maxLineW;
                            currentFontSize = Math.max(currentFontSize * scale, 20); // Minimum 20px
                            letterSpacingValue = Math.max(letterSpacingValue * scale, 3);
                        }

                        // LAYOUT STRATEGY: Poster Info Section as a whole
                        // The info section (city + divider + country + coords) is anchored to the bottom
                        // with fixed spacing between elements. When city text grows, section expands upward.

                        const lineHeight = currentFontSize * 1.2;

                        // Font sizes
                        const countryFontSize = orientation === 'landscape' ? 14 : 18;
                        const coordsFontSize = 12;

                        // Fixed spacing constants for info section
                        const BOTTOM_PADDING = height * 0.05; // Fixed margin from poster bottom
                        const GAP_COORDS_TO_COUNTRY = coordsFontSize * 1.8; // Gap between coords and country
                        const GAP_COUNTRY_TO_DIVIDER = countryFontSize * 1.5; // Gap from country baseline to divider
                        const GAP_DIVIDER_TO_CITY = countryFontSize * 1.5; // Gap from divider to city (same as above for symmetry)
                        const GAP_CITY_LINES = lineHeight; // Gap between city name lines

                        // BUILD FROM BOTTOM TO TOP:

                        // 1. Coordinates (bottom element)
                        const coordsY = height - BOTTOM_PADDING;

                        // 2. Country name
                        const countryY = coordsY - GAP_COORDS_TO_COUNTRY;

                        // 3. Divider line
                        const dividerY = countryY - GAP_COUNTRY_TO_DIVIDER;

                        // 4. City name (multi-line, grows upward)
                        // The last line of city name is GAP_DIVIDER_TO_CITY above the divider
                        const cityLastLineY = dividerY - GAP_DIVIDER_TO_CITY;
                        // First line position depends on number of lines
                        const cityYStart = cityLastLineY - (lines.length - 1) * GAP_CITY_LINES;

                        return (
                            <>
                                <text
                                    x={centerX}
                                    y={cityYStart}
                                    textAnchor="middle"
                                    fill={currentTheme.text}
                                    fontSize={currentFontSize}
                                    fontWeight="700"
                                    fontFamily={fontFamily}
                                    style={{ letterSpacing: `${letterSpacingValue}px` }}
                                >
                                    {lines.map((line, i) => (
                                        <tspan
                                            key={i}
                                            x={centerX}
                                            dy={i === 0 ? 0 : lineHeight}
                                        >
                                            {line.split('').join('  ')}
                                        </tspan>
                                    ))}
                                </text>

                                {/* Divider line - width matches country name */}
                                {(() => {
                                    // Estimate country text width
                                    // For uppercase text with font-weight 300, approximately 0.6 * fontSize per character
                                    const countryTextWidth = country.toUpperCase().length * countryFontSize * 0.6;
                                    const dividerHalfWidth = countryTextWidth / 2;

                                    return (
                                        <line
                                            x1={centerX - dividerHalfWidth}
                                            y1={dividerY}
                                            x2={centerX + dividerHalfWidth}
                                            y2={dividerY}
                                            stroke={currentTheme.text}
                                            strokeWidth="1"
                                        />
                                    );
                                })()}

                                <text
                                    x={centerX}
                                    y={countryY}
                                    textAnchor="middle"
                                    fill={currentTheme.text}
                                    fontSize={countryFontSize}
                                    fontWeight="300"
                                    fontFamily={fontFamily}
                                >
                                    {country.toUpperCase()}
                                </text>

                                <text
                                    x={centerX}
                                    y={coordsY}
                                    textAnchor="middle"
                                    fill={currentTheme.text}
                                    fontSize={coordsFontSize}
                                    opacity="0.7"
                                    fontFamily={fontFamily}
                                >
                                    {coords}
                                </text>
                            </>
                        );
                    })()}

                    {/* Attribution */}
                    <text
                        x={width - 10}
                        y={height - 10}
                        textAnchor="end"
                        fill={currentTheme.text}
                        fontSize="8"
                        opacity="0.5"
                        fontFamily={fontFamily}
                    >
                        © OpenStreetMap contributors
                    </text>
                </svg>
            </div>
        </div>
    )
}

export default PosterRenderer
