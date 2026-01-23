import { useEffect, useRef } from 'react'
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
                zoomControl: true,
                attributionControl: false, // Disable default attribution to avoid duplicates
            })

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
            <div className="map-search-centered">
                <LocationSearch onLocationSelect={handleLocationSelect} />
            </div>

            <div ref={mapRef} className="map-container"></div>

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

