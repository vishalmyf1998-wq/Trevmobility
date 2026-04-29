# Trev Cabs - API Documentation

This document outlines the external APIs and Webhook workflows available for integrating with the Trev Cabs system.

## Authentication

All API requests require an `Authorization` header containing a Bearer token.

**Header Format:**
```
Authorization: Bearer <YOUR_API_KEY>
```

*Note: Contact the administrator to obtain your `EXTERNAL_API_KEY` or `DRIVER_API_KEY`. These need to be configured in the `.env` file of the application.*

---

## 1. External Search API (Fare Quote)

Get an estimated fare and distance quote for a potential booking.

- **Endpoint:** `/api/external/search`
- **Method:** `POST`
- **Authentication:** Requires `EXTERNAL_API_KEY`

### Request Body (JSON)

| Field | Type | Required | Description |
|---|---|---|---|
| `orgId` | String | Yes | Your organization ID provided by Trev Cabs. |
| `cityId` | String | Yes | ID of the city where the booking originates. |
| `carCategoryId` | String | Yes | ID of the requested car category. |
| `tripType` | String | Yes | Must be one of: `airport_pickup`, `airport_drop`, `rental`, `city_ride`, `outstation`. |
| `pickupLocation` | String | Yes | Exact pickup address or location. |
| `dropLocation` | String | Yes | Exact drop-off address or location. |

### Example Request

```json
{
  "orgId": "PARTNER-123",
  "cityId": "1",
  "carCategoryId": "1",
  "tripType": "city_ride",
  "pickupLocation": "Mumbai Central",
  "dropLocation": "Andheri West"
}
```

### Example Response (200 OK)

```json
{
  "success": true,
  "quoteId": "QUOTE-123456ABC",
  "estimatedKm": 25,
  "estimatedFare": 575,
  "currency": "INR",
  "notes": "This is an estimated fare based on standard rates. Final fare may vary based on actual distance and tolls."
}
```

---

## 2. External Booking API (Auto-Accept)

Create a new booking in the system from an external partner source. Bookings sent via this API are automatically accepted and marked as `confirmed`.

- **Endpoint:** `/api/external/booking`
- **Method:** `POST`
- **Authentication:** Requires `EXTERNAL_API_KEY`

### Request Body (JSON)

| Field | Type | Required | Description |
|---|---|---|---|
| `orgId` | String | Yes | Your organization ID provided by Trev Cabs. |
| `customerName` | String | Yes | Full name of the customer. |
| `customerPhone` | String | Yes | Contact number of the customer. |
| `customerEmail` | String | No | Email address of the customer. |
| `cityId` | String | Yes | ID of the city where the booking originates. |
| `carCategoryId` | String | Yes | ID of the requested car category. |
| `tripType` | String | Yes | Must be one of: `airport_pickup`, `airport_drop`, `rental`, `city_ride`, `outstation`. |
| `pickupLocation` | String | Yes | Exact pickup address or location. |
| `dropLocation` | String | Yes | Exact drop-off address or location. |
| `pickupDate` | String | Yes | Date of pickup in `YYYY-MM-DD` format. |
| `pickupTime` | String | Yes | Time of pickup in `HH:MM` format. |
| `partnerBookingId` | String | No | Your internal booking ID. Useful for webhook matching. |
| `partnerWebhookUrl` | String | No | The URL where Trev Cabs will send driver assignment and status updates. |
| `estimatedKm` | Number | No | Estimated distance in kilometers. |
| `estimatedFare` | Number | No | Estimated total fare. |
| `notes` | String | No | Any additional notes or instructions. |

### Example Request

```json
{
  "orgId": "PARTNER-123",
  "customerName": "John Doe",
  "customerPhone": "9876543210",
  "cityId": "1",
  "carCategoryId": "1",
  "tripType": "city_ride",
  "pickupLocation": "Mumbai Central",
  "dropLocation": "Andheri West",
  "pickupDate": "2026-05-10",
  "pickupTime": "14:30",
  "partnerBookingId": "PARTNER-BK-001",
  "partnerWebhookUrl": "https://partner-domain.com/webhooks/trev-cabs",
  "notes": "Please send a clean car."
}
```

