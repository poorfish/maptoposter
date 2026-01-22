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

function MapPanel({ center, zoom, distance, isOutOfSync, hasGenerated, onMapChange, onLocationSelect, onDistanceChange, onUpdatePreview }) {
    const mapRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const circleRef = useRef(null)
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
            })

            // Add tile layer - CartoDB Dark Matter (Dark Gray)
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '© OpenStreetMap contributors © CartoDB',
                maxZoom: 19,
            }).addTo(map)

            // Add circle to show poster boundary - Using Refinity Gold
            const circle = L.circle(center, {
                radius: distance,
                color: '#d4af37',
                fillColor: '#d4af37',
                fillOpacity: 0.1,
                weight: 2,
            }).addTo(map)

            // Add center marker
            const marker = L.marker(center).addTo(map)

            mapInstanceRef.current = map
            circleRef.current = circle
            markerRef.current = marker

            // Listen to map events
            const handleMapUpdate = () => {
                const newCenter = map.getCenter()
                const newZoom = map.getZoom()

                // Only trigger update if values actually changed to avoid unnecessary parent re-renders
                callbacksRef.current.onMapChange([newCenter.lat, newCenter.lng], newZoom)

                // Update circle and marker position
                circle.setLatLng(newCenter)
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

    // Update circle radius when distance changes
    useEffect(() => {
        if (circleRef.current) {
            circleRef.current.setRadius(distance)
        }
    }, [distance])

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

                if (circleRef.current) {
                    circleRef.current.setLatLng(center)
                }
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

            {/* Preview Button - Top Right */}
            {onUpdatePreview && (
                <div className="map-preview-btn-container">
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

            <div ref={mapRef} className="map-container"></div>
            <div className="map-controls-bottom glass">
                <div className="map-control-item">
                    <div className="control-label">
                        Poster Radius: <span>{(distance / 1000).toFixed(1)} km</span>
                    </div>
                    <input
                        type="range"
                        className="map-radius-slider"
                        min="2000"
                        max="30000"
                        step="1000"
                        value={distance}
                        onChange={(e) => onDistanceChange(parseInt(e.target.value))}
                    />
                </div>
            </div>
        </div>
    )
}

export default MapPanel

