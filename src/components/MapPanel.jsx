import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapPanel.css'
import LocationSearch from './LocationSearch'

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function MapPanel({ center, zoom, isOutOfSync, hasGenerated, onMapChange, onLocationSelect, onUpdatePreview }) {
    const mapRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const markerRef = useRef(null)
    const resizeObserverRef = useRef(null)
    const [currentZoom, setCurrentZoom] = useState(Math.round(zoom))

    // Store callbacks in ref to avoid re-initializing map listeners when handlers change
    const callbacksRef = useRef({ onMapChange, onLocationSelect })
    useEffect(() => {
        callbacksRef.current = { onMapChange, onLocationSelect }
    }, [onMapChange, onLocationSelect])

    useEffect(() => {
        if (!mapInstanceRef.current) {
            // Initialize map
            const map = L.map(mapRef.current, {
                center: center,
                zoom: zoom,
                zoomControl: false, // Handle zoom control manually for custom positioning
                attributionControl: false, // Disable default attribution to avoid duplicates
            })

            // Add zoom control manually to bottom-left
            L.control.zoom({
                position: 'bottomleft'
            }).addTo(map)

            // Add tile layer - CartoDB Dark Matter (Dark Gray)
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19,
            }).addTo(map)

            // Add single custom attribution control with dark theme
            L.control.attribution({
                position: 'bottomright',
                prefix: 'Leaflet'
            }).addAttribution('© OpenStreetMap | © CartoDB').addTo(map)

            // Add center marker with custom gold SVG icon
            const goldIcon = L.divIcon({
                className: 'custom-gold-marker',
                html: `
                    <svg width="20" height="28" viewBox="0 0 20 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 0C4.477 0 0 4.477 0 10C0 15.523 10 28 10 28C10 28 20 15.523 20 10C20 4.477 15.523 0 10 0Z" fill="#D4AF37"/>
                        <path d="M10 0C4.477 0 0 4.477 0 10C0 15.523 10 28 10 28C10 28 20 15.523 20 10C20 4.477 15.523 0 10 0Z" fill="url(#gold-gradient)"/>
                        <circle cx="10" cy="10" r="3.5" fill="none" stroke="#1a1a1a" stroke-width="1.5"/>
                        <defs>
                            <linearGradient id="gold-gradient" x1="10" y1="0" x2="10" y2="20" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stop-color="#F4D03F"/>
                                <stop offset="50%" stop-color="#D4AF37"/>
                                <stop offset="100%" stop-color="#C9A227"/>
                            </linearGradient>
                        </defs>
                    </svg>
                `,
                iconSize: [20, 28],
                iconAnchor: [10, 28],
                popupAnchor: [0, -28]
            })
            const marker = L.marker(center, { icon: goldIcon }).addTo(map)

            mapInstanceRef.current = map
            markerRef.current = marker

            // Listen to map events
            const handleMapUpdate = () => {
                const newCenter = map.getCenter()
                const newZoom = map.getZoom()
                setCurrentZoom(Math.round(newZoom))

                // Only trigger update if values actually changed to avoid unnecessary parent re-renders
                callbacksRef.current.onMapChange([newCenter.lat, newCenter.lng], newZoom)

                // Update marker position
                marker.setLatLng(newCenter)
            }

            map.on('moveend', handleMapUpdate)
            map.on('zoomend', handleMapUpdate)

            // Monitor container size changes to refresh map
            resizeObserverRef.current = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    // Immediately invalidate size when container dimensions change
                    if (map && entry.target === mapRef.current) {
                        map.invalidateSize({ pan: false, animate: false })
                    }
                }
            })

            if (mapRef.current) {
                resizeObserverRef.current.observe(mapRef.current)
            }
        }

        return () => {
            // Cleanup on unmount
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect()
                resizeObserverRef.current = null
            }
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove()
                mapInstanceRef.current = null
            }
        }
    }, []) // Init only once



    // Update map view when center/zoom props change externally
    useEffect(() => {
        if (mapInstanceRef.current && center) {
            const currentCenter = mapInstanceRef.current.getCenter()
            const currentZoom = mapInstanceRef.current.getZoom()

            // CRITICAL: Only setView if the difference is significant
            // Leaflet coordinates are objects, so we compare lat/lng values
            const latDiff = Math.abs(currentCenter.lat - center[0])
            const lngDiff = Math.abs(currentCenter.lng - center[1])
            const zoomDiff = Math.abs(currentZoom - zoom)

            // Use a small epsilon for coordinate comparison
            if (latDiff > 0.00001 || lngDiff > 0.00001 || zoomDiff > 0.1) {
                mapInstanceRef.current.setView(center, zoom)

                if (markerRef.current) {
                    markerRef.current.setLatLng(center)
                }
            }
        }
    }, [center, zoom])

    const handleLocationSelect = (location) => {
        if (mapInstanceRef.current) {
            const newCenter = [location.lat, location.lon]
            mapInstanceRef.current.setView(newCenter, 13)
            callbacksRef.current.onLocationSelect(location)
        }
    }

    return (
        <div className="map-panel">
            {/* Mobile-only header */}
            <div className="mobile-header">
                <div className="header-left"></div>
                <div className="header-center">
                    <div className="preview-title-container">
                        <svg className="mapster-icon" width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_map_mobile)">
                                <path d="M1.50475 23.8693L15.5047 31.8693C15.6559 31.9557 15.8269 32.0011 16.001 32.0011C16.1751 32.0011 16.3461 31.9557 16.4972 31.8693L30.4972 23.8693C30.6506 23.7819 30.778 23.6555 30.8667 23.5029C30.9553 23.3504 31.002 23.177 31.002 23.0006C31.002 22.8241 30.9553 22.6508 30.8667 22.4982C30.778 22.3456 30.6506 22.2192 30.4972 22.1318L16.4972 14.1318C16.3461 14.0454 16.1751 14 16.001 14C15.8269 14 15.6559 14.0454 15.5047 14.1318L1.50475 22.1318C1.35145 22.2192 1.224 22.3456 1.13535 22.4982C1.0467 22.6508 1 22.8241 1 23.0006C1 23.177 1.0467 23.3504 1.13535 23.5029C1.224 23.6555 1.35145 23.7819 1.50475 23.8693Z" fill="#886800" />
                                <path d="M16.0046 0C18.3908 0.00270689 20.6787 0.951431 22.366 2.63867C24.0532 4.32591 25.0019 6.61388 25.0046 9C25.0046 15.1264 20.3909 19.5568 16.0046 23.127C11.6183 19.5568 7.00464 15.1264 7.00464 9C7.00735 6.61388 7.95607 4.32591 9.64331 2.63867C11.3306 0.951431 13.6185 0.00270696 16.0046 0ZM16.0046 5.72754C15.1367 5.72754 14.3039 6.07179 13.6902 6.68555C13.0764 7.2993 12.7322 8.13202 12.7322 9C12.7322 9.64728 12.9243 10.2802 13.2839 10.8184C13.6435 11.3564 14.1548 11.7758 14.7527 12.0234C15.3506 12.271 16.0086 12.3362 16.6433 12.21C17.2781 12.0837 17.8614 11.7721 18.3191 11.3145C18.7768 10.8568 19.0883 10.2735 19.2146 9.63867C19.3409 9.00394 19.2757 8.34597 19.0281 7.74805C18.7804 7.15015 18.361 6.6389 17.823 6.2793C17.2848 5.91969 16.6519 5.72754 16.0046 5.72754Z" fill="#D4AF36" />
                            </g>
                            <defs>
                                <clipPath id="clip0_map_mobile">
                                    <rect width="32.002" height="32.0011" fill="white" />
                                </clipPath>
                            </defs>
                        </svg>
                        <h2 className="preview-title">Mapster</h2>
                    </div>
                </div>
                <div className="header-right">
                    <a href="https://github.com/poorfish/mapster" target="_blank" rel="noopener noreferrer" className="github-link">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                    </a>
                </div>
            </div>

            <div className="map-search-centered">
                <LocationSearch onLocationSelect={handleLocationSelect} />
            </div>

            <div ref={mapRef} className="map-container"></div>

            {/* Zoom Level Indicator */}
            <div className="map-zoom-level glass">
                <span>Zoom</span>
                <span className="zoom-value">{currentZoom}</span>
            </div>

            {/* Generate Button - Bottom Center */}
            {onUpdatePreview && (
                <div className="map-generate-btn-container">
                    <button
                        className={`map-preview-btn glass ${isOutOfSync ? 'stale' : ''}`}
                        onClick={onUpdatePreview}
                        title={isOutOfSync ? 'Re-generate Poster' : 'Generate Poster'}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        {hasGenerated ? 'Re-generate' : 'Generate'}
                    </button>
                </div>
            )}
        </div>
    )
}

export default MapPanel

