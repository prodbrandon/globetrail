"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Globe from "react-globe.gl"
import { AIRPORT_CITIES } from "@/lib/airport-cities"

interface City {
    name: string
    lng: number
    lat: number
    country: string
    color?: string
    roundTripMode?: boolean
    iata?: string
    continent?: string
}

interface Connection {
    id: string
    from: City
    to: City
    color: string
}

interface ReactGlobeEarthProps {
    width?: number
    height?: number
    className?: string
    onFlightSearch?: (locations: City[]) => void
}

// Convert airport cities to the City interface
const CITIES: City[] = AIRPORT_CITIES.map(city => ({
    name: city.name,
    lng: city.lng,
    lat: city.lat,
    country: city.country,
    iata: city.iata,
    continent: city.continent
}))

const MAX_CONNECTIONS = 3
const CONNECTION_COLORS = ["#00ff88", "#ff6b6b", "#ffd93d"]

// Function to determine if it's day or night based on current time
const isDayTime = (): boolean => {
    const now = new Date()
    const hour = now.getHours()
    // Consider day time from 6 AM to 6 PM
    return hour >= 6 && hour < 18
}

// Function to get appropriate globe texture and brightness
const getGlobeSettings = () => {
    const isDay = isDayTime()
    return {
        globeImageUrl: isDay
            ? "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            : "//unpkg.com/three-globe/example/img/earth-night.jpg",
        atmosphereColor: isDay ? "#87CEEB" : "#ffffff",
        atmosphereAltitude: isDay ? 0.15 : 0.1,
        backgroundImageUrl: isDay
            ? "//unpkg.com/three-globe/example/img/night-sky.png"
            : "//unpkg.com/three-globe/example/img/night-sky.png"
    }
}

// Function to format time for display
const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })
}

// Function to get timezone information
const getTimezoneInfo = (date: Date): string => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const offset = -date.getTimezoneOffset() / 60
    const offsetString = offset >= 0 ? `+${offset}` : `${offset}`
    return `${timezone} (UTC${offsetString})`
}

