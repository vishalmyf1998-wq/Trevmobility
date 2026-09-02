import React from 'react';
import { Booking, PromoCode, GstConfig } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import { Wallet } from "lucide-react";

type BookingFormData = Omit<Booking, "id" | "createdAt" | "bookingNumber" | "eventLog">;

interface FareAndPaymentFormProps {
  formData: BookingFormData;
  setFormData: React.Dispatch<React.SetStateAction<BookingFormData>>;
  isB2BUser: boolean;
  promoCodes: PromoCode[];
  gstConfig: GstConfig;
  eligiblePromoCodes: PromoCode[];
  selectedFormPromo?: PromoCode;
  selectedPromoError: string | null;
  getPromoEligibilityError: (promo: PromoCode, amount: number, cityId: string, tripType: Booking["tripType"]) => string | null;
}

const FareAndPaymentForm: React.FC<FareAndPaymentFormProps> = ({
  formData,
  setFormData,
  isB2BUser,
  promoCodes,
  gstConfig,
  eligiblePromoCodes,
  selectedFormPromo,
  selectedPromoError,
  getPromoEligibilityError,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fare & Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {formData.cityId && formData.carCategoryId ? (
          <div className="space-y-4">
            {!isB2BUser && (
              <Field>
                <FieldLabel>Promo Code</FieldLabel>
                <Select
                  value={formData.promoCodeId || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      promoCodeId: value === "none" ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select promo code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No promo code</SelectItem>
                    {selectedFormPromo && selectedPromoError && (
                      <SelectItem value={selectedFormPromo.id} disabled>
                        {selectedFormPromo.code} - {selectedPromoError}
                      </SelectItem>
                    )}
                    {eligiblePromoCodes.map((promo) => (
                      <SelectItem key={promo.id} value={promo.id}>
                        {promo.code} -{" "}
                        {promo.discountType === "percentage"
                          ? `${promo.discountValue}% off`
                          : `Rs. ${promo.discountValue} off`}
                      </SelectItem>
                    ))}
                    {eligiblePromoCodes.length === 0 && <div className="p-2 text-xs text-center text-muted-foreground">No eligible codes</div>}
                  </SelectContent>
                </Select>
                {selectedPromoError ? (
                  <p className="text-xs text-destructive mt-1">{selectedPromoError}</p>
                ) : selectedFormPromo ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedFormPromo.description}
                  </p>
                ) : null}
              </Field>
            )}
            <Card className="bg-slate-50 dark:bg-slate-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Fare Estimate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Base Fare</span>
                  <span className="font-medium">₹ {formData.estimatedFare.toFixed(2)}</span>
                </div>
                {formData.tripType === "outstation" && (formData as any).days && (
                  <div className="rounded-md bg-white p-2 text-xs text-muted-foreground dark:bg-slate-950">
                    <div className="flex justify-between">
                      <span>Chargeable Days</span>
                      <span>{(formData as any).days}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Minimum Chargeable KM</span>
                      <span>{(formData as any).minimumChargeableKm || 0} km</span>
                    </div>
                    {(formData as any).extraHours > 0 && (
                      <div className="flex justify-between">
                        <span>Extra Hours</span>
                        <span>{(formData as any).extraHours.toFixed(2)} hrs</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Driver Allowance</span>
                      <span>Rs. {((formData as any).driverAllowanceAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}
                {formData.tollCharges > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Toll (Pre-booked)</span>
                    <span>₹ {formData.tollCharges.toFixed(2)}</span>
                  </div>
                )}
                {formData.parkingCharges > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Parking (Pre-booked)</span>
                    <span>₹ {formData.parkingCharges.toFixed(2)}</span>
                  </div>
                )}
                {formData.extraCharges > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Urgent Booking Fee</span>
                    <span>₹ {formData.extraCharges.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t pt-2 mt-2">
                  <span className="text-muted-foreground font-medium">Subtotal</span>
                  <span className="font-medium">₹ {formData.totalFare.toFixed(2)}</span>
                </div>
                {formData.promoDiscount > 0 && (
                  <div className="flex justify-between items-center text-green-600 dark:text-green-500">
                    <span>Promo Discount</span>
                    <span>- ₹ {formData.promoDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>GST ({gstConfig.cgstRate + gstConfig.sgstRate}%)</span>
                  <span>₹ {formData.gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-lg border-t border-border pt-3 mt-3">
                  <span>Grand Total</span>
                  <span>₹ {formData.grandTotal.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Field>
              <FieldLabel>Advance Paid (₹)</FieldLabel>
              <Input
                type="number"
                className="w-full mt-1 text-right font-bold"
                value={formData.advancePaid || ""}
                onChange={(e) => setFormData({ ...formData, advancePaid: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </Field>

            {(formData.advancePaid || 0) > 0 && (
              <div className="flex justify-between items-center font-bold text-red-600 dark:text-red-500 pt-2 border-t mt-4">
                <span>Balance Due</span>
                <span>₹ {Math.max(formData.grandTotal - (formData.advancePaid || 0), 0).toFixed(2)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-16 px-4">
            <Wallet className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium">Awaiting details</h3>
            <p className="mt-1 text-sm text-gray-500">Select City, Car, and Trip Type to see fare estimate.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FareAndPaymentForm;
