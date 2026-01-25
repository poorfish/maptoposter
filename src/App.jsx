import { useState, useCallback, useEffect } from 'react'
import './App.css'
import SplitPane from './components/SplitPane'
import MapPanel from './components/MapPanel'
import PreviewPanel from './components/PreviewPanel'

import { getThemeNames } from './data/themes'

const FONTS = ['Inter', "'Playfair Display'", 'Montserrat', "'Courier Prime'", "'Outfit'", "'Nunito'"]

function App() {
    // Map state
    const [mapCenter, setMapCenter] = useState([51.505, -0.09]) // Default: London
    const [mapZoom, setMapZoom] = useState(13)
    const [distance, setDistance] = useState(5000) // meters

    // Location state
    const [city, setCity] = useState('London')
    const [country, setCountry] = useState('United Kingdom')

    // Theme state
    const [currentTheme, setCurrentTheme] = useState(() => {
        const names = getThemeNames()
        return names[Math.floor(Math.random() * names.length)]
    })
    const [fontFamily, setFontFamily] = useState(() => {
        return FONTS[Math.floor(Math.random() * FONTS.length)]
    })

    // Poster Layout state
    const [orientation, setOrientation] = useState('portrait')
    const [aspectRatio, setAspectRatio] = useState('3:4')

    // Map data state
    const [mapData, setMapData] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    // Preview sync state
    const [isOutOfSync, setIsOutOfSync] = useState(false)
    const [updatePreviewHandler, setUpdatePreviewHandler] = useState(null)
    const [hasGenerated, setHasGenerated] = useState(false)
    const [mobileView, setMobileView] = useState('map') // 'map' or 'preview'

    // UI Theme state (light, dark, system)
    const [uiTheme, setUiTheme] = useState(() => {
        return localStorage.getItem('mapster-ui-theme') || 'system';
    });

    // Apply theme to document
    useEffect(() => {
        const root = window.document.documentElement;

        const applyTheme = (theme) => {
            if (theme === 'system') {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                root.setAttribute('data-theme', systemTheme);
            } else {
                root.setAttribute('data-theme', theme);
            }
            localStorage.setItem('mapster-ui-theme', theme);
        };

        applyTheme(uiTheme);

        // Listen for system theme changes if set to system
        if (uiTheme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme('system');
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [uiTheme]);

    const handleSyncStatusChange = useCallback((outOfSync, handler, hasGenerated) => {
        setIsOutOfSync(outOfSync)

        // Wrap the handler to also switch view on mobile
        const wrappedHandler = () => {
            if (handler) handler();
            setMobileView('preview');
        };

        setUpdatePreviewHandler(() => wrappedHandler)
        setHasGenerated(hasGenerated)
    }, [])

    // Memoize handlers
    const handleMapChange = useCallback((center, zoom) => {
        setMapCenter(prevCenter => {
            if (Math.abs(prevCenter[0] - center[0]) < 0.00001 &&
                Math.abs(prevCenter[1] - center[1]) < 0.00001) {
                return prevCenter;
            }
            return center;
        })

        setMapZoom(prevZoom => {
            if (prevZoom === zoom) return prevZoom;

            // Calculate new distance based on zoom
            // Base: Zoom 13 = 5000m. Formula: 5000 * 2^(13 - zoom)
            const newDistance = Math.round(5000 * Math.pow(2, 13 - zoom));
            setDistance(newDistance);

            return zoom;
        })
    }, [])

    const handleLocationSelect = useCallback((location) => {
        setCity(location.city)
        setCountry(location.country)
        setMapCenter([location.lat, location.lon])
        setMapZoom(13)
    }, [])

    const handleThemeChange = useCallback((theme) => setCurrentTheme(theme), [])
    const handleFontChange = useCallback((font) => setFontFamily(font), [])
    const handleCityChange = useCallback((city) => setCity(city), [])
    const handleCountryChange = useCallback((val) => setCountry(val), [])
    const handleOrientationChange = useCallback((orient) => setOrientation(orient), [])
    const handleAspectRatioChange = useCallback((ratio) => setAspectRatio(ratio), [])

    return (
        <div className="app-container">
            <main className="app-main full-height">
                <SplitPane mobileView={mobileView}>
                    <MapPanel
                        center={mapCenter}
                        zoom={mapZoom}
                        uiTheme={uiTheme}
                        onUiThemeChange={setUiTheme}
                        isOutOfSync={isOutOfSync}
                        hasGenerated={hasGenerated}
                        onMapChange={handleMapChange}
                        onLocationSelect={handleLocationSelect}
                        onUpdatePreview={updatePreviewHandler}
                    />
                    <PreviewPanel
                        mapCenter={mapCenter}
                        distance={distance}
                        city={city}
                        country={country}
                        theme={currentTheme}
                        uiTheme={uiTheme}
                        fontFamily={fontFamily}
                        orientation={orientation}
                        aspectRatio={aspectRatio}
                        mapData={mapData}
                        isLoading={isLoading}
                        onThemeChange={handleThemeChange}
                        onUiThemeChange={setUiTheme}
                        onFontChange={handleFontChange}
                        onCityChange={handleCityChange}
                        onCountryChange={handleCountryChange}
                        onOrientationChange={handleOrientationChange}
                        onAspectRatioChange={handleAspectRatioChange}
                        onSyncStatusChange={handleSyncStatusChange}
                        onSwitchView={setMobileView}
                    />
                </SplitPane>
            </main>
        </div>
    )
}

export default App
