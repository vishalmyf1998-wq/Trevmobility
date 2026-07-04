'use client'

import React, { useEffect, useState } from 'react'
import { MapContainer, Marker, Popup, Tooltip, Polyline, useMap, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Booking, CarLocation, Driver, Car } from '@/lib/types'
import { Button } from './ui/button'

// Fix for default marker icons in Leaflet with Next.js
const createCarIcon = (color: string = '#3b82f6', options: { isHovered?: boolean; isAssignable?: boolean } = {}) => {
  const size = options.isHovered || options.isAssignable ? 38 : 32;
  const animation = options.isAssignable ? 'animate-pulse' : '';
  const borderStyle = options.isHovered ? '6px solid #0ea5e9' : '3px solid white'; // sky-500 for hover

  return L.divIcon({
    className: `custom-car-marker ${animation}`,
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: ${borderStyle};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        transition: all 0.2s ease-in-out;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <path d="M9 17h6"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

const statusColors: Record<string, string> = {
  dispatched: '#3b82f6', // blue
  arrived: '#eab308', // yellow
  picked_up: '#22c55e', // green
  dropped: '#14b8a6', // teal (Ended but not closed)
  cancelled: '#ef4444', // red
}

interface MapUpdaterProps {
  bounds?: L.LatLngBoundsExpression
  center?: [number, number]
  zoom?: number
}

function MapUpdater({ bounds, center, zoom }: MapUpdaterProps) {
  const map = useMap()
  const boundsStr = JSON.stringify(bounds)
  const centerStr = JSON.stringify(center)

  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
    else if (center && zoom) map.setView(center, zoom)
  }, [map, boundsStr, centerStr, zoom])
  return null
}

function MapReadyGate({ children }: { children: React.ReactNode }) {
  const map = useMap()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let frameId = 0
    let mounted = true;

    const checkAndReady = () => {
      if (!mounted) return;
      if (map && map.getPane('tilePane') && map.getPane('markerPane') && map.getPane('popupPane')) {
        frameId = window.requestAnimationFrame(() => {
          if (!mounted) return;
          map.invalidateSize()
          setIsReady(true)
        })
      } else {
        setTimeout(checkAndReady, 50);
      }
    }

    if (map) {
      if (map.getPane('tilePane') && map.getPane('markerPane')) {
         checkAndReady();
      } else {
         map.whenReady(checkAndReady);
      }
    }

    return () => {
      mounted = false;
      if (frameId) window.cancelAnimationFrame(frameId)
    }
  }, [map])

  return isReady ? <>{children}</> : null
}

