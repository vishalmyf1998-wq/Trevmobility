import { Invoice, Booking, Driver, Car, GSTConfig } from "@/lib/types"

interface InvoicePrintProps {
  invoice: Invoice;
  booking?: Booking;
  driver?: Driver;
  car?: Car;
  gstConfig: GSTConfig;
}

export const PrintableInvoice = ({ invoice, booking, driver, car, gstConfig }: InvoicePrintProps) => {
  const formatDate = (dateStr?: string) => dateStr ? new Date(dateStr).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "__/__/____";
  
  const tripTypeLabels: Record<string, string> = {
    airport_pickup: "Airport Pickup",
    airport_drop: "Airport Drop",
    rental: "Rental",
    city_ride: "City Ride",
    outstation: "Outstation",
  };

  const getStatusColor = (status: string) => {
    if (['paid'].includes(status)) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    if (['cancelled'].includes(status)) return "bg-red-50 text-red-700 ring-red-200";
    if (['overdue'].includes(status)) return "bg-rose-50 text-rose-700 ring-rose-200";
    return "bg-orange-50 text-orange-700 ring-orange-200"; // pending
  };

  return (
    <div className="font-sans text-slate-900 bg-slate-50 min-h-screen print:bg-white" id="invoice-print">
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
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Tax Invoice</div>
                  <div className="mt-1 text-2xl font-extrabold tracking-tight text-[#0b1220] print:text-xl">
                    Trev Mobility Tech
                  </div>

                  <div className="mt-3 text-sm font-extrabold text-slate-900">Trev Mobility Tech Private Limited</div>
                  <div className="mt-1 text-[11px] leading-5 text-slate-600 print:leading-4">
                    <div>Add- Plot no. 1049, Near Sai Mandir, Gali Number 1,</div>
                    <div>Bharthal, Dwarka Sector 26, Delhi-110077</div>
                    <div>Contact- 9650303400 || E-mail- bookings@trevcabs.com</div>
                    {gstConfig.gstNumber && <div>GSTIN- {gstConfig.gstNumber}</div>}
                  </div>
                </div>

                <div className="w-[260px] shrink-0">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-600">Invoice No.</div>
                        <div className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900">
                          {invoice.invoiceNumber}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-semibold text-slate-600">Status</div>
                        <div className={`mt-1 inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold ring-1 uppercase ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-600">Invoice Date</div>
                        <div className="mt-1 rounded-lg border border-slate-200 px-2 py-2 text-sm">{formatDate(invoice.invoiceDate)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-slate-600">Due Date</div>
                        <div className="mt-1 rounded-lg border border-slate-200 px-2 py-2 text-sm">{formatDate(invoice.dueDate)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 pb-8 pt-6 print:px-5 print:pb-4 print:pt-3">
            <div className="grid grid-cols-12 gap-4 print:gap-3">
              
              {/* Bill To */}
              <div className="avoid-break col-span-5 rounded-2xl border border-slate-200 p-5 print:p-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#2DFF0A]/20 ring-1 ring-[#2DFF0A]/50"></div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">Billed To</div>
                    <div className="text-xs text-slate-600">Customer information</div>
                  </div>
                </div>

                <div className="mt-4 print:mt-3">
                  <div className="text-sm font-bold text-slate-900">{invoice.customerName}</div>
                  {invoice.customerAddress && <div className="mt-1 text-[11px] text-slate-600">{invoice.customerAddress}</div>}
                  {invoice.customerPhone && <div className="mt-1 text-[11px] text-slate-600">Phone: {invoice.customerPhone}</div>}
                  {invoice.customerEmail && <div className="mt-1 text-[11px] text-slate-600">Email: {invoice.customerEmail}</div>}
                  {invoice.customerGst && <div className="mt-2 text-[11px] font-semibold text-slate-800">GSTIN: {invoice.customerGst}</div>}
                </div>
              </div>

              {/* Trip Details */}
              <div className="avoid-break col-span-7 rounded-2xl border border-slate-200 p-5 print:p-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#2DFF0A]/20 ring-1 ring-[#2DFF0A]/50"></div>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900">Trip Details</div>
                    <div className="text-xs text-slate-600">Journey information</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-12 gap-3 print:mt-3">
                  {booking ? (
                    <>
                      <div className="col-span-6">
                        <div className="text-[11px] font-semibold text-slate-600">Booking ID</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">{booking.bookingNumber}</div>
                      </div>
                      <div className="col-span-6">
                        <div className="text-[11px] font-semibold text-slate-600">Trip Type</div>
                        <div className="mt-1 text-[11px] font-medium text-slate-900 capitalize">{tripTypeLabels[booking.tripType] || booking.tripType.replace(/_/g, ' ')}</div>
                      </div>
                      <div className="col-span-6">
                        <div className="text-[11px] font-semibold text-slate-600">Pickup Date</div>
                        <div className="mt-1 text-[11px] text-slate-900">{formatDate(booking.pickupDate)}</div>
                      </div>
                      <div className="col-span-6">
                        <div className="text-[11px] font-semibold text-slate-600">Vehicle</div>
                        <div className="mt-1 text-[11px] text-slate-900">{car ? car.registrationNumber : 'N/A'}</div>
                      </div>
                      <div className="col-span-6">
                        <div className="text-[11px] font-semibold text-slate-600">From</div>
                        <div className="mt-1 text-[11px] text-slate-900 line-clamp-2">{booking.pickupLocation}</div>
                      </div>
                      <div className="col-span-6">
                        <div className="text-[11px] font-semibold text-slate-600">To</div>
                        <div className="mt-1 text-[11px] text-slate-900 line-clamp-2">{booking.dropLocation}</div>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-12 text-sm text-slate-500">No booking details available for this invoice.</div>
                  )}
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="avoid-break col-span-12 rounded-2xl border border-slate-200 p-5 print:p-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#2DFF0A]/20 ring-1 ring-[#2DFF0A]/50"></div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">Amount Details</div>
                      <div className="text-xs text-slate-600">Breakdown of charges</div>
                    </div>
                  </div>
                  <div className="rounded-full bg-[#2DFF0A]/20 px-3 py-1 text-xs font-bold text-slate-900 ring-1 ring-[#2DFF0A]/50">
                    INR
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 print:mt-3 print:p-3">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center text-slate-700">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-900">₹ {invoice.subtotal.toFixed(2)}</span>
                    </div>
                    
                    {invoice.gstRate > 0 && invoice.clientType === "b2b" ? (
                      <>
                        <div className="flex justify-between items-center text-slate-600">
                          <span>CGST ({invoice.gstRate / 2}%)</span>
                          <span>₹ {invoice.cgst?.toFixed(2) || (invoice.gstAmount / 2).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span>SGST ({invoice.gstRate / 2}%)</span>
                          <span>₹ {invoice.sgst?.toFixed(2) || (invoice.gstAmount / 2).toFixed(2)}</span>
                        </div>
                      </>
                    ) : invoice.gstRate > 0 ? (
                      <div className="flex justify-between items-center text-slate-600">
                        <span>GST ({invoice.gstRate}%)</span>
                        <span>₹ {invoice.gstAmount.toFixed(2)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-slate-600">
                        <span>GST (0%)</span>
                        <span>₹ 0.00</span>
                      </div>
                    )}

                    <div className="my-3 border-t border-slate-200"></div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-extrabold text-slate-900">Grand Total</div>
                      <div className="text-lg font-extrabold text-[#0b1220]">₹ {invoice.totalAmount.toFixed(2)}</div>
                    </div>

                    {(invoice.paidAmount > 0 || invoice.status === 'paid') && (
                      <div className="flex items-center justify-between text-emerald-600 mt-2">
                        <div className="text-sm font-bold">Amount Paid</div>
                        <div className="text-sm font-bold">- ₹ {invoice.paidAmount.toFixed(2)}</div>
                      </div>
                    )}
                    
                    {invoice.status !== 'paid' && invoice.balanceAmount > 0 && (
                      <div className="flex items-center justify-between text-rose-600 mt-1">
                        <div className="text-sm font-bold">Balance Due</div>
                        <div className="text-sm font-bold">₹ {invoice.balanceAmount.toFixed(2)}</div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </div>

            {/* Footer Notes & Bank Details */}
            <div className="mt-4 grid grid-cols-12 gap-4 print:mt-3 print:gap-3">
              <div className="avoid-break col-span-8 rounded-2xl border border-slate-200 p-5 print:p-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#2DFF0A]/20 ring-1 ring-[#2DFF0A]/50"></div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">Payment & Terms</div>
                  </div>
                </div>

                <ul className="mt-4 space-y-2 text-xs leading-5 text-slate-700 print:mt-3">
                  <li className="flex gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#2DFF0A]"></span>
                    <span>Please make all payments to "Trev Mobility Tech Private Limited".</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#2DFF0A]"></span>
                    <span>Payments are due within {Math.round((new Date(invoice.dueDate).getTime() - new Date(invoice.invoiceDate).getTime()) / (1000 * 60 * 60 * 24))} days from invoice date.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#2DFF0A]"></span>
                    <span>Late payments may be subject to additional fees as per terms.</span>
                  </li>
                </ul>
              </div>

              <div className="avoid-break col-span-4 rounded-2xl border border-slate-200 p-5 print:p-2.5 flex flex-col justify-between">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">Authorized Signatory</div>
                </div>
                <div className="mt-8 pt-4 border-t border-slate-300 text-center text-xs font-bold text-slate-900">
                  Trev Mobility Tech Pvt Ltd
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};