export default function ReactGlobeEarth({ className = "", onFlightSearch }: ReactGlobeEarthProps) {
    const globeRef = useRef<any>()
    const containerRef = useRef<HTMLDivElement>(null)
    const [selectedCities, setSelectedCities] = useState<City[]>([])
    const [connections, setConnections] = useState<Connection[]>([])
    const [hoveredCity, setHoveredCity] = useState<City | null>(null)
    const [autoRotate, setAutoRotate] = useState(true)
    const [isLoading, setIsLoading] = useState(true)
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
    const [roundTripMode, setRoundTripMode] = useState(false)
    const [globeSettings, setGlobeSettings] = useState(getGlobeSettings())
    const [currentTime, setCurrentTime] = useState(new Date())

    // Prepare cities data with colors based on selection state
    const citiesData = CITIES.map(city => {
        const isSelected = selectedCities.some(selected => selected.name === city.name)
        const isConnected = connections.some(conn =>
            conn.from.name === city.name || conn.to.name === city.name
        )
        const isHovered = hoveredCity?.name === city.name

        let color = "#ffffff" // Default white
        if (isSelected) color = "#ff6b6b" // Red for selected
        else if (isHovered) color = "#ffd93d" // Yellow for hovered
        else if (isConnected) color = "#00ff88" // Green for connected

        return {
            ...city,
            color,
            size: (isSelected || isHovered || isConnected) ? 0.4 : 0.15
        }
    })

    // Prepare arcs data for connections
    const arcsData = connections.map((connection) => ({
        startLat: connection.from.lat,
        startLng: connection.from.lng,
        endLat: connection.to.lat,
        endLng: connection.to.lng,
        color: connection.color,
        id: connection.id
    }))

    const generateConnectionId = (from: City, to: City): string => {
        return `${from.name}-${to.name}-${Date.now()}`
    }

    const addConnection = useCallback((from: City, to: City) => {
        setConnections(prev => {
            // Check if connection already exists
            const connectionExists = prev.some(conn =>
                (conn.from.name === from.name && conn.to.name === to.name) ||
                (conn.from.name === to.name && conn.to.name === from.name)
            )

            if (connectionExists) {
                return prev
            }

            // Calculate how many connections we'll add (1 or 2)
            const connectionsToAdd = roundTripMode ? 2 : 1
            if (prev.length + connectionsToAdd > MAX_CONNECTIONS) {
                return prev
            }

            const connections = []
            const baseColor = CONNECTION_COLORS[Math.floor(prev.length / (roundTripMode ? 2 : 1)) % CONNECTION_COLORS.length]

            // Add outbound connection
            connections.push({
                id: generateConnectionId(from, to),
                from,
                to,
                color: baseColor
            })

            // Add return connection if round-trip mode is enabled
            if (roundTripMode) {
                connections.push({
                    id: generateConnectionId(to, from),
                    from: to,
                    to: from,
                    color: baseColor
                })
            }

            return [...prev, ...connections]
        })
    }, [roundTripMode])

    const resetConnections = useCallback(() => {
        setSelectedCities([])
        setConnections([])
    }, [])

    const handleFlightSearch = useCallback(() => {
        if (selectedCities.length >= 2 && onFlightSearch) {
            // Pass cities with round trip mode information
            const citiesWithMode = selectedCities.map(city => ({
                ...city,
                roundTripMode
            }))
            onFlightSearch(citiesWithMode)
        }
    }, [selectedCities, onFlightSearch, roundTripMode])

    const handleCityClick = useCallback((city: any) => {
        const clickedCity = CITIES.find(c => c.name === city.name)
        if (!clickedCity) return

        setSelectedCities(prev => {
            // Check if city is already selected
            const alreadySelected = prev.some(city => city.name === clickedCity.name)

            if (alreadySelected) {
                // If clicking the same city, deselect it
                return prev.filter(city => city.name !== clickedCity.name)
            }

            if (prev.length === 0) {
                // First city selection
                return [clickedCity]
            } else {
                // Connect to the last selected city
                const lastCity = prev[prev.length - 1]
                addConnection(lastCity, clickedCity)
                return [...prev, clickedCity]
            }
        })
    }, [addConnection])

    const handleCityHover = useCallback((city: any) => {
        if (city) {
            const hoveredCity = CITIES.find(c => c.name === city.name)
            setHoveredCity(hoveredCity || null)
        } else {
            setHoveredCity(null)
        }
    }, [])

    // Auto-rotation effect
    useEffect(() => {
        if (!globeRef.current) return

        const controls = globeRef.current.controls()
        if (controls) {
            controls.autoRotate = autoRotate
            controls.autoRotateSpeed = 0.5
        }
    }, [autoRotate])

    // Handle loading state
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false)
        }, 2000) // Give globe time to load

        return () => clearTimeout(timer)
    }, [])

    // Update globe settings based on time of day
    useEffect(() => {
        const updateGlobeSettings = () => {
            setGlobeSettings(getGlobeSettings())
        }

        // Update immediately
        updateGlobeSettings()

        // Update every minute to catch day/night transitions
        const interval = setInterval(updateGlobeSettings, 60000)

        return () => clearInterval(interval)
    }, [])

    // Update current time every second
    useEffect(() => {
        const updateTime = () => {
            setCurrentTime(new Date())
        }

        // Update immediately
        updateTime()

        // Update every second
        const interval = setInterval(updateTime, 1000)

        return () => clearInterval(interval)
    }, [])

    // Handle container resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current
                setDimensions({
                    width: clientWidth,
                    height: clientHeight
                })
            }
        }

        updateDimensions()

        const resizeObserver = new ResizeObserver(updateDimensions)
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current)
        }

        return () => {
            resizeObserver.disconnect()
        }
    }, [])

    return (
        <div ref={containerRef} className={`relative w-full h-full ${className}`}>
            <Globe
                ref={globeRef}
                width={dimensions.width}
                height={dimensions.height}
                globeImageUrl={globeSettings.globeImageUrl}
                bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                backgroundImageUrl={globeSettings.backgroundImageUrl}

                // Points (cities)
                pointsData={citiesData}
                pointAltitude={0.01}
                pointColor="color"
                pointRadius="size"
                pointLabel={(d: any) => `
          <div style="
            background: rgba(0,0,0,0.8); 
            padding: 6px 10px; 
            border-radius: 4px; 
            color: white; 
            font-size: 12px;
            border: 1px solid ${d.color};
            max-width: 200px;
          ">
            <strong>${d.name}</strong><br/>
            ${d.country}${d.iata ? ` (${d.iata})` : ''}
          </div>
        `}
                onPointClick={handleCityClick}
                onPointHover={handleCityHover}

                // Arcs (connections)
                arcsData={arcsData}
                arcColor="color"
                arcDashLength={0.4}
                arcDashGap={0.2}
                arcDashAnimateTime={2000}
                arcStroke={0.5}
                arcAltitude={0.1}

                // Globe settings
                atmosphereColor={globeSettings.atmosphereColor}
                atmosphereAltitude={globeSettings.atmosphereAltitude}
                enablePointerInteraction={true}

                // Animation settings
                animateIn={true}
                waitForGlobeReady={true}

            />

            {/* Clock Display */}
            <div className="absolute top-4 left-4 text-white px-3 py-2 rounded-md bg-black/60 backdrop-blur z-10 font-mono">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block w-2 h-2 rounded-full ${isDayTime() ? 'bg-yellow-400' : 'bg-blue-400'}`}></span>
                    <span className="text-lg font-bold">{formatTime(currentTime)}</span>
                </div>
                <div className="text-xs text-white/70">
                    {getTimezoneInfo(currentTime)}
                </div>
                <div className="text-xs text-white/70 mt-1">
                    {currentTime.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}
                </div>
            </div>

            {/* Loading state */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <p className="text-white/70 text-sm font-mono">Loading Globe...</p>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="absolute bottom-4 left-4 text-xs text-white/70 px-2 py-1 rounded-md bg-black/50 backdrop-blur z-10">
                <div>Click cities to create {roundTripMode ? 'round-trip' : 'one-way'} connections ({connections.length}/{MAX_CONNECTIONS})</div>
                <div className="mt-1">Drag to rotate • Scroll to zoom • {CITIES.length} airports worldwide</div>
                <div className="mt-1 flex items-center gap-1">
                    <span className={`inline-block w-2 h-2 rounded-full ${isDayTime() ? 'bg-yellow-400' : 'bg-blue-400'}`}></span>
                    {isDayTime() ? '☀️ Day Mode' : '🌙 Night Mode'}
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 right-4 flex gap-2 z-10">
                <button
                    onClick={() => setAutoRotate(!autoRotate)}
                    className={`px-3 py-1 text-xs rounded-md backdrop-blur transition-colors ${autoRotate ? "bg-blue-600/80 text-white" : "bg-gray-900/80 text-white/70 hover:bg-gray-800/80"
                        }`}
                >
                    {autoRotate ? "Stop Rotation" : "Auto Rotate"}
                </button>

                <button
                    onClick={() => setRoundTripMode(!roundTripMode)}
                    className={`px-3 py-1 text-xs rounded-md backdrop-blur transition-colors ${roundTripMode
                        ? "bg-green-600/80 text-white"
                        : "bg-gray-900/80 text-white/70 hover:bg-gray-800/80"
                        }`}
                >
                    {roundTripMode ? "Round Trip ✈️" : "One Way →"}
                </button>

                {selectedCities.length >= 2 && (
                    <button
                        onClick={handleFlightSearch}
                        className="px-3 py-1 text-xs rounded-md bg-blue-600/80 text-white backdrop-blur hover:bg-blue-700/80 transition-colors animate-pulse"
                    >
                        Search Flights ✈️
                    </button>
                )}

                <button
                    onClick={resetConnections}
                    className="px-3 py-1 text-xs rounded-md bg-red-600/80 text-white backdrop-blur hover:bg-red-700/80 transition-colors"
                    disabled={connections.length === 0}
                >
                    Reset ({connections.length})
                </button>
            </div>

            {/* Connection Status - Only show when at max limit */}
            {connections.length >= MAX_CONNECTIONS && (
                <div className="absolute top-24 left-4 text-sm text-white px-3 py-2 rounded-md bg-red-600/80 backdrop-blur z-10">
                    🚫 Maximum connections reached! Reset to start over.
                </div>
            )}

            {/* Connection List */}
            {connections.length > 0 && (
                <div className="absolute top-4 right-4 text-sm text-white max-w-64 z-10">
                    <div className="bg-green-600/80 backdrop-blur px-3 py-2 rounded-md">
                        <div className="font-semibold mb-1">Active Connections:</div>
                        {connections.map((conn) => (
                            <div key={conn.id} className="text-xs opacity-90">
                                <span
                                    className="inline-block w-2 h-2 rounded-full mr-2"
                                    style={{ backgroundColor: conn.color }}
                                ></span>
                                {conn.from.name} → {conn.to.name}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}