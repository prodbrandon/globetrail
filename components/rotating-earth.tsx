"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

interface RotatingEarthProps {
  width?: number
  height?: number
  className?: string
}

export default function RotatingEarth({ width = 800, height = 600, className = "" }: RotatingEarthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    const canvas = canvasRef.current
    const container = containerRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: containerWidth, height: containerHeight } = entry.contentRect
        const radius = Math.min(containerWidth, containerHeight) / 2.1

        const dpr = window.devicePixelRatio || 1
        canvas.width = containerWidth * dpr
        canvas.height = containerHeight * dpr
        canvas.style.width = `${containerWidth}px`
        canvas.style.height = `${containerHeight}px`
        context.scale(dpr, dpr)

        const projection = d3
          .geoOrthographic()
          .scale(radius)
          .translate([containerWidth / 2, containerHeight / 2])
          .clipAngle(90)

        const path = d3.geoPath().projection(projection).context(context)

        const pointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
          const [x, y] = point
          let inside = false

          for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const [xi, yi] = polygon[i]
            const [xj, yj] = polygon[j]

            if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
              inside = !inside
            }
          }

          return inside
        }

        const pointInFeature = (point: [number, number], feature: any): boolean => {
          const geometry = feature.geometry

          if (geometry.type === "Polygon") {
            const coordinates = geometry.coordinates
            if (!pointInPolygon(point, coordinates[0])) {
              return false
            }
            for (let i = 1; i < coordinates.length; i++) {
              if (pointInPolygon(point, coordinates[i])) {
                return false
              }
            }
            return true
          } else if (geometry.type === "MultiPolygon") {
            for (const polygon of geometry.coordinates) {
              if (pointInPolygon(point, polygon[0])) {
                let inHole = false
                for (let i = 1; i < polygon.length; i++) {
                  if (pointInPolygon(point, polygon[i])) {
                    inHole = true
                    break
                  }
                }
                if (!inHole) {
                  return true
                }
              }
            }
            return false
          }

          return false
        }

        const generateDotsInPolygon = (feature: any, dotSpacing = 16) => {
          const dots: [number, number][] = []
          const bounds = d3.geoBounds(feature)
          const [[minLng, minLat], [maxLng, maxLat]] = bounds

          const stepSize = dotSpacing * 0.08
          let pointsGenerated = 0

          for (let lng = minLng; lng <= maxLng; lng += stepSize) {
            for (let lat = minLat; lat <= maxLat; lat += stepSize) {
              const point: [number, number] = [lng, lat]
              if (pointInFeature(point, feature)) {
                dots.push(point)
                pointsGenerated++
              }
            }
          }

          return dots
        }

        interface DotData {
          lng: number
          lat: number
          visible: boolean
        }

        const allDots: DotData[] = []
        let landFeatures: any

        const render = () => {
          context.clearRect(0, 0, containerWidth, containerHeight)

          const currentScale = projection.scale()
          const scaleFactor = currentScale / radius

          context.beginPath()
          context.arc(containerWidth / 2, containerHeight / 2, currentScale, 0, 2 * Math.PI)
          context.fillStyle = "#000000"
          context.fill()
          context.strokeStyle = "#ffffff"
          context.lineWidth = 2 * scaleFactor
          context.stroke()

          if (landFeatures) {
            const graticule = d3.geoGraticule()
            context.beginPath()
            path(graticule())
            context.strokeStyle = "#ffffff"
            context.lineWidth = 1 * scaleFactor
            context.globalAlpha = 0.25
            context.stroke()
            context.globalAlpha = 1

            context.beginPath()
            landFeatures.features.forEach((feature: any) => {
              path(feature)
            })
            context.strokeStyle = "#ffffff"
            context.lineWidth = 1 * scaleFactor
            context.stroke()

            allDots.forEach((dot) => {
              const projected = projection([dot.lng, dot.lat])
              if (
                projected &&
                projected[0] >= 0 &&
                projected[0] <= containerWidth &&
                projected[1] >= 0 &&
                projected[1] <= containerHeight
              ) {
                context.beginPath()
                context.arc(projected[0], projected[1], 1.2 * scaleFactor, 0, 2 * Math.PI)
                context.fillStyle = "#999999"
                context.fill()
              }
            })
          }
        }

        const loadWorldData = async () => {
          try {
            setIsLoading(true)

            const response = await fetch(
              "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json",
            )
            if (!response.ok) throw new Error("Failed to load land data")

            landFeatures = await response.json()

            let totalDots = 0
            landFeatures.features.forEach((feature: any) => {
              const dots = generateDotsInPolygon(feature, 16)
              dots.forEach(([lng, lat]) => {
                allDots.push({ lng, lat, visible: true })
                totalDots++
              })
            })

            render()
            setIsLoading(false)
          } catch (err) {
            setError("Failed to load land map data")
            setIsLoading(false)
          }
        }

        const rotation = [0, 0]
        let autoRotate = false
        const rotationSpeed = 0

        const rotate = () => {
          if (autoRotate) {
            rotation[0] += rotationSpeed
            projection.rotate(rotation)
            render()
          }
        }

        const rotationTimer = d3.timer(rotate)

        const handleMouseDown = (event: MouseEvent) => {
          autoRotate = false
          const startX = event.clientX
          const startY = event.clientY
          const startRotation = [...rotation]

          const handleMouseMove = (moveEvent: MouseEvent) => {
            const sensitivity = 0.5
            const dx = moveEvent.clientX - startX
            const dy = moveEvent.clientY - startY

            rotation[0] = startRotation[0] + dx * sensitivity
            rotation[1] = startRotation[1] - dy * sensitivity
            rotation[1] = Math.max(-90, Math.min(90, rotation[1]))

            projection.rotate(rotation)
            render()
          }

          const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("mouseup", handleMouseUp)

            setTimeout(() => {
              autoRotate = true
            }, 10)
          }

          document.addEventListener("mousemove", handleMouseMove)
          document.addEventListener("mouseup", handleMouseUp)
        }

        const handleWheel = (event: WheelEvent) => {
          event.preventDefault()
          const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1
          const newRadius = Math.max(radius * 0.5, Math.min(radius * 3, projection.scale() * scaleFactor))
          projection.scale(newRadius)
          render()
        }

        canvas.addEventListener("mousedown", handleMouseDown)
        canvas.addEventListener("wheel", handleWheel)

        loadWorldData()

        return () => {
          rotationTimer.stop()
          canvas.removeEventListener("mousedown", handleMouseDown)
          canvas.removeEventListener("wheel", handleWheel)
        }
      }
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  if (error) {
    return (
      <div className={`dark flex items-center justify-center bg-card rounded-2xl p-8 ${className}`}>
        <div className="text-center">
          <p className="dark text-destructive font-semibold mb-2">Error loading Earth visualization</p>
          <p className="dark text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full bg-black dark"
        style={{ maxWidth: "100%", height: "100%", display: "block" }}
      />
      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground px-2 py-1 rounded-md dark bg-neutral-900">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  )
}
