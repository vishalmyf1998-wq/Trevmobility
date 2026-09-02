import React from 'react';
import { Booking, City, CarCategory, Airport, TollLocation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Plus, Trash2 } from "lucide-react";

type BookingFormData = Omit<Booking, "id" | "createdAt" | "bookingNumber" | "eventLog">;

interface TripDetailsFormProps {
  formData: BookingFormData;
  setFormData: React.Dispatch<React.SetStateAction<BookingFormData>>;
  cities: City[];
  carCategories: CarCategory[];
  airports: Airport[];
  getAirport: (airportId: string) => Airport | undefined;
  getAirportTerminal: (airportId: string, terminalId: string) => { id: string; name: string; isActive: boolean; } | undefined;
  formatAirportLocation: (airportId?: string, terminalId?: string) => string;
  isAirportTrip: boolean;
  cityAirports: Airport[];
  airportTerminals: { id: string; name: string; isActive: boolean; }[];
  tollLocations: TollLocation[];
}

const TripDetailsForm: React.FC<TripDetailsFormProps> = ({
  formData,
  setFormData,
  cities,
  carCategories,
  airports,
  getAirport,
  getAirportTerminal,
  formatAirportLocation,
  isAirportTrip,
  cityAirports,
  airportTerminals,
  tollLocations,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trip Details</CardTitle>
        <CardDescription>Specify the trip route, type, and schedule.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FieldGroup className="grid grid-cols-3 gap-4">
          <Field>
            <FieldLabel>City *</FieldLabel>
            <Select
              value={formData.cityId}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  cityId: value,
                  airportId: undefined,
                  airportTerminalId: undefined,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {cities
                  .filter((c) => c.isActive)
                  .map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Car Category *</FieldLabel>
            <Select
              value={formData.carCategoryId}
              onValueChange={(value) =>
                setFormData({ ...formData, carCategoryId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {carCategories
                  .filter((c) => c.isActive)
                  .map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Trip Type *</FieldLabel>
            <Select
              value={formData.tripType}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  tripType: value as Booking["tripType"],
                  airportId: undefined,
                  airportTerminalId: undefined,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select trip type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="city_ride">City Ride</SelectItem>
                <SelectItem value="airport_pickup">Airport Pickup</SelectItem>
                <SelectItem value="airport_drop">Airport Drop</SelectItem>
                <SelectItem value="rental">Rental</SelectItem>
                <SelectItem value="outstation">Outstation</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        {isAirportTrip && (
          <FieldGroup className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Airport *</FieldLabel>
              <Select
                value={formData.airportId || ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    airportId: value,
                    airportTerminalId: undefined,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select airport" />
                </SelectTrigger>
                <SelectContent>
                  {cityAirports.map((airport) => (
                    <SelectItem key={airport.id} value={airport.id}>
                      {airport.name} ({airport.code})
                    </SelectItem>
                  ))}
                  {cityAirports.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No active airports for this city.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Terminal *</FieldLabel>
              <Select
                value={formData.airportTerminalId || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, airportTerminalId: value })
                }
                disabled={!formData.airportId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select terminal" />
                </SelectTrigger>
                <SelectContent>
                  {airportTerminals.map((terminal) => (
                    <SelectItem key={terminal.id} value={terminal.id}>
                      {terminal.name}
                    </SelectItem>
                  ))}
                  {formData.airportId && airportTerminals.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No active terminals for this airport.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        )}

        <div className="space-y-2">
          <Field>
            <FieldLabel>{formData.tripType === "airport_pickup" ? "Pickup From" : "Pickup Location *"}</FieldLabel>
            <Input
              value={
                formData.tripType === "airport_pickup"
                  ? formatAirportLocation(formData.airportId, formData.airportTerminalId)
                  : formData.pickupLocation
              }
              onChange={(e) =>
                setFormData({ ...formData, pickupLocation: e.target.value })
              }
              placeholder={formData.tripType === "airport_pickup" ? "Airport/Terminal selected above" : "Enter pickup location"}
              disabled={formData.tripType === "airport_pickup"}
            />
          </Field>
          {(formData.stops || []).length > 0 && (
            <div className="space-y-2 pl-4 border-l-2 ml-2">
              {(formData.stops || []).map((stop, index) => (
                <Field key={stop.id}>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground w-14 shrink-0">Stop {index + 1}</Label>
                    <Input
                      value={stop.location}
                      onChange={(e) => {
                        const newStops = [...(formData.stops || [])];
                        newStops[index].location = e.target.value;
                        setFormData(prev => ({ ...prev, stops: newStops }));
                      }}
                      placeholder={`Enter stop location`}
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                      setFormData(prev => ({ ...prev, stops: (prev.stops || []).filter((_, i) => i !== index) }));
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Field>
              ))}
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  stops: [...(prev.stops || []), { id: `stop_${Date.now()}`, location: '' }]
                }));
              }}
            >
              <Plus className="mr-1 h-3 w-3" /> Add Stop
            </Button>
          </div>
          <Field>
            <FieldLabel>{formData.tripType === "airport_drop" ? "Drop At" : "Drop Location *"}</FieldLabel>
            <Input
              value={
                formData.tripType === "airport_drop"
                  ? formatAirportLocation(formData.airportId, formData.airportTerminalId)
                  : formData.dropLocation
              }
              onChange={(e) =>
                setFormData({ ...formData, dropLocation: e.target.value })
              }
              placeholder={formData.tripType === "airport_drop" ? "Airport/Terminal selected above" : "Enter drop location"}
              disabled={formData.tripType === "airport_drop"}
            />
          </Field>
        </div>

        <FieldGroup className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field>
            <FieldLabel>Pickup Date *</FieldLabel>
            <Input
              type="date"
              value={formData.pickupDate}
              onChange={(e) =>
                setFormData({ ...formData, pickupDate: e.target.value })
              }
            />
          </Field>
          <Field>
            <FieldLabel>Pickup Time *</FieldLabel>
            <Input
              type="time"
              value={formData.pickupTime}
              onChange={(e) =>
                setFormData({ ...formData, pickupTime: e.target.value })
              }
            />
          </Field>
          {(formData.tripType === "rental" || formData.tripType === "outstation") && (
            <Field>
              <FieldLabel>Return Date</FieldLabel>
              <Input
                type="date"
                value={formData.returnDate || ""}
                onChange={(e) =>
                  setFormData({ ...formData, returnDate: e.target.value })
                }
              />
            </Field>
          )}
          {(formData.tripType === "rental" || formData.tripType === "outstation") && (
            <Field>
              <FieldLabel>Return Time</FieldLabel>
              <Input
                type="time"
                value={(formData as any).returnTime || ""}
                onChange={(e) =>
                  setFormData({ ...formData, returnTime: e.target.value } as any)
                }
              />
            </Field>
          )}
          <Field>
            <FieldLabel>Est. Distance (KM)</FieldLabel>
            <Input
              type="number"
              value={formData.estimatedKm || ""}
              readOnly
              className="bg-muted font-bold"
              placeholder="Auto..."
            />
          </Field>
        </FieldGroup>
        <Field>
          <FieldLabel>Remarks / Instructions</FieldLabel>
          <Textarea
            value={formData.remarks || ""}
            onChange={(e) =>
              setFormData({ ...formData, remarks: e.target.value })
            }
            placeholder="e.g., VIP guest, specific route preference"
            rows={2}
          />
        </Field>
      </CardContent>
    </Card>
  );
};

export default TripDetailsForm;
