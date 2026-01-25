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
                (stage, data, err) => {
                    if (data) setOsmData(data)

                    if (stage === 'major') {
                        // Stage 1: Display major roads quickly
                        console.log('[PosterRenderer] Stage 1 complete: Major features loaded')
                        setLoadingStage('minor')
                        setLoading(false) // Main loading overlay removed
                    } else if (stage === 'complete') {
                        // Stage 2: Update with complete (sampled) data
                        console.log('[PosterRenderer] Stage 2 complete: All roads loaded')
                        setLoadingStage(null)
                        setError(null)
                    } else if (stage === 'error') {
                        // Stage 2 failed but Stage 1 is visible
                        console.warn('[PosterRenderer] Stage 2 error:', err)
                        setError(err.message || 'Failed to load details')
                        setLoadingStage('minor_error')
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
            setLoadingStage('major_error')
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
        if (!osmData) return { parks: [], water: [], roads: [], buildings: [] }
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
                                {loadingStage === 'major_error' ? 'Failed to load structure.' : 'Failed to load details.'}
                                <span className="status-retry-link" onClick={() => fetchData()}>Retry</span>
                            </>
                        ) : (
                            loading ? 'Loading structure...' : 'Loading details...'
                        )}
                    </span>
                </div>
            )}

            <div className="poster-svg-container" style={{ aspectRatio: `${width}/${height}` }}>
                <div className="poster-zoom-wrapper">
                    <svg
                        key={`${aspectRatio}-${orientation}`} /* Triggers the poster-reveal animation on layout change */
                        width={width}
                        height={height}
                        viewBox={`0 0 ${width} ${height}`}
                        className="poster-svg"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        {/* Background with rounded corners */}
                        <rect width={width} height={height} fill={currentTheme.bg} rx="12" ry="12" />

                        <defs>
                            {/* Clip path to ensure all map content respects rounded corners */}
                            <clipPath id="posterClip">
                                <rect width={width} height={height} rx="12" ry="12" />
                            </clipPath>

                            <linearGradient id="bottomFade" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={currentTheme.gradient_color} stopOpacity="0" />
                                <stop offset="100%" stopColor={currentTheme.gradient_color} stopOpacity="1" />
                            </linearGradient>
                            <linearGradient id="topFade" x1="0%" y1="100%" x2="0%" y2="0%">
                                <stop offset="0%" stopColor={currentTheme.gradient_color} stopOpacity="0" />
                                <stop offset="100%" stopColor={currentTheme.gradient_color} stopOpacity="1" />
                            </linearGradient>

                        </defs>

                        {/* Map content with clipping */}
                        <g id="map-content" clipPath="url(#posterClip)">
                            {/* Buildings layer (very bottom) */}
                            {svgElements.buildings.map(element => (
                                <polygon
                                    key={element.key}
                                    points={element.points}
                                    fill={element.fill}
                                    opacity={element.opacity}
                                    stroke={element.stroke}
                                />
                            ))}

                            {/* Parks layer */}
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

                        <rect width={width} height={height * 0.25} y="0" fill="url(#topFade)" clipPath="url(#posterClip)" />
                        <rect width={width} height={height * 0.25} y={height * 0.75} fill="url(#bottomFade)" clipPath="url(#posterClip)" />

                        {/* Wrap all label/info elements in a group for reflection reference */}
                        <g id="poster-info-overlay">
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
                                            // Font width ratios (approximate width-to-height ratio for uppercase)
                                            const fontWidthRatios = {
                                                "'Courier Prime'": 0.65, // Monospace is wider
                                                "'Playfair Display'": 0.55, // Serif is often narrower
                                                "'Nunito'": 0.65, // Rounded is slightly wider
                                                "'Outfit'": 0.62, // Geometric is average
                                                "Montserrat": 0.65, // Wide stance
                                                "Inter": 0.6 // Standard
                                            };

                                            // Get ratio for current font, defaulting to 0.6
                                            const widthRatio = fontWidthRatios[fontFamily] || 0.6;

                                            const charCount = country.toUpperCase().length;
                                            const letterSpacing = 2;
                                            // Apply font-specific width calculation
                                            const countryTextWidth = (charCount * countryFontSize * widthRatio) + Math.max(0, (charCount - 1) * letterSpacing);
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
                                            style={{ letterSpacing: '2px' }}
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

                            {/* GitHub Attribution - Left Bottom */}
                            <g>
                                <svg x="10" y={height - 16} width="8" height="8" viewBox="0 0 16 16" fill={currentTheme.text} opacity="0.5">
                                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                                </svg>
                                <text
                                    x="22"
                                    y={height - 10}
                                    fill={currentTheme.text}
                                    fontSize="8"
                                    opacity="0.5"
                                    fontFamily={fontFamily}
                                >
                                    github.com/poorfish/mapster
                                </text>
                            </g>

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
                        </g>
                    </svg>
                    {/* Updated reflection to include content mirrored from SVG */}
                    <div className="poster-reflection" style={{ backgroundColor: currentTheme.bg }}>
                        <svg
                            width="100%"
                            height="100%"
                            viewBox={`0 0 ${width} ${height * 0.6}`}
                            preserveAspectRatio="xMidYMin slice"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <use href="#poster-info-overlay" transform={`scale(1, -1) translate(0, -${height})`} />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PosterRenderer
