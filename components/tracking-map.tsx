'use client'

import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Booking, CarLocation, Driver, Car } from '@/lib/types'

// Fix for default marker icons in Leaflet with Next.js
const createCarIcon = (color: string = '#3b82f6') => {
  return L.divIcon({
    className: 'custom-car-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <path d="M9 17h6"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  })
}

const statusColors: Record<string, string> = {
  dispatched: '#3b82f6', // blue
  arrived: '#eab308', // yellow
  picked_up: '#22c55e', // green
  dropped: '#a855f7', // purple
}

interface MapUpdaterProps {
  center: [number, number]
  zoom: number
}

function MapUpdater({ center, zoom }: MapUpdaterProps) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [map, center, zoom])
  return null
}

interface TrackingMapProps {
  trips: Booking[]
  carLocations: CarLocation[]
  selectedTrip: string | null
  onSelectTrip: (tripId: string) => void
  getDriver: (id: string) => Driver | undefined
  getCar: (id: string) => Car | undefined
  carPaths?: Record<string, [number, number][]>
  showAllRoutes?: boolean
}

export default function TrackingMap({
  trips,
  carLocations,
  selectedTrip,
  onSelectTrip,
  getDriver,
  getCar,
  carPaths = {},
  showAllRoutes = false,
}: TrackingMapProps) {
  const mapRef = useRef<L.Map | null>(null)

  // Calculate center based on car locations or default to Mumbai
  const defaultCenter: [number, number] = [19.0760, 72.8777]
  
  const center = carLocations.length > 0
    ? [
        carLocations.reduce((sum, loc) => sum + loc.latitude, 0) / carLocations.length,
        carLocations.reduce((sum, loc) => sum + loc.longitude, 0) / carLocations.length,
      ] as [number, number]
    : defaultCenter

  return (
    <div className="h-[500px] w-full rounded-lg overflow-hidden border relative z-0">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        />
        
        {carLocations.map((location) => {
          const car = getCar(location.carId)
          if (!car) return null
          
          const trip = trips.find(t => t.carId === location.carId)
          const driver = trip?.driverId ? getDriver(trip.driverId) : (car.assignedDriverId ? getDriver(car.assignedDriverId) : undefined)
          const isSelected = trip ? selectedTrip === trip.id : false
          
          let color = '#9ca3af' // Default Gray for idle
          let statusText = 'Idle'
          
          if (trip) {
            color = statusColors[trip.status] || '#3b82f6'
            statusText = trip.status.split('_').join(' ')
          } else if (car.status === 'available') {
            color = '#94a3b8' // Slate 400 for Idle
            statusText = 'Idle / Available'
          } else if (car.status === 'maintenance') {
            color = '#f87171' // Red 400 for Maintenance
            statusText = 'Maintenance'
          }

          let delayText = null;
          if (trip && ['confirmed', 'assigned', 'dispatched'].includes(trip.status) && trip.pickupDate && trip.pickupTime) {
            const pickupDateTime = new Date(`${trip.pickupDate}T${trip.pickupTime}`);
            if (!isNaN(pickupDateTime.getTime())) {
              const diffInMins = Math.floor((new Date().getTime() - pickupDateTime.getTime()) / 60000);
              if (diffInMins > 0) {
                delayText = `Delayed by ${diffInMins} mins`;
              }
            }
          }

          const path = carPaths[location.carId] || []

          return (
            <React.Fragment key={location.carId}>
              {/* Draw Route Line */}
              {(isSelected || showAllRoutes) && path.length > 1 && (
                <Polyline positions={path} color={isSelected ? '#ef4444' : color} weight={4} opacity={0.7} />
              )}
              <Marker
                position={[location.latitude, location.longitude]}
                icon={createCarIcon(isSelected ? '#ef4444' : color)}
                eventHandlers={{
                  click: () => {
                    if (trip) onSelectTrip(trip.id)
                  },
                }}
              >
                {/* Hover Tooltip (dikhega jab cursor upar hoga) */}
                <Tooltip direction="top" offset={[0, -20]} opacity={1}>
                  <div className="text-center px-1">
                    <div className="font-semibold">{driver?.name || 'No Driver'}</div>
                    <div className="text-xs">{car.registrationNumber}</div>
                    {!trip && <div className="text-[10px] text-gray-500 mt-0.5 tracking-wider uppercase">{statusText}</div>}
                    {delayText && <div className="text-[10px] text-red-500 font-bold mt-0.5">{delayText}</div>}
                  </div>
                </Tooltip>

                {/* Click Popup (dikhega jab click karenge) */}
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    {trip ? (
                      <>
                        <div className="font-semibold text-sm mb-2">{trip.bookingNumber}</div>
                        <div className="space-y-1 text-xs">
                          <p><span className="text-gray-500">Customer:</span> {trip.customerName}</p>
                          <p><span className="text-gray-500">Driver:</span> {driver?.name || 'N/A'}</p>
                          <p><span className="text-gray-500">Vehicle:</span> {car.registrationNumber}</p>
                          <p><span className="text-gray-500">Status:</span> <span className="capitalize">{statusText}</span></p>
                          {delayText && <p><span className="text-red-500 font-bold">{delayText}</span></p>}
                          <p><span className="text-gray-500">Speed:</span> {location.speed.toFixed(0)} km/h</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-semibold text-sm mb-2">Idle Vehicle</div>
                        <div className="space-y-1 text-xs">
                          <p><span className="text-gray-500">Vehicle:</span> {car.registrationNumber}</p>
                          <p><span className="text-gray-500">Driver:</span> {driver?.name || 'Unassigned'}</p>
                          <p><span className="text-gray-500">Status:</span> <span className="capitalize">{statusText}</span></p>
                          <p><span className="text-gray-500">Speed:</span> {location.speed.toFixed(0)} km/h</p>
                        </div>
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          )
        })}

        {selectedTrip && carLocations.find(l => l.carId === trips.find(t => t.id === selectedTrip)?.carId) && (
          <MapUpdater
            center={[
              carLocations.find(l => l.carId === trips.find(t => t.id === selectedTrip)?.carId)!.latitude,
              carLocations.find(l => l.carId === trips.find(t => t.id === selectedTrip)?.carId)!.longitude,
            ]}
            zoom={14}
          />
        )}
      </MapContainer>
    </div>
  )
}
