"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as d3 from "d3"

interface City {
  name: string
  lng: number
  lat: number
  country: string
}

interface Connection {
  id: string
  from: City
  to: City
  pathPoints: [number, number][]
  animationProgress: number
}

interface RotatingEarthProps {
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

export default function RotatingEarth({ className = "" }: RotatingEarthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number>()
  const rotationTimerRef = useRef<d3.Timer>()

  // Cached refs for performance
  const projectionRef = useRef<d3.GeoProjection>()
  const pathRef = useRef<d3.GeoPath>()
  const contextRef = useRef<CanvasRenderingContext2D>()
  const landFeaturesRef = useRef<any>()
  const rotationRef = useRef<[number, number]>([0, 0])
  const dimensionsRef = useRef({ width: 0, height: 0, radius: 0, scaleFactor: 1 })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCities, setSelectedCities] = useState<City[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [hoveredCity, setHoveredCity] = useState<City | null>(null)
  const [isInteracting, setIsInteracting] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)

  const generateConnectionId = (from: City, to: City): string => {
    return `${from.name}-${to.name}-${Date.now()}`
  }

  const computeFlightPath = useCallback((from: City, to: City): [number, number][] => {
    const points: [number, number][] = []
    const interpolate = d3.geoInterpolate([from.lng, from.lat], [to.lng, to.lat])

    for (let i = 0; i <= 50; i++) {
      const t = i / 50
      const point = interpolate(t)
      points.push([point[0], point[1]])
    }

    return points
  }, [])

  const addConnection = useCallback((from: City, to: City) => {
    setConnections(prev => {
      // Check if connection already exists using the current state
      const connectionExists = prev.some(conn => 
        (conn.from.name === from.name && conn.to.name === to.name) ||
        (conn.from.name === to.name && conn.to.name === from.name)
      )
      
      if (connectionExists || prev.length >= MAX_CONNECTIONS) {
        console.log('Connection blocked:', { connectionExists, maxReached: prev.length >= MAX_CONNECTIONS })
        return prev
      }
      
      const connectionId = generateConnectionId(from, to)
      const pathPoints = computeFlightPath(from, to)
      
      const newConnection: Connection = {
        id: connectionId,
        from,
        to,
        pathPoints,
        animationProgress: 0
      }

      console.log('Adding connection:', newConnection)
      return [...prev, newConnection]
    })
  }, [computeFlightPath])

  const resetConnections = useCallback(() => {
    setSelectedCities([])
    setConnections([])
  }, [])

  const getConnectedCities = useCallback((): City[] => {
    const connectedCityNames = new Set<string>()
    connections.forEach(conn => {
      connectedCityNames.add(conn.from.name)
      connectedCityNames.add(conn.to.name)
    })
    return Array.from(connectedCityNames).map(name => 
      CITIES.find(city => city.name === name)!
    ).filter(Boolean)
  }, [connections])