function SafeTileLayer() {
  const map = useMap()

  useEffect(() => {
    let layer: L.TileLayer | null = null
    let frameId = 0
    let cancelled = false

    const addLayer = () => {
      frameId = window.requestAnimationFrame(() => {
        if (cancelled) return
        const tilePane = map.getPane('tilePane')
        if (!tilePane) return

        map.invalidateSize()
        layer = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>',
          pane: 'tilePane',
        }).addTo(map)
      })
    }

    if (map.getPane('tilePane')) {
      addLayer()
    } else {
      map.whenReady(addLayer)
    }

    return () => {
      cancelled = true
      if (frameId) window.cancelAnimationFrame(frameId)
      if (layer) layer.remove()
    }
  }, [map])

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
  hoveredDriverId?: string | null;
  assigningRideId?: string | null;
  onAssignDriver?: (driverId: string, carId: string) => void;
  pickupPoint?: [number, number] | null;
  dropPoint?: [number, number] | null;
  stopPoints?: { position: [number, number]; label?: string; status?: string }[];
  plannedRoute?: [number, number][];
  showPlannedRoute?: boolean;
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
  hoveredDriverId = null,
  assigningRideId = null,
  onAssignDriver,
  pickupPoint = null,
  dropPoint = null,
  stopPoints = [],
  plannedRoute = [],
  showPlannedRoute = false,
}: TrackingMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate center based on car locations or default to Mumbai
  const defaultCenter: [number, number] = [19.0760, 72.8777]
  
  const center = carLocations.length > 0
    ? [
        carLocations.reduce((sum, loc) => sum + loc.latitude, 0) / carLocations.length,
        carLocations.reduce((sum, loc) => sum + loc.longitude, 0) / carLocations.length,
      ] as [number, number]
    : defaultCenter

  // Compute map zoom bounds and route polyline path
  const activeCarId = selectedTrip ? trips.find(t => t.id === selectedTrip)?.carId : null;
  const activeCarLoc = activeCarId ? carLocations.find(l => l.carId === activeCarId) : null;
  
  const boundsPoints: [number, number][] = [];
  const pathPoints: [number, number][] = [];
  
  if (activeCarLoc) pathPoints.push([activeCarLoc.latitude, activeCarLoc.longitude]);
  if (pickupPoint) {
    boundsPoints.push(pickupPoint); // Static points keep Map stable during live tracking
    pathPoints.push(pickupPoint);
  }
  stopPoints.forEach((stop) => {
    boundsPoints.push(stop.position);
    pathPoints.push(stop.position);
  });
  if (dropPoint) {
    boundsPoints.push(dropPoint);
    pathPoints.push(dropPoint);
  }
  if (boundsPoints.length === 0 && activeCarLoc) boundsPoints.push([activeCarLoc.latitude, activeCarLoc.longitude]);

  if (!isMounted) return null;

  return (
    <div className="h-full min-h-[240px] w-full rounded-lg overflow-hidden border relative z-0">
      <MapContainer
        key={`map-container-${isMounted}`}
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <MapReadyGate>
          <SafeTileLayer />
          
          {carLocations.map((location) => {
            const car = getCar(location.carId)
            if (!car) return null
            
            const trip = trips.find(t => t.carId === location.carId)
            const driver = trip?.driverId ? getDriver(trip.driverId) : (car.assignedDriverId ? getDriver(car.assignedDriverId) : undefined)
            const isHovered = hoveredDriverId === driver?.id;
            const isSelected = trip ? selectedTrip === trip.id : false
            
            const isFreeDriver = !trip && driver;
            const isAssigningMode = !!assigningRideId;

            let color = '#9ca3af' // Default Gray for idle
            let statusText = 'Idle'
            
            if (trip) {
              color = statusColors[trip.status] || '#3b82f6'
              statusText = trip.status.split('_').join(' ')
            } else if (isFreeDriver && isAssigningMode) {
              color = '#10b981'; // Emerald-500 for assignable
              statusText = 'Available - Click to Assign';
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
            
            const soc = (car as any)?.soc ?? 82;
            const range = (car as any)?.range ?? 210;
            const shiftRides = (driver as any)?.shiftRides ?? 3;

            return (
              <React.Fragment key={`${location.carId}-${isAssigningMode ? 'assign' : 'normal'}`}>
                {/* Draw Route Line */}
                {(isSelected || showAllRoutes) && path.length > 1 && (
                  <Polyline positions={path} color={isSelected ? '#ef4444' : color} weight={4} opacity={0.7} />
                )}
                <Marker
                  position={[location.latitude, location.longitude]}
                  icon={createCarIcon(
                    isSelected ? '#ef4444' : color,
                    { isHovered, isAssignable: isFreeDriver && isAssigningMode }
                  )}
                  eventHandlers={{
                    click: () => {
                      if (isFreeDriver && isAssigningMode && onAssignDriver && driver) {
                        onAssignDriver(driver.id, location.carId);
                      } else if (trip) {
                        onSelectTrip(trip.id);
                      }
                    },
                  }}
                  zIndexOffset={isHovered || isSelected ? 1000 : (isFreeDriver && isAssigningMode ? 500 : 0)}
                >
                  {/* Hover Tooltip (dikhega jab cursor upar hoga) */}
                  <Tooltip key={`tt-${isFreeDriver && isAssigningMode}`} direction="top" offset={[0, -20]} opacity={1} permanent={isFreeDriver && isAssigningMode}>
                    <div className="flex flex-col gap-1 p-1 min-w-[150px]">
                      <div className="font-bold text-sm border-b pb-1 mb-1 text-slate-800 text-center">
                        {driver?.name || 'Unassigned Driver'}
                      </div>
                      
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-slate-500 text-xs font-medium">Vehicle</span>
                        <span className="font-bold text-xs text-slate-700">{car.registrationNumber}</span>
                      </div>
                      
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-slate-500 text-xs font-medium">Current SOC</span>
                        <span className={`font-bold text-xs ${soc > 20 ? 'text-green-600' : 'text-red-600'}`}>{soc}%</span>
                      </div>
                      
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-slate-500 text-xs font-medium">Range</span>
                        <span className="font-bold text-xs text-slate-700">{range} km</span>
                      </div>
                      
                      <div className="flex justify-between items-center gap-4 mt-1 pt-1 border-t border-slate-100">
                        <span className="text-slate-500 text-xs font-medium">Rides in Shift</span>
                        <span className="font-bold text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{shiftRides}</span>
                      </div>

                      {!trip && <div className="text-[10px] text-center text-gray-500 mt-1 tracking-wider uppercase">{statusText}</div>}
                      {delayText && <div className="text-[10px] text-center text-red-500 font-bold mt-0.5">{delayText}</div>}
                      {isFreeDriver && isAssigningMode && (
                        <div className="text-xs text-center font-bold text-emerald-600 mt-1 p-1 bg-emerald-100 rounded-md">
                          Click marker to assign
                        </div>
                      )}
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
                          {isFreeDriver && isAssigningMode && onAssignDriver && driver && (
                            <div className="mt-2 border-t pt-2">
                                <Button 
                                    size="sm" 
                                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => onAssignDriver(driver.id, location.carId)}
                                >
                                    Assign {driver.name}
                                </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            )
          })}

          {/* Draw the Pickup/Drop Route */}
          {(showPlannedRoute ? plannedRoute : pathPoints).length >= 2 && (
            <Polyline positions={showPlannedRoute ? plannedRoute : pathPoints} color="#0ea5e9" weight={4} opacity={0.6} dashArray="8, 8" />
          )}
          {pickupPoint && (
            <CircleMarker center={pickupPoint} radius={7} color="white" weight={2} fillColor="#10b981" fillOpacity={1}>
              <Tooltip direction="top">Pickup Location</Tooltip>
            </CircleMarker>
          )}
          {stopPoints.map((stop, index) => (
            <CircleMarker key={`${stop.position.join("-")}-${index}`} center={stop.position} radius={6} color="white" weight={2} fillColor="#f59e0b" fillOpacity={1}>
              <Tooltip direction="top">{stop.label || `Stop ${index + 1}`}</Tooltip>
            </CircleMarker>
          ))}
          {dropPoint && (
            <CircleMarker center={dropPoint} radius={7} color="white" weight={2} fillColor="#ef4444" fillOpacity={1}>
              <Tooltip direction="top">Drop Location</Tooltip>
            </CircleMarker>
          )}

          {boundsPoints.length >= 2 ? (
            <MapUpdater bounds={boundsPoints} />
          ) : boundsPoints.length === 1 ? (
            <MapUpdater center={boundsPoints[0]} zoom={14} />
          ) : null}
        </MapReadyGate>
      </MapContainer>
    </div>
  )
}
