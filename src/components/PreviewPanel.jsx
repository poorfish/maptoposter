import { useState, useMemo, useEffect } from 'react'
import './PreviewPanel.css'
import PosterRenderer from './PosterRenderer'
import { exportSVG, exportPNG, generateFilename } from '../utils/exportUtils'
import { getThemeNames, getTheme } from '../data/themes'

// Deterministic random numbers based on a seed (string)
const getSeededRandom = (seed) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    return (index) => {
        const x = Math.sin(hash + index) * 10000;
        return x - Math.floor(x);
    };
};

// Miniature map preview component with unique geometry per theme
const ThemeMapPreview = ({ themeName, className, style }) => {
    const t = getTheme(themeName);
    const rnd = getSeededRandom(themeName);

    // Water: Organic curve
    const rY = 40 + (rnd(1) * 20 - 10);
    const waterD = `M0,${rY} Q30,${rY - 25 * rnd(2)} 70,${rY + 15 * rnd(3)} T120,${rY - 10 * rnd(4)} L120,80 L0,80 Z`;

    // Parks: Blobs
    const p1D = `M${20 + rnd(5) * 30},${15 + rnd(6) * 15} Q${40 + rnd(7) * 20},${5 + rnd(8) * 5} ${60 + rnd(9) * 20},${25 + rnd(10) * 10} Q${50 + rnd(11) * 10},${45 + rnd(12) * 5} ${20 + rnd(13) * 10},${35 + rnd(14) * 10} Z`;
    const p2D = `M${80 + rnd(15) * 20},${45 + rnd(16) * 15} Q${110 + rnd(17) * 10},${35 + rnd(18) * 10} ${110 + rnd(19) * 5},${65 + rnd(20) * 10} Q${90 + rnd(21) * 10},${75 + rnd(22) * 5} ${80 + rnd(23) * 10},${55 + rnd(24) * 10} Z`;

    // Roads: All Quadratic Bézier Curves for natural flow
    const mY1 = 20 + rnd(25) * 40;
    const mY2 = 20 + rnd(26) * 40;
    const motorwayD = `M-10,${mY1} Q60,${(mY1 + mY2) / 2 + (rnd(27) * 40 - 20)} 130,${mY2}`;

    const pX1 = 30 + rnd(28) * 60;
    const pX2 = 30 + rnd(29) * 60;
    const primaryD = `M${pX1},-10 Q${(pX1 + pX2) / 2 + (rnd(30) * 30 - 15)},40 ${pX2},90`;

    // Secondary "vines" - random curved segments
    const s1D = `M${rnd(31) * 100},${rnd(32) * 80} Q${rnd(33) * 120},${rnd(34) * 80} ${rnd(35) * 120},${rnd(36) * 80}`;
    const s2D = `M${rnd(37) * 120},${rnd(38) * 80} Q${rnd(39) * 120},${rnd(40) * 80} ${rnd(41) * 100},${rnd(42) * 100}`;

    return (
        <svg
            className={className}
            style={{ ...style, background: t.bg }}
            viewBox="0 0 120 80"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d={waterD} fill={t.water} opacity="0.8" />
            <path d={p1D} fill={t.parks} opacity="0.7" />
            <path d={p2D} fill={t.parks} opacity="0.7" />
            <path d={s1D} fill="none" stroke={t.road_secondary} strokeWidth="1.2" opacity="0.5" strokeLinecap="round" />
            <path d={s2D} fill="none" stroke={t.road_secondary} strokeWidth="1.2" opacity="0.5" strokeLinecap="round" />
            <path d={primaryD} fill="none" stroke={t.road_primary} strokeWidth="2.8" strokeLinecap="round" />
            <path d={motorwayD} fill="none" stroke={t.road_motorway} strokeWidth="4.5" strokeLinecap="round" />
        </svg>
    );
};

