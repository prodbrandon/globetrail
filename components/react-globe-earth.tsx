"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Globe from "react-globe.gl"

interface City {
    name: string
    lng: number
    lat: number
    country: string
    color?: string
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
}

// Major world cities data
const CITIES: City[] = [
    { name: "New York", lng: -74.006, lat: 40.7128, country: "USA" },
    { name: "London", lng: -0.1276, lat: 51.5074, country: "UK" },
    { name: "Tokyo", lng: 139.6503, lat: 35.6762, country: "Japan" },
    { name: "Paris", lng: 2.3522, lat: 48.8566, country: "France" },
    { name: "Sydney", lng: 151.2093, lat: -33.8688, country: "Australia" },
    { name: "Dubai", lng: 55.2708, lat: 25.2048, country: "UAE" },
    { name: "Los Angeles", lng: -118.2437, lat: 34.0522, country: "USA" },
    { name: "Singapore", lng: 103.8198, lat: 1.3521, country: "Singapore" },
    { name: "Hong Kong", lng: 114.1694, lat: 22.3193, country: "China" },
    { name: "Mumbai", lng: 72.8777, lat: 19.076, country: "India" },
    { name: "São Paulo", lng: -46.6333, lat: -23.5505, country: "Brazil" },
    { name: "Cairo", lng: 31.2357, lat: 30.0444, country: "Egypt" },
    { name: "Moscow", lng: 37.6173, lat: 55.7558, country: "Russia" },
    { name: "Mexico City", lng: -99.1332, lat: 19.4326, country: "Mexico" },
    { name: "Cape Town", lng: 18.4241, lat: -33.9249, country: "South Africa" },
]

const MAX_CONNECTIONS = 3
const CONNECTION_COLORS = ["#00ff88", "#ff6b6b", "#ffd93d"]

export default function ReactGlobeEarth({ className = "" }: ReactGlobeEarthProps) {
    const globeRef = useRef<any>()
    const containerRef = useRef<HTMLDivElement>(null)
    const [selectedCities, setSelectedCities] = useState<City[]>([])
    const [connections, setConnections] = useState<Connection[]>([])
    const [hoveredCity, setHoveredCity] = useState<City | null>(null)
    const [autoRotate, setAutoRotate] = useState(true)
    const [isLoading, setIsLoading] = useState(true)
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

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
            size: (isSelected || isHovered || isConnected) ? 0.8 : 0.5
        }
    })

    // Prepare arcs data for connections
    const arcsData = connections.map((connection, index) => ({
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

            if (connectionExists || prev.length >= MAX_CONNECTIONS) {
                return prev
            }

            const connectionId = generateConnectionId(from, to)
            const color = CONNECTION_COLORS[prev.length % CONNECTION_COLORS.length]

            const newConnection: Connection = {
                id: connectionId,
                from,
                to,
                color
            }

            return [...prev, newConnection]
        })
    }, [])

    const resetConnections = useCallback(() => {
        setSelectedCities([])
        setConnections([])
    }, [])

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
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

                // Points (cities)
                pointsData={citiesData}
                pointAltitude={0.01}
                pointColor="color"
                pointRadius="size"
                pointLabel={(d: any) => `
          <div style="
            background: rgba(0,0,0,0.8); 
            padding: 8px 12px; 
            border-radius: 6px; 
            color: white; 
            font-size: 14px;
            border: 1px solid ${d.color};
          ">
            <strong>${d.name}</strong><br/>
            ${d.country}
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
                atmosphereColor="#ffffff"
                atmosphereAltitude={0.1}
                enablePointerInteraction={true}

                // Animation settings
                animateIn={true}
                waitForGlobeReady={true}

            />

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
                <div>Click cities to create connections ({connections.length}/{MAX_CONNECTIONS})</div>
                <div className="mt-1">Drag to rotate • Scroll to zoom</div>
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
                    onClick={resetConnections}
                    className="px-3 py-1 text-xs rounded-md bg-red-600/80 text-white backdrop-blur hover:bg-red-700/80 transition-colors"
                    disabled={connections.length === 0}
                >
                    Reset ({connections.length})
                </button>
            </div>

            {/* Connection Status - Only show when at max limit */}
            {connections.length >= MAX_CONNECTIONS && (
                <div className="absolute top-4 left-4 text-sm text-white px-3 py-2 rounded-md bg-red-600/80 backdrop-blur z-10">
                    🚫 Maximum connections reached! Reset to start over.
                </div>
            )}

            {/* Connection List */}
            {connections.length > 0 && (
                <div className="absolute top-4 right-4 text-sm text-white max-w-64 z-10">
                    <div className="bg-green-600/80 backdrop-blur px-3 py-2 rounded-md">
                        <div className="font-semibold mb-1">Active Connections:</div>
                        {connections.map((conn, index) => (
                            <div key={conn.id} className="text-xs opacity-90">
                                <span
                                    className="inline-block w-2 h-2 rounded-full mr-2"
                                    style={{ backgroundColor: conn.color }}
                                ></span>
                                {index + 1}. {conn.from.name} → {conn.to.name}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}