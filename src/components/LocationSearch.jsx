import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import './LocationSearch.css'

function LocationSearch({ onLocationSelect }) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [isSearching, setIsSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const searchTimeoutRef = useRef(null)
    const containerRef = useRef(null)

    useEffect(() => {
        if (query.length < 2) {
            setResults([])
            setShowResults(false)
            return
        }

        // Debounce search
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearching(true)
            try {
                const response = await axios.get('https://nominatim.openstreetmap.org/search', {
                    params: {
                        q: query,
                        format: 'json',
                        limit: 5,
                        addressdetails: 1,
                        namedetails: 1,
                        'accept-language': 'en'
                    }
                })
                setResults(response.data)
                setShowResults(true)
            } catch (error) {
                console.error('Search error:', error)
                setResults([])
            } finally {
                setIsSearching(false)
            }
        }, 500)

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [query])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowResults(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const handleSelect = (result) => {
        // Result is already localized to English via accept-language
        const city = result.address?.city ||
            result.address?.town ||
            result.address?.village ||
            result.namedetails?.['name:en'] ||
            result.name

        const country = result.address?.country ||
            result.namedetails?.['country:en'] ||
            ''

        onLocationSelect({
            city,
            country,
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
            displayName: result.display_name
        })

        setQuery('')
        setShowResults(false)
        setResults([])
    }

    return (
        <div className="location-search" ref={containerRef}>
            <div className="search-input-wrapper glass">
                <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search for a city..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setShowResults(true)}
                />
                {isSearching && (
                    <div className="search-spinner"></div>
                )}
            </div>

            {showResults && results.length > 0 && (
                <div className="search-results glass">
                    {results.map((result, index) => (
                        <div
                            key={index}
                            className="search-result-item"
                            onClick={() => handleSelect(result)}
                        >
                            <div className="result-name">{result.display_name}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default LocationSearch
