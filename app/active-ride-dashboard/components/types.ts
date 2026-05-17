export interface RideMetrics {
  distance: number;
  eta: number;
  actualEta: number;
  soc: number;
}

export interface Ride {
  id: string;
  displayId: string;
  bookingId: string;
  customerName: string;
  customerPhone: string;
  driverName: string;
  driverId: string;
  driverPhone: string;
  vehicleNo: string;
  vehicleType: string;
  isEV: boolean;
  isDelayed: boolean;
  delayMins: number;
  status: string;
  statusColor: string;
  rideType: string;
  time: string;
  fare: string;
  walletBal: string;
  originalBooking: any;
  speed: number;
  metrics: RideMetrics;
  tags: string[];
}