  const renderScene = useCallback(() => {
    if (!contextRef.current || !projectionRef.current || !pathRef.current) return

    const context = contextRef.current
    const projection = projectionRef.current
    const path = pathRef.current
    const { width: containerWidth, height: containerHeight, scaleFactor } = dimensionsRef.current

    // Clear canvas
    context.clearRect(0, 0, containerWidth, containerHeight)

    // Draw globe background
    context.beginPath()
    context.arc(containerWidth / 2, containerHeight / 2, projection.scale(), 0, 2 * Math.PI)
    context.fillStyle = "#000000"
    context.fill()
    context.strokeStyle = "#ffffff"
    context.lineWidth = 2 * scaleFactor
    context.stroke()

    if (landFeaturesRef.current) {
      // Draw graticule (grid lines)
      if (!isInteracting) {
        const graticule = d3.geoGraticule().step([30, 30])
        context.beginPath()
        path(graticule())
        context.strokeStyle = "#ffffff"
        context.lineWidth = 0.5 * scaleFactor
        context.globalAlpha = 0.15
        context.stroke()
        context.globalAlpha = 1
      }

      // Draw land features
      context.beginPath()
      landFeaturesRef.current.features.forEach((feature: any) => {
        path(feature)
      })
      context.strokeStyle = "#ffffff"
      context.lineWidth = 1 * scaleFactor
      context.stroke()

      // Draw all connections
      if (connections.length > 0) {
        console.log('Rendering connections:', connections.length)
      }
      
      connections.forEach((connection, index) => {
        const visiblePoints = connection.pathPoints
          .map((point) => projection(point))
          .filter((point) => point !== null)

        console.log(`Connection ${index}: ${visiblePoints.length} visible points, progress: ${connection.animationProgress}`)

        if (visiblePoints.length > 1) {
          // Different colors for different connections
          const colors = ["#00ff88", "#ff6b6b", "#ffd93d"]
          const color = colors[index % colors.length]

          // Draw full path (faded)
          context.beginPath()
          visiblePoints.forEach((point, i) => {
            if (i === 0) {
              context.moveTo(point![0], point![1])
            } else {
              context.lineTo(point![0], point![1])
            }
          })
          context.strokeStyle = color
          context.lineWidth = 3 * scaleFactor
          context.globalAlpha = 0.3
          context.stroke()
          context.globalAlpha = 1

          // Draw animated portion
          const animatedLength = Math.floor(visiblePoints.length * connection.animationProgress)
          if (animatedLength > 1) {
            context.beginPath()
            for (let i = 0; i < animatedLength; i++) {
              const point = visiblePoints[i]
              if (i === 0) {
                context.moveTo(point![0], point![1])
              } else {
                context.lineTo(point![0], point![1])
              }
            }
            context.strokeStyle = color
            context.lineWidth = 4 * scaleFactor
            context.stroke()

            // Draw moving point
            if (animatedLength < visiblePoints.length) {
              const currentPoint = visiblePoints[animatedLength - 1]
              if (currentPoint) {
                context.beginPath()
                context.arc(currentPoint[0], currentPoint[1], 6 * scaleFactor, 0, 2 * Math.PI)
                context.fillStyle = "#ffffff"
                context.fill()
                context.strokeStyle = color
                context.lineWidth = 2 * scaleFactor
                context.stroke()
              }
            }
          }
        }
      })

      // Draw cities
      const connectedCities = getConnectedCities()
      
      CITIES.forEach((city) => {
        const projected = projection([city.lng, city.lat])

        if (projected) {
          // Calculate visibility based on sphere projection
          const rotated = projection.rotate()
          const lambda = city.lng + rotated[0]
          const phi = city.lat - rotated[1]
          const isVisible = Math.cos((lambda * Math.PI) / 180) * Math.cos((phi * Math.PI) / 180) > 0

          if (!isVisible) return

          const isSelected = selectedCities.some(selected => selected.name === city.name)
          const isHovered = hoveredCity?.name === city.name
          const isConnected = connectedCities.some(connected => connected.name === city.name)

          const radius = (isSelected || isHovered || isConnected) ? 10 * scaleFactor : 6 * scaleFactor

          // Glow effect
          if (isSelected || isHovered || isConnected) {
            context.beginPath()
            context.arc(projected[0], projected[1], radius + 4, 0, 2 * Math.PI)
            // Priority: Selected > Hovered > Connected
            if (isSelected) {
              context.fillStyle = "#ff6b6b33" // Red glow for selected
            } else if (isHovered) {
              context.fillStyle = "#ffd93d33" // Yellow glow for hovered
            } else if (isConnected) {
              context.fillStyle = "#00ff8833" // Green glow for connected
            }
            context.fill()
          }

          // Main city dot
          context.beginPath()
          context.arc(projected[0], projected[1], radius, 0, 2 * Math.PI)

          // Priority: Selected > Hovered > Connected > Default
          if (isSelected) {
            context.fillStyle = "#ff6b6b" // Keep selected cities red
          } else if (isHovered) {
            context.fillStyle = "#ffd93d" // Hovered cities yellow
          } else if (isConnected) {
            context.fillStyle = "#00ff88" // Connected cities green
          } else {
            context.fillStyle = "#ffffff" // Default cities white
          }
          context.fill()

          context.strokeStyle = "#000000"
          context.lineWidth = 2 * scaleFactor
          context.stroke()

          // City label
          if (isSelected || isHovered || isConnected) {
            context.font = `bold ${12 * scaleFactor}px Arial`
            context.textAlign = "center"
            const textWidth = context.measureText(city.name).width

            context.fillStyle = "rgba(0, 0, 0, 0.8)"
            context.fillRect(projected[0] - textWidth / 2 - 4, projected[1] - 25 * scaleFactor - 4, textWidth + 8, 18)

            context.fillStyle = "#ffffff"
            context.fillText(city.name, projected[0], projected[1] - 12 * scaleFactor)
          }
        }
      })
    }
  }, [selectedCities, hoveredCity, connections, isInteracting, getConnectedCities])