### Example Response (201 Created)

```json
{
  "success": true,
  "booking": {
    "id": "uuid-here",
    "bookingNumber": "B2C123456XYZ",
    "status": "confirmed",
    "...": "..."
  }
}
```

---

## 2. Final Fare API (Partner -> Trev Cabs)

Once a ride is completed, external partners can submit the final calculated fare, actual distance, and tolls/parking charges back to Trev Cabs. This will update the admin dashboard.

- **Endpoint:** `/api/external/booking/fare`
- **Method:** `POST`
- **Authentication:** Requires `EXTERNAL_API_KEY`

### Request Body (JSON)

| Field | Type | Required | Description |
|---|---|---|---|
| `bookingId` | String | Yes | Trev Cabs internal booking ID (returned in the create response). |
| `totalFare` | Number | Yes | The total final fare calculated by the partner. |
| `actualKm` | Number | No | Total actual distance traveled. |
| `actualFare` | Number | No | Base fare before extra charges. |
| `tollCharges` | Number | No | Total toll charges. |
| `parkingCharges` | Number | No | Total parking charges. |
| `grandTotal` | Number | No | Final amount including taxes. |

### Example Request

```json
{
  "bookingId": "uuid-here",
  "actualKm": 25.5,
  "actualFare": 450,
  "tollCharges": 120,
  "parkingCharges": 50,
  "totalFare": 620,
  "grandTotal": 651
}
```

---

## 3. Webhooks (Trev Cabs -> Partner)

If a `partnerWebhookUrl` is provided during booking creation, Trev Cabs will send `POST` requests to this URL whenever significant events occur.

### A. Driver Assigned (`booking.assigned`)
Sent when an admin assigns a driver and car to the partner's booking.

**Webhook Payload:**
```json
{
  "event": "booking.assigned",
  "bookingId": "uuid-here",
  "partnerBookingId": "PARTNER-BK-001",
  "bookingNumber": "B2C123456XYZ",
  "status": "assigned",
  "timestamp": "2026-05-10T14:00:00Z",
  "driver": {
    "name": "Rajesh Kumar",
    "phone": "9876543210",
    "licenseNumber": "MH0120210012345"
  },
  "car": {
    "registrationNumber": "MH01AB1234",
    "make": "Maruti",
    "model": "Dzire",
    "color": "White"
  }
}
```

### B. Status Update (`booking.dispatched`, `booking.arrived`, `booking.picked_up`, `booking.dropped`)
Sent when the driver (or admin on behalf of the driver) updates the current ride status.

**Webhook Payload:**
```json
{
  "event": "booking.arrived",
  "bookingId": "uuid-here",
  "partnerBookingId": "PARTNER-BK-001",
  "bookingNumber": "B2C123456XYZ",
  "status": "arrived",
  "timestamp": "2026-05-10T14:15:00Z",
  "notes": "Admin reported event: arrived"
}
```

---

## 4. Driver Events API (Internal/Driver App)

Update the status of an existing booking based on driver actions.

- **Endpoint:** `/api/driver/events`
- **Method:** `POST`
- **Authentication:** Requires `DRIVER_API_KEY`

### Request Body (JSON)

| Field | Type | Required | Description |
|---|---|---|---|
| `bookingId` | String | Yes | The ID of the booking to update. |
| `driverId` | String | Yes | The ID of the driver performing the action. |
| `event` | String | Yes | Valid values: `dispatched`, `arrived`, `picked_up`, `dropped`, `closed`, `cancelled`. |
| `actualKm` | Number | No | Optional updated value for the actual kilometers driven so far. |
| `notes` | String | No | Additional notes from the driver. |