function PreviewPanel({
    mapCenter,
    distance,
    city,
    country,
    theme,
    fontFamily,
    mapData,
    isLoading,
    orientation,
    aspectRatio,
    onThemeChange,
    onFontChange,
    onCityChange,
    onCountryChange,
    onOrientationChange,
    onAspectRatioChange,
    onUpdatePreview,
    onSyncStatusChange,
    onSwitchView
}) {
    const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)
    const [activeTab, setActiveTab] = useState(null) // 'layout', 'labels', 'typography', 'theme'
    const [touchStartY, setTouchStartY] = useState(null)
    const themeNames = getThemeNames()

    // Store the params that are currently rendered in the poster
    const [renderedParams, setRenderedParams] = useState({ center: null, distance: null })

    // Check if map view is different from current poster
    const isOutOfSync = useMemo(() => {
        if (!renderedParams.center) return true
        const latDiff = Math.abs(renderedParams.center[0] - mapCenter[0])
        const lngDiff = Math.abs(renderedParams.center[1] - mapCenter[1])
        const distDiff = Math.abs(renderedParams.distance - distance)
        return latDiff > 0.0001 || lngDiff > 0.0001 || distDiff > 1
    }, [mapCenter, distance, renderedParams])

    const handleDownload = async (format) => {
        setDownloadMenuOpen(false)
        setIsExporting(true)

        try {
            const posterElement = document.querySelector('.poster-svg-container')
            const svgElement = posterElement?.querySelector('svg')

            if (!svgElement) {
                throw new Error('Poster not found. Please wait for the map to load.')
            }

            const filename = generateFilename(city, theme)

            if (format === 'svg') {
                exportSVG(svgElement, filename)
            } else if (format === 'png') {
                await exportPNG(svgElement, filename, 3)
            }
        } catch (error) {
            console.error('Download failed:', error)
            alert(`Failed to download: ${error.message}`)
        } finally {
            setIsExporting(false)
        }
    }

    const handleUpdatePreview = () => {
        setRefreshKey(prev => prev + 1)
        setRenderedParams({ center: mapCenter, distance: distance })
    }

    // Notify parent about sync status changes
    useEffect(() => {
        if (onSyncStatusChange) {
            const hasGenerated = renderedParams.center !== null
            onSyncStatusChange(isOutOfSync, handleUpdatePreview, hasGenerated)
        }
    }, [isOutOfSync, onSyncStatusChange, renderedParams])

    // Close download menu when clicking outside
    useEffect(() => {
        if (!downloadMenuOpen) return

        const handleClickOutside = (event) => {
            // Check if click is outside the download wrapper
            const downloadWrapper = event.target.closest('.download-wrapper')
            if (!downloadWrapper) {
                setDownloadMenuOpen(false)
            }
        }

        // Add listener with a small delay to avoid immediate closure
        const timeoutId = setTimeout(() => {
            document.addEventListener('click', handleClickOutside)
        }, 0)

        return () => {
            clearTimeout(timeoutId)
            document.removeEventListener('click', handleClickOutside)
        }
    }, [downloadMenuOpen])

    const handleTouchStart = (e) => {
        setTouchStartY(e.touches[0].clientY)
    }

    const handleTouchEnd = (e) => {
        if (touchStartY === null) return

        const touchEndY = e.changedTouches[0].clientY
        const swipeThreshold = 50 // pixels to swipe down to close

        if (touchEndY - touchStartY > swipeThreshold) {
            setActiveTab(null)
        }
        setTouchStartY(null)
    }


    return (
        <div className="preview-panel">
            <div className="preview-header">
                {/* Left: Back Button (Mobile) or Download (Desktop) */}
                <div className="header-left">
                    <button
                        className="icon-button back-mobile-btn highlight"
                        onClick={() => onSwitchView('map')}
                        title="Back to Map"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>

                    <div className="download-wrapper desktop-only">
                        <button
                            className="icon-button"
                            onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                            title="Download Poster"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        </button>
                        {downloadMenuOpen && (
                            <div className="download-menu glass">
                                <button className="download-option" onClick={() => handleDownload('png')}>
                                    <span>PNG Image</span>
                                    <span className="format-label">High Res</span>
                                </button>
                                <button className="download-option" onClick={() => handleDownload('svg')}>
                                    <span>SVG Vector</span>
                                    <span className="format-label">Scalable</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>


                {/* Center: Title with Icon */}
                <div className="header-center">
                    <div className="preview-title-container">
                        <svg className="mapster-icon" width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_19453_14529)">
                                <path d="M1.50475 23.8693L15.5047 31.8693C15.6559 31.9557 15.8269 32.0011 16.001 32.0011C16.1751 32.0011 16.3461 31.9557 16.4972 31.8693L30.4972 23.8693C30.6506 23.7819 30.778 23.6555 30.8667 23.5029C30.9553 23.3504 31.002 23.177 31.002 23.0006C31.002 22.8241 30.9553 22.6508 30.8667 22.4982C30.778 22.3456 30.6506 22.2192 30.4972 22.1318L16.4972 14.1318C16.3461 14.0454 16.1751 14 16.001 14C15.8269 14 15.6559 14.0454 15.5047 14.1318L1.50475 22.1318C1.35145 22.2192 1.224 22.3456 1.13535 22.4982C1.0467 22.6508 1 22.8241 1 23.0006C1 23.177 1.0467 23.3504 1.13535 23.5029C1.224 23.6555 1.35145 23.7819 1.50475 23.8693Z" fill="#886800" />
                                <path d="M16.0046 0C18.3908 0.00270689 20.6787 0.951431 22.366 2.63867C24.0532 4.32591 25.0019 6.61388 25.0046 9C25.0046 15.1264 20.3909 19.5568 16.0046 23.127C11.6183 19.5568 7.00464 15.1264 7.00464 9C7.00735 6.61388 7.95607 4.32591 9.64331 2.63867C11.3306 0.951431 13.6185 0.00270696 16.0046 0ZM16.0046 5.72754C15.1367 5.72754 14.3039 6.07179 13.6902 6.68555C13.0764 7.2993 12.7322 8.13202 12.7322 9C12.7322 9.64728 12.9243 10.2802 13.2839 10.8184C13.6435 11.3564 14.1548 11.7758 14.7527 12.0234C15.3506 12.271 16.0086 12.3362 16.6433 12.21C17.2781 12.0837 17.8614 11.7721 18.3191 11.3145C18.7768 10.8568 19.0883 10.2735 19.2146 9.63867C19.3409 9.00394 19.2757 8.34597 19.0281 7.74805C18.7804 7.15015 18.361 6.6389 17.823 6.2793C17.2848 5.91969 16.6519 5.72754 16.0046 5.72754Z" fill="#D4AF36" />
                            </g>
                            <defs>
                                <clipPath id="clip0_19453_14529">
                                    <rect width="32.002" height="32.0011" fill="white" />
                                </clipPath>
                            </defs>
                        </svg>
                        <h2 className="preview-title">Mapster</h2>
                    </div>
                </div>


                {/* Right: GitHub Link + Download (Mobile) */}
                <div className="header-right">
                    <a
                        href="https://github.com/poorfish/mapster"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="github-link"
                        title="View on GitHub"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                    </a>

                    <div className="download-wrapper mobile-only-inline">
                        <button
                            className="icon-button highlight"
                            onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                            title="Download"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        </button>
                        {downloadMenuOpen && (
                            <div className="download-menu glass">
                                <button className="download-option" onClick={() => handleDownload('png')}>
                                    <span>PNG</span>
                                </button>
                                <button className="download-option" onClick={() => handleDownload('svg')}>
                                    <span>SVG</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="preview-content-container">
                <div className="preview-content">
                    <PosterRenderer
                        mapCenter={mapCenter}
                        distance={distance}
                        city={city}
                        country={country}
                        theme={theme}
                        fontFamily={fontFamily}
                        mapData={mapData}
                        isLoading={isLoading}
                        refreshKey={refreshKey}
                        orientation={orientation}
                        aspectRatio={aspectRatio}
                        onParamsRendered={setRenderedParams}
                    />
                </div>

                <div className="preview-footer-settings glass">
                    {/* Desktop Settings Content (HIDDEN ON MOBILE) */}
                    <div className="desktop-settings-only">
                        {/* LAYOUT Section */}
                        <div className="settings-section">
                            <div className="section-header">
                                <span className="section-title">Layout</span>
                            </div>
                            <div className="footer-setting">
                                <div className="setting-label">Orientation</div>
                                <div className="toggle-group">
                                    <button
                                        className={`toggle-btn ${orientation === 'portrait' ? 'active' : ''}`}
                                        onClick={() => onOrientationChange('portrait')}
                                        title="Portrait"
                                    >
                                        <svg width="14" height="18" viewBox="0 0 14 18" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="1" y="1" width="12" height="16" rx="2" />
                                        </svg>
                                        <span className="btn-label">Portrait</span>
                                    </button>
                                    <button
                                        className={`toggle-btn ${orientation === 'landscape' ? 'active' : ''}`}
                                        onClick={() => onOrientationChange('landscape')}
                                        title="Landscape"
                                    >
                                        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="1" y="1" width="16" height="12" rx="2" />
                                        </svg>
                                        <span className="btn-label">Landscape</span>
                                    </button>
                                </div>
                            </div>
                            <div className="footer-setting">
                                <div className="setting-label">Aspect Ratio</div>
                                <select
                                    className="ratio-select"
                                    value={aspectRatio}
                                    onChange={(e) => onAspectRatioChange(e.target.value)}
                                >
                                    <option value="2:3">2:3 (Classic)</option>
                                    <option value="3:4">3:4 (Standard)</option>
                                    <option value="4:5">4:5 (Modern)</option>
                                    <option value="1:1">1:1 (Square)</option>
                                </select>
                            </div>
                        </div>


                        {/* LABELS Section */}
                        <div className="settings-section">
                            <div className="section-header">
                                <span className="section-title">Labels</span>
                            </div>
                            <div className="footer-setting">
                                <div className="setting-label">City</div>
                                <input
                                    type="text"
                                    className="footer-input"
                                    placeholder="City Name"
                                    value={city}
                                    onChange={(e) => onCityChange(e.target.value)}
                                />
                            </div>
                            <div className="footer-setting">
                                <div className="setting-label">Country</div>
                                <input
                                    type="text"
                                    className="footer-input"
                                    placeholder="Country/Region"
                                    value={country}
                                    onChange={(e) => onCountryChange(e.target.value)}
                                />
                            </div>
                        </div>


                        {/* TYPOGRAPHY Section */}
                        <div className="settings-section">
                            <div className="section-header">
                                <span className="section-title">Typography</span>
                            </div>
                            <div className="footer-setting">
                                <div className="setting-label">Font Family</div>
                                <div className="font-grid desktop-font-grid">
                                    {['Inter', "'Playfair Display'", 'Montserrat', "'Courier Prime'", "'Outfit'", "'Nunito'"].map(font => (
                                        <button
                                            key={font}
                                            className={`font-chip desktop-font-chip ${fontFamily === font ? 'active' : ''}`}
                                            onClick={() => onFontChange(font)}
                                            style={{ fontFamily: font }}
                                            title={font.replace(/'/g, '')}
                                        >
                                            {font.replace(/'/g, '').split(' ')[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>


                        {/* THEME Section */}
                        <div className="settings-section">
                            <div className="section-header">
                                <span className="section-title">Theme</span>
                            </div>
                            <div className="footer-setting">
                                <div className="setting-label">{getTheme(theme).name}</div>
                                <div className="theme-dots-container">
                                    {themeNames.map(name => {
                                        return (
                                            <button
                                                key={name}
                                                className={`theme-dot ${theme === name ? 'active' : ''}`}
                                                onClick={() => onThemeChange(name)}
                                                title={getTheme(name).name}
                                            >
                                                <ThemeMapPreview themeName={name} className="theme-map-svg" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Navigation (VISIBLE ON MOBILE ONLY) */}
                    <div className="mobile-nav">
                        <button
                            className={`nav-item ${activeTab === 'layout' ? 'active' : ''}`}
                            onClick={() => setActiveTab(activeTab === 'layout' ? null : 'layout')}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7"></rect>
                                <rect x="14" y="3" width="7" height="7"></rect>
                                <rect x="14" y="14" width="7" height="7"></rect>
                                <rect x="3" y="14" width="7" height="7"></rect>
                            </svg>
                            <span>Layout</span>
                        </button>
                        <button
                            className={`nav-item ${activeTab === 'labels' ? 'active' : ''}`}
                            onClick={() => setActiveTab(activeTab === 'labels' ? null : 'labels')}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                                <line x1="7" y1="7" x2="7.01" y2="7"></line>
                            </svg>
                            <span>Labels</span>
                        </button>
                        <button
                            className={`nav-item ${activeTab === 'typography' ? 'active' : ''}`}
                            onClick={() => setActiveTab(activeTab === 'typography' ? null : 'typography')}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="4 7 4 4 20 4 20 7"></polyline>
                                <line x1="9" y1="20" x2="15" y2="20"></line>
                                <line x1="12" y1="4" x2="12" y2="20"></line>
                            </svg>
                            <span>Fonts</span>
                        </button>
                        <button
                            className={`nav-item ${activeTab === 'theme' ? 'active' : ''}`}
                            onClick={() => setActiveTab(activeTab === 'theme' ? null : 'theme')}
                        >
                            <svg width="24" height="24" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="256" height="256" fill="none" stroke="none" />
                                <path d="M128,192a24,24,0,0,1,24-24h46.21a24,24,0,0,0,23.4-18.65A96.48,96.480,0,0,0,224,127.17c-.45-52.82-44.16-95.7-97-95.17a96,96,0,0,0-95,96c0,41.81,26.73,73.44,64,86.61A24,24,0,0,0,128,192Z" fill="none" />
                                <circle cx="128" cy="76" r="12" fill="currentColor" stroke="none" />
                                <circle cx="84" cy="100" r="12" fill="currentColor" stroke="none" />
                                <circle cx="84" cy="156" r="12" fill="currentColor" stroke="none" />
                                <circle cx="172" cy="100" r="12" fill="currentColor" stroke="none" />
                            </svg>
                            <span>Theme</span>
                        </button>
                    </div>
                </div>

                {/* Invisible overlay to close menu on outside click */}
                {activeTab && (
                    <div
                        className="bottom-sheet-overlay"
                        onClick={() => setActiveTab(null)}
                    />
                )}

                {/* Bottom Sheet for Mobile */}
                {activeTab && (
                    <div
                        className="bottom-sheet glass active"
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                    >
                        <div className="bottom-sheet-header">
                            <div className="drag-indicator"></div>
                        </div>
                        <div className="bottom-sheet-content">
                            {activeTab === 'layout' && (
                                <div className="mobile-settings-menu">
                                    <div className="menu-group">
                                        <label>Orientation</label>
                                        <div className="toggle-group full-width">
                                            <button
                                                className={`toggle-btn ${orientation === 'portrait' ? 'active' : ''}`}
                                                onClick={() => onOrientationChange('portrait')}
                                            >
                                                <svg width="14" height="18" viewBox="0 0 14 18" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="1" y="1" width="12" height="16" rx="2" />
                                                </svg>
                                                <span>Portrait</span>
                                            </button>
                                            <button
                                                className={`toggle-btn ${orientation === 'landscape' ? 'active' : ''}`}
                                                onClick={() => onOrientationChange('landscape')}
                                            >
                                                <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="1" y="1" width="16" height="12" rx="2" />
                                                </svg>
                                                <span>Landscape</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="menu-group">
                                        <label>Aspect Ratio</label>
                                        <div className="font-grid">
                                            {[
                                                { label: '2:3 Classic', value: '2:3' },
                                                { label: '3:4 Standard', value: '3:4' },
                                                { label: '4:5 Modern', value: '4:5' },
                                                { label: '1:1 Square', value: '1:1' }
                                            ].map(ratio => (
                                                <button
                                                    key={ratio.value}
                                                    className={`font-chip ${aspectRatio === ratio.value ? 'active' : ''}`}
                                                    onClick={() => onAspectRatioChange(ratio.value)}
                                                >
                                                    {ratio.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'labels' && (
                                <div className="mobile-settings-menu">
                                    <div className="menu-group">
                                        <label>City Name</label>
                                        <input type="text" className="footer-input" value={city} onChange={(e) => onCityChange(e.target.value)} />
                                    </div>
                                    <div className="menu-group">
                                        <label>Country / Region</label>
                                        <input type="text" className="footer-input" value={country} onChange={(e) => onCountryChange(e.target.value)} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'typography' && (
                                <div className="mobile-settings-menu">
                                    <div className="menu-group">
                                        <label>Font Family</label>
                                        <div className="font-grid">
                                            {['Inter', "'Playfair Display'", 'Montserrat', "'Courier Prime'", "'Outfit'", "'Nunito'"].map(font => (
                                                <button
                                                    key={font}
                                                    className={`font-chip ${fontFamily === font ? 'active' : ''}`}
                                                    onClick={() => onFontChange(font)}
                                                    style={{ fontFamily: font }}
                                                >
                                                    {font.replace(/'/g, '').split(' ')[0]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'theme' && (
                                <div className="mobile-settings-menu">
                                    <div className="menu-group">
                                        <label>Current: <span>{getTheme(theme).name}</span></label>
                                        <div className="mobile-theme-grid">
                                            {themeNames.map(name => {
                                                const t = getTheme(name);
                                                return (
                                                    <button
                                                        key={name}
                                                        className={`mobile-theme-card ${theme === name ? 'active' : ''}`}
                                                        onClick={() => {
                                                            onThemeChange(name);
                                                            setActiveTab(null);
                                                        }}
                                                    >
                                                        <div className="theme-preview">
                                                            <ThemeMapPreview themeName={name} className="theme-map-svg-mobile" />
                                                        </div>
                                                        <span>{t.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default PreviewPanel
