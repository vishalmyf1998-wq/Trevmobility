import { Booking, City, CarCategory } from "@/lib/types"

interface VoucherProps {
  booking: Booking;
  city?: City;
  carCategory?: CarCategory;
}

export const PrintableVoucher = ({ booking, city, carCategory }: VoucherProps) => {
  const formatDate = (dateStr?: string) => dateStr ? new Date(dateStr).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "__/__/____";
  
  const tripTypeLabels: Record<string, string> = {
    airport_pickup: "Airport Pickup",
    airport_drop: "Airport Drop",
    rental: "Rental",
    city_ride: "City Ride",
    outstation: "Outstation",
  };

  const getStatusColor = (status: string) => {
    if (['confirmed', 'closed', 'dropped'].includes(status)) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    if (['cancelled'].includes(status)) return "bg-red-50 text-red-700 ring-red-200";
    return "bg-orange-50 text-orange-700 ring-orange-200";
  };

  return (
    <div className="font-sans text-slate-900 bg-slate-50 min-h-screen print:bg-white" id="voucher-print">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4; margin: 5mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .page { width: 100% !important; min-height: auto !important; margin: 0 !important; box-shadow: none !important; border: none !important; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        }
      `}} />
      <main className="mx-auto px-4 pb-10 pt-6 print:p-0 w-full max-w-[210mm] print:max-w-[195mm] print:scale-[0.95] print:origin-top">
        <section className="page mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.08)] print:rounded-none print:border-0 print:shadow-none">
          {/* Top band */}
          <div className="relative">
            <div className="h-3 w-full bg-[#2DFF0A]"></div>
            <div className="px-8 pt-7 print:px-5 print:pt-4">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Booking Confirmation Voucher</div>
                  <div className="mt-1 text-2xl font-extrabold tracking-tight text-[#0b1220] print:text-xl">
                    Travel Voucher
                  </div>

                  <div className="mt-3 text-sm font-extrabold text-slate-900">Trev Mobility Tech Private Limited</div>
                  <div className="mt-1 text-[11px] leading-5 text-slate-600 print:leading-4">
                    <div>Add- Plot no. 1049, Near Sai Mandir, Gali Number 1,</div>
                    <div>Bharthal, Dwarka Sector 26, Delhi-110077</div>
                    <div>Contact- 9650303400 || E-mail- bookings@trevcabs.com</div>
                  </div>
                </div>

                <div className="w-[260px] shrink-0">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-600">Voucher No.</div>
                        <div className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900">
                          VCH-{booking.bookingNumber.replace('BK', '')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-semibold text-slate-600">Status</div>
                        <div className={`mt-1 inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold ring-1 uppercase ${getStatusColor(booking.status)}`}>
                          {booking.status.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-600">Issued On</div>
                        <div className="mt-1 rounded-lg border border-slate-200 px-2 py-2 text-sm">{formatDate(booking.createdAt)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-slate-600">Booking ID</div>
                        <div className="mt-1 rounded-lg border border-slate-200 px-2 py-2 text-sm">{booking.bookingNumber}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 pb-8 pt-6 print:px-5 print:pb-4 print:pt-3">
            {/* Primary cards */}
            <div className="grid grid-cols-12 gap-4 print:gap-3">
              {/* Guest + Contact */}
              <div className="avoid-break col-span-12 rounded-2xl border border-slate-200 p-5 print:p-2.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#2DFF0A]/20 ring-1 ring-[#2DFF0A]/50"></div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">Guest Details</div>
                      <div className="text-xs text-slate-600">Primary traveler information</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-12 gap-3 print:mt-3">
                  <div className="col-span-6">
                    <div className="text-[11px] font-semibold text-slate-600">Guest Name</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">{booking.customerName || "______________________________"}</div>
                  </div>
                  <div className="col-span-3">
                    <div className="text-[11px] font-semibold text-slate-600">Mobile</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">{booking.customerPhone || "+91-__________"}</div>
                  </div>
                  <div className="col-span-3">
                    <div className="text-[11px] font-semibold text-slate-600">Email</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm truncate">{booking.customerEmail || "N/A"}</div>
                  </div>

                  <div className="col-span-6">
                    <div className="text-[11px] font-semibold text-slate-600">Booker Name</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">{booking.createdBy || "Admin"}</div>
                  </div>
                  <div className="col-span-3">
                    <div className="text-[11px] font-semibold text-slate-600">Booker Number</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">{booking.customerPhone || "+91-__________"}</div>
                  </div>
                  <div className="col-span-3">
                    <div className="text-[11px] font-semibold text-slate-600">Booker Email (optional)</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm truncate">{booking.customerEmail || "N/A"}</div>
                  </div>
                </div>
              </div>

              {/* Itinerary */}
              <div className="avoid-break col-span-12 rounded-2xl border border-slate-200 p-5 print:p-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#2DFF0A]/20 ring-1 ring-[#2DFF0A]/50"></div>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900">Trip Details</div>
                    <div className="text-xs text-slate-600">Pickup, drop, schedule</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-12 gap-3 print:mt-3">
                  <div className="col-span-4">
                    <div className="text-[11px] font-semibold text-slate-600">Trip Type</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm capitalize">{tripTypeLabels[booking.tripType] || booking.tripType.replace(/_/g, ' ')}</div>
                  </div>
                  <div className="col-span-4">
                    <div className="text-[11px] font-semibold text-slate-600">Pickup Date</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">{formatDate(booking.pickupDate)}</div>
                  </div>
                  <div className="col-span-4">
                    <div className="text-[11px] font-semibold text-slate-600">Pickup Time</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">{booking.pickupTime || "__:__"}</div>
                  </div>

                  <div className="col-span-6">
                    <div className="text-[11px] font-semibold text-slate-600">Pickup Address</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      {booking.pickupLocation || "________________________________________________"}
                    </div>
                  </div>
                  <div className="col-span-6">
                    <div className="text-[11px] font-semibold text-slate-600">Drop Address</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      {booking.dropLocation || "________________________________________________"}
                    </div>
                  </div>

                  <div className="col-span-12">
                    <div className="text-[11px] font-semibold text-slate-600">Notes for Driver</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      {booking.remarks || "No special instructions."}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fare summary + QR */}
              <div className="avoid-break col-span-12 rounded-2xl border border-slate-200 p-5 print:p-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#2DFF0A]/20 ring-1 ring-[#2DFF0A]/50"></div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">Payment Summary</div>
                      <div className="text-xs text-slate-600">For reference</div>
                    </div>
                  </div>
                  <div className="rounded-full bg-[#2DFF0A]/20 px-3 py-1 text-xs font-bold text-slate-900 ring-1 ring-[#2DFF0A]/50">
                    INR
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 print:mt-3 print:p-3">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div className="text-slate-600">Base Fare</div>
                    <div className="text-right font-semibold">₹ {booking.estimatedFare?.toFixed(2) || "0.00"}</div>

                    <div className="text-slate-600">Taxes</div>
                    <div className="text-right font-semibold">₹ {booking.gstAmount?.toFixed(2) || "0.00"}</div>

                    <div className="text-slate-600">Tolls / Parking</div>
                    <div className="text-right font-semibold">₹ {((booking.tollCharges || 0) + (booking.parkingCharges || 0)).toFixed(2)}</div>

                    <div className="text-slate-600">Discount</div>
                    <div className="text-right font-semibold text-green-600">- ₹ {booking.promoDiscount?.toFixed(2) || "0.00"}</div>
                  </div>

                  <div className="my-3 border-t border-slate-200"></div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-extrabold text-slate-900">Total</div>
                    <div className="text-lg font-extrabold text-[#0b1220]">₹ {booking.grandTotal?.toFixed(2) || "0.00"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms + signatures */}
            <div className="mt-4 grid grid-cols-12 gap-4 print:mt-2 print:gap-3">
              <div className="avoid-break col-span-8 rounded-2xl border border-slate-200 p-5 print:p-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#2DFF0A]/20 ring-1 ring-[#2DFF0A]/50"></div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">Important Terms</div>
                  </div>
                </div>

                <ul className="mt-4 space-y-2 text-xs leading-5 text-slate-700 print:mt-3">
                  <li className="flex gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#2DFF0A]"></span>
                    <span>Driver details may be shared closer to pickup time depending on availability.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#2DFF0A]"></span>
                    <span>Toll, parking, and state taxes (if applicable) are payable as per actual unless included.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#2DFF0A]"></span>
                    <span>Cancellation and waiting charges apply as per your booking policy.</span>
                  </li>
                </ul>
              </div>

              <div className="avoid-break col-span-4 rounded-2xl border border-slate-200 p-5 print:p-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#2DFF0A]/20 ring-1 ring-[#2DFF0A]/50"></div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">Authorization</div>
                  </div>
                </div>

                <div className="mt-4 text-center text-sm font-extrabold text-slate-900 print:mt-3">
                  Trev Mobility Tech Private Limited
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 print:mt-2 print:p-2.5">
              <div className="flex items-center justify-between gap-4">
                <div className="text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Note:</span>
                  This is a system-generated voucher. For changes, contact support.
                </div>
                <div className="text-[11px] font-semibold text-slate-700">Thank you for choosing Trev.</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};