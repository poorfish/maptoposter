import { useState, useMemo, useEffect } from 'react'
import './PreviewPanel.css'
import PosterRenderer from './PosterRenderer'
import { exportSVG, exportPNG, generateFilename } from '../utils/exportUtils'
import { getThemeNames, getTheme } from '../data/themes'

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
    onDistanceChange,
    onOrientationChange,
    onAspectRatioChange,
    onUpdatePreview,
    onSyncStatusChange
}) {
    const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)
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


    return (
        <div className="preview-panel">
            <div className="preview-header">
                {/* Left: Download Icon Button */}
                <div className="header-left">
                    <div className="download-wrapper">
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


                {/* Right: GitHub Link */}
                <div className="header-right">
                    <a
                        href="https://github.com/poorfish/maptoposter"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="github-link"
                        title="View on GitHub"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                    </a>
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
                                >
                                    Portrait
                                </button>
                                <button
                                    className={`toggle-btn ${orientation === 'landscape' ? 'active' : ''}`}
                                    onClick={() => onOrientationChange('landscape')}
                                >
                                    Landscape
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

                    <div className="footer-divider" />

                    {/* LABELS Section */}
                    <div className="settings-section">
                        <div className="section-header">
                            <span className="section-title">Labels</span>
                        </div>
                        <div className="footer-setting">
                            <div className="input-group">
                                <div className="setting-label">City</div>
                                <input
                                    type="text"
                                    className="footer-input"
                                    placeholder="City Name"
                                    value={city}
                                    onChange={(e) => onCityChange(e.target.value)}
                                />
                            </div>
                            <div className="input-group">
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
                    </div>

                    <div className="footer-divider" />

                    {/* TYPOGRAPHY Section */}
                    <div className="settings-section">
                        <div className="section-header">
                            <span className="section-title">Typography</span>
                        </div>
                        <div className="footer-setting">
                            <div className="setting-label">Font Family</div>
                            <select
                                className="font-select"
                                value={fontFamily}
                                onChange={(e) => onFontChange(e.target.value)}
                            >
                                <option value="Inter">Inter (Sans)</option>
                                <option value="'Playfair Display'">Playfair Display (Serif)</option>
                                <option value="Montserrat">Montserrat (Modern)</option>
                                <option value="'Courier Prime'">Courier Prime (Mono)</option>
                                <option value="'Outfit'">Outfit (Geometric)</option>
                            </select>
                        </div>
                    </div>

                    <div className="footer-divider" />

                    {/* THEME Section */}
                    <div className="settings-section">
                        <div className="section-header">
                            <span className="section-title">Theme</span>
                        </div>
                        <div className="footer-setting">
                            <div className="setting-label">{getTheme(theme).name}</div>
                            <div className="theme-dots-container">
                                {themeNames.map(name => {
                                    const t = getTheme(name);
                                    return (
                                        <button
                                            key={name}
                                            className={`theme-dot ${theme === name ? 'active' : ''}`}
                                            onClick={() => onThemeChange(name)}
                                            style={{ background: t.bg, '--dot-accent': t.road_primary }}
                                            title={t.name}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PreviewPanel
