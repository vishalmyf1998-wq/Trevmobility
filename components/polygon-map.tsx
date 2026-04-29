'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CityPolygon, City } from '@/lib/types'

// City centers for initial map view
const cityCenters: Record<string, [number, number]> = {
  'Mumbai': [19.0760, 72.8777],
  'Delhi': [28.6139, 77.2090],
  'Bangalore': [12.9716, 77.5946],
  'Chennai': [13.0827, 80.2707],
}

const defaultCenter: [number, number] = [19.0760, 72.8777]

// Create marker icon
const markerIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      width: 12px;
      height: 12px;
      background-color: #ef4444;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
})

function MapController({ mode, center }: { mode: 'view' | 'draw', center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    if (mode === 'draw') {
      map.doubleClickZoom.disable()
      // Disable drag to make drawing easier? (Optional, but let's just do double click zoom)
    } else {
      map.doubleClickZoom.enable()
    }
  }, [map, mode])

  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom(), { animate: true })
    }
  }, [map, center[0], center[1]])

  return null
}

interface DrawingLayerProps {
  points: { lat: number; lng: number }[]
  setPoints: (points: { lat: number; lng: number }[]) => void
  onComplete: (points: { lat: number; lng: number }[]) => void
}

function DrawingLayer({ points, setPoints, onComplete }: DrawingLayerProps) {
  const pointsRef = useRef(points)

  useEffect(() => {
    pointsRef.current = points
  }, [points])

  useMapEvents({
    click: (e) => {
      const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng }
      setPoints([...pointsRef.current, newPoint])
    },
    dblclick: () => {
      if (pointsRef.current.length >= 3) {
        onComplete(pointsRef.current)
      }
    },
  })

  return (
    <>
      {points.map((point, index) => (
        <Marker
          key={index}
          position={[point.lat, point.lng]}
          icon={markerIcon}
          interactive={false}
        />
      ))}
      {points.length >= 2 && (
        <Polygon
          positions={points.map(p => [p.lat, p.lng] as [number, number])}
          interactive={false}
          pathOptions={{
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.2,
            weight: 2,
            dashArray: '5, 5',
          }}
        />
      )}
    </>
  )
}

interface PolygonMapProps {
  polygons: CityPolygon[]
  cities: City[]
  getCity: (id: string) => City | undefined
  mode?: 'view' | 'draw'
  onPolygonDrawn?: (coordinates: { lat: number; lng: number }[]) => void
  selectedCity?: string
}

export default function PolygonMap({
  polygons,
  cities,
  getCity,
  mode = 'view',
  onPolygonDrawn,
  selectedCity,
}: PolygonMapProps) {
  const [drawingPoints, setDrawingPoints] = useState<{ lat: number; lng: number }[]>([])

  useEffect(() => {
    if (mode === 'view') {
      setDrawingPoints([])
    }
  }, [mode])

  // Calculate center based on selected city or polygons
  const center = selectedCity
    ? cityCenters[getCity(selectedCity)?.name || ''] || defaultCenter
    : polygons.length > 0 && polygons[0].coordinates.length > 0
    ? [
        polygons[0].coordinates.reduce((sum, c) => sum + c.lat, 0) / polygons[0].coordinates.length,
        polygons[0].coordinates.reduce((sum, c) => sum + c.lng, 0) / polygons[0].coordinates.length,
      ] as [number, number]
    : defaultCenter

  const handleComplete = useCallback((points: { lat: number; lng: number }[]) => {
    if (onPolygonDrawn) {
      onPolygonDrawn(points)
    }
    setDrawingPoints([])
  }, [onPolygonDrawn])

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border relative z-0">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        doubleClickZoom={mode !== 'draw'}
      >
        <MapController mode={mode} center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        />
        
        {/* Existing polygons */}
        {polygons.map((polygon) => (
          <Polygon
            key={polygon.id}
            positions={polygon.coordinates.map(c => [c.lat, c.lng] as [number, number])}
            interactive={false}
            pathOptions={{
              color: polygon.color,
              fillColor: polygon.color,
              fillOpacity: 0.3,
              weight: 2,
            }}
          />
        ))}

        {/* Drawing mode */}
        {mode === 'draw' && (
          <DrawingLayer
            points={drawingPoints}
            setPoints={setDrawingPoints}
            onComplete={handleComplete}
          />
        )}
      </MapContainer>
      
      {mode === 'draw' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] p-3 bg-background/95 backdrop-blur shadow-lg rounded-lg border text-sm text-center flex flex-col gap-2 items-center">
          <p className="font-medium">
            {drawingPoints.length < 3 ? 'Click to add at least 3 points.' : 'Double-click to finish or click Complete.'}
          </p>
          <div className="flex gap-2">
            <button 
              type="button"
              className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium disabled:opacity-50"
              disabled={drawingPoints.length < 3}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (drawingPoints.length >= 3) {
                  handleComplete(drawingPoints);
                }
              }}
            >
              Complete Polygon
            </button>
            <button 
              type="button"
              className="px-3 py-1 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md text-xs font-medium disabled:opacity-50"
              disabled={drawingPoints.length === 0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDrawingPoints([]);
              }}
            >
              Clear Points
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