  const getCityAtPosition = useCallback((mouseX: number, mouseY: number): City | null => {
    if (!projectionRef.current) return null

    const cityRadius = 15

    for (const city of CITIES) {
      const projected = projectionRef.current([city.lng, city.lat])
      if (projected) {
        const distance = Math.sqrt(Math.pow(projected[0] - mouseX, 2) + Math.pow(projected[1] - mouseY, 2))
        if (distance <= cityRadius) {
          return city
        }
      }
    }

    return null
  }, [])

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    const canvas = canvasRef.current
    const container = containerRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    contextRef.current = context

    const loadWorldData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(
          "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json",
        )
        if (!response.ok) throw new Error("Failed to load land data")
        landFeaturesRef.current = await response.json()
        renderScene()
        setIsLoading(false)
      } catch (err) {
        setError("Failed to load land map data")
        setIsLoading(false)
      }
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: containerWidth, height: containerHeight } = entry.contentRect
        const radius = Math.min(containerWidth, containerHeight) / 2.1

        dimensionsRef.current = {
          width: containerWidth,
          height: containerHeight,
          radius,
          scaleFactor: radius / 200,
        }

        const dpr = window.devicePixelRatio || 1
        canvas.width = containerWidth * dpr
        canvas.height = containerHeight * dpr
        canvas.style.width = `${containerWidth}px`
        canvas.style.height = `${containerHeight}px`
        context.scale(dpr, dpr)

        projectionRef.current = d3
          .geoOrthographic()
          .scale(radius)
          .translate([containerWidth / 2, containerHeight / 2])
          .clipAngle(90)

        pathRef.current = d3.geoPath().projection(projectionRef.current).context(context)
        renderScene()
      }
    })

    const rotate = () => {
      if (autoRotate && !isInteracting && projectionRef.current) {
        rotationRef.current[0] += 0.2
        projectionRef.current.rotate(rotationRef.current)
        renderScene()
      }
    }

    const animate = () => {
      // Animate all connections
      setConnections(prev => {
        const updated = prev.map(conn => ({
          ...conn,
          animationProgress: Math.min(conn.animationProgress + 0.01, 1)
        }))
        
        // Only update if there are actual changes
        const hasChanges = updated.some((conn, index) => 
          prev[index] && conn.animationProgress !== prev[index].animationProgress
        )
        
        return hasChanges ? updated : prev
      })
      
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    let mouseMoveTimeout: NodeJS.Timeout
    const handleMouseMove = (event: MouseEvent) => {
      if (isInteracting) return

      clearTimeout(mouseMoveTimeout)
      mouseMoveTimeout = setTimeout(() => {
        const rect = canvas.getBoundingClientRect()
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top

        const cityAtMouse = getCityAtPosition(mouseX, mouseY)
        setHoveredCity(cityAtMouse)
        canvas.style.cursor = cityAtMouse ? "pointer" : "grab"
      }, 10)
    }

    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top

      const clickedCity = getCityAtPosition(mouseX, mouseY)

      if (clickedCity) {
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
      }
    }

    const handleMouseDown = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top

      if (getCityAtPosition(mouseX, mouseY)) {
        return
      }

      setIsInteracting(true)
      if (rotationTimerRef.current) {
        rotationTimerRef.current.stop()
        rotationTimerRef.current = undefined
      }

      const startX = event.clientX
      const startY = event.clientY
      const startRotation = [...rotationRef.current]

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const sensitivity = 0.3
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY

        rotationRef.current[0] = startRotation[0] + dx * sensitivity
        rotationRef.current[1] = startRotation[1] - dy * sensitivity
        rotationRef.current[1] = Math.max(-90, Math.min(90, rotationRef.current[1]))

        if (projectionRef.current) {
          projectionRef.current.rotate(rotationRef.current)
          renderScene()
        }
      }

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        setIsInteracting(false)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (!projectionRef.current) return

      const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1
      const { radius } = dimensionsRef.current
      const newRadius = Math.max(radius * 0.5, Math.min(radius * 3, projectionRef.current.scale() * scaleFactor))
      projectionRef.current.scale(newRadius)
      renderScene()
    }

    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("click", handleClick)
    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("wheel", handleWheel)

    resizeObserver.observe(container)
    loadWorldData()
    animate()

    if (autoRotate) {
      rotationTimerRef.current = d3.timer(rotate)
    }

    return () => {
      clearTimeout(mouseMoveTimeout)
      resizeObserver.disconnect()
      if (rotationTimerRef.current) {
        rotationTimerRef.current.stop()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("click", handleClick)
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("wheel", handleWheel)
    }
  }, []) // Empty dependency array - only run once

  useEffect(() => {
    if (autoRotate && !isInteracting && !rotationTimerRef.current) {
      const rotate = () => {
        if (autoRotate && !isInteracting && projectionRef.current) {
          rotationRef.current[0] += 0.2
          projectionRef.current.rotate(rotationRef.current)
          renderScene()
        }
      }
      rotationTimerRef.current = d3.timer(rotate)
    } else if (!autoRotate && rotationTimerRef.current) {
      rotationTimerRef.current.stop()
      rotationTimerRef.current = undefined
    }
  }, [autoRotate, isInteracting, renderScene])

  useEffect(() => {
    renderScene()
  }, [selectedCities, hoveredCity, connections, renderScene])

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-card rounded-2xl p-8 ${className}`}>
        <div className="text-center">
          <p className="text-destructive font-semibold mb-2">Error loading Earth visualization</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full bg-black"
        style={{ maxWidth: "100%", height: "100%", display: "block" }}
      />
      
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-white/70 text-sm font-mono">Loading Earth...</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 text-xs text-white/70 px-2 py-1 rounded-md bg-black/50 backdrop-blur">
        <div>Click cities to create connections ({connections.length}/{MAX_CONNECTIONS})</div>
        <div className="mt-1">Drag to rotate • Scroll to zoom</div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`px-3 py-1 text-xs rounded-md backdrop-blur transition-colors ${
            autoRotate ? "bg-blue-600/80 text-white" : "bg-gray-900/80 text-white/70 hover:bg-gray-800/80"
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
        <div className="absolute top-4 left-4 text-sm text-white px-3 py-2 rounded-md bg-red-600/80 backdrop-blur">
          🚫 Maximum connections reached! Reset to start over.
        </div>
      )}

      {/* Connection List */}
      {connections.length > 0 && (
        <div className="absolute top-4 right-4 text-sm text-white max-w-64">
          <div className="bg-green-600/80 backdrop-blur px-3 py-2 rounded-md">
            <div className="font-semibold mb-1">Active Connections:</div>
            {connections.map((conn, index) => (
              <div key={conn.id} className="text-xs opacity-90">
                {index + 1}. {conn.from.name} → {conn.to.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}