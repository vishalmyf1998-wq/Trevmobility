import { Booking, DutySlip, Driver, Car, City, B2BEmployee, B2BClient } from "@/lib/types"

interface DutySlipProps {
  booking: Booking;
  dutySlip: DutySlip;
  driver?: Driver;
  car?: Car;
  city?: City;
  b2bEmployee?: B2BEmployee;
  b2bClient?: B2BClient;
}

export const PrintableDutySlip = ({ booking, dutySlip, driver, car, city, b2bEmployee, b2bClient }: DutySlipProps) => {
  const formatDate = (dateStr?: string) => dateStr ? new Date(dateStr).toLocaleDateString("en-IN") : "";
  const formatTime = (isoStr?: string) => isoStr ? new Date(isoStr).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true }) : "";

  return (
    <div className="font-sans text-slate-900 bg-slate-50 min-h-screen print:bg-white" id="duty-slip-print">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4; margin: 4mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .page { width: 100% !important; min-height: auto !important; margin: 0 !important; box-shadow: none !important; border: none !important; }
        }
      `}} />
      <main className="mx-auto px-4 pb-10 pt-6 print:p-0 w-full max-w-[210mm] print:max-w-[195mm] print:scale-[0.96] print:origin-top">
        <section className="page mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
          {/* Accent header */}
          <div className="relative">
            <div className="h-3 w-full bg-[#2DFF0A]"></div>
            <div className="px-8 pt-7 print:px-4 print:pt-4">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Duty Slip</div>
                  <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 print:text-xl">Official Duty Authorization</div>
                  <div className="mt-3 text-sm font-extrabold text-slate-900 print:mt-2">Trev Mobility Tech Private Limited</div>
                  <div className="mt-1 text-[11px] leading-5 text-slate-600 print:leading-4">
                    <div>Add- Plot no. 1049, Near Sai Mandir, Gali Number 1, Bharthal, Dwarka Sector 26, Delhi-110077</div>
                    <div>Contact- 9650303400</div>
                    <div>E-mail- bookings@trevcabs.com</div>
                  </div>
                </div>
                <div className="w-[240px] shrink-0">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-semibold text-slate-700">Slip No.</div>
                    <div className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900">
                      {dutySlip.dutySlipNumber}
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-600">Date</div>
                        <div className="mt-1 rounded-lg border border-slate-200 px-2 py-2 text-sm">{formatDate(dutySlip.createdAt) || "__/__/____"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 pb-8 pt-6 print:px-4 print:pb-4 print:pt-2">
            {/* Employee / Dept */}
            <div className="grid grid-cols-12 gap-4 print:gap-3">
              <div className="col-span-12 rounded-2xl border border-slate-200 p-5 print:p-2.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#2DFF0A]/20 ring-1 ring-[#2DFF0A]/50"></div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">Employee Details</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-12 gap-3 print:mt-2">
                  <div className="col-span-7">
                    <div className="text-[11px] font-semibold text-slate-600">Employee Name</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">{b2bEmployee?.name || booking.customerName || "______________________________"}</div>
                  </div>
                  <div className="col-span-5">
                    <div className="text-[11px] font-semibold text-slate-600">Employee ID</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">{b2bEmployee?.employeeId || "______________"}</div>
                  </div>

                  <div className="col-span-6">
                    <div className="text-[11px] font-semibold text-slate-600">Reporting Manager</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">________________________</div>
                  </div>
                  <div className="col-span-6">
                    <div className="text-[11px] font-semibold text-slate-600">Contact No.</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">{b2bEmployee?.phone || booking.customerPhone || "________________________"}</div>
                  </div>
                </div>
              </div>

              {/* Duty details */}
              <div className="col-span-12 rounded-2xl border border-slate-200 p-5 print:p-2.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#2DFF0A]/20 ring-1 ring-[#2DFF0A]/50"></div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">Duty Details</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-12 gap-3">
                  <div className="col-span-4">
                    <div className="text-[11px] font-semibold text-slate-600">From (Date)</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">{formatDate(booking.pickupDate) || "__/__/____"}</div>
                  </div>
                  <div className="col-span-4">
                    <div className="text-[11px] font-semibold text-slate-600">To (Date)</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">{booking.returnDate ? formatDate(booking.returnDate) : formatDate(booking.pickupDate) || "__/__/____"}</div>
                  </div>
                  <div className="col-span-4">
                    <div className="text-[11px] font-semibold text-slate-600">Duty Type</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm capitalize">{booking.tripType.replace(/_/g, ' ') || "On-duty / Outdoor / Travel"}</div>
                  </div>

                  <div className="col-span-4">
                    <div className="text-[11px] font-semibold text-slate-600">Start Time</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">{formatTime(dutySlip.startTime) || "__:__"}</div>
                  </div>
                  <div className="col-span-4">
                    <div className="text-[11px] font-semibold text-slate-600">End Time</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">{formatTime(dutySlip.endTime) || "__:__"}</div>
                  </div>
                  <div className="col-span-4">
                    <div className="text-[11px] font-semibold text-slate-600">Total Hours</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">{dutySlip.totalHours ? dutySlip.totalHours : "_____"}</div>
                  </div>

                  <div className="col-span-6">
                    <div className="text-[11px] font-semibold text-slate-600">Pickup Location</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">{booking.pickupLocation || "________________________________"}</div>
                  </div>
                  <div className="col-span-6">
                    <div className="text-[11px] font-semibold text-slate-600">Drop Location</div>
                    <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">{booking.dropLocation || "________________________________"}</div>
                  </div>

                  <div className="col-span-12">
                    <div className="text-[11px] font-semibold text-slate-600">Approvals</div>
                    <div className="mt-1 rounded-2xl border border-slate-200 bg-white p-3 print:p-1.5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs font-semibold text-slate-700">Supervisor / Manager</div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3 print:mt-1">
                        <div>
                          <div className="text-[11px] font-semibold text-slate-600">Name</div>
                          <div className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm">________________</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold text-slate-600">Date</div>
                          <div className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm">__/__/____</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Approvals + signatures */}
              <div className="col-span-12 grid grid-cols-12 gap-4">
              <div className="col-span-7 rounded-2xl border border-slate-200 p-5 print:p-2.5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#2DFF0A]/20 ring-1 ring-[#2DFF0A]/50"></div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">GPS Route Map</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="h-[160px] rounded-xl border border-dashed border-slate-300 bg-white print:h-[150px]"></div>
                  </div>
                </div>

              <div className="col-span-5 rounded-2xl border border-slate-200 p-5 print:p-2.5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#2DFF0A]/20 ring-1 ring-[#2DFF0A]/50"></div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">Employee Declaration</div>
                    </div>
                  </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 print:mt-2 print:p-2">
                    <div className="text-xs leading-5 text-slate-700">
                      I confirm that the above duty details are accurate and were performed for official purposes. I understand that any
                      misrepresentation may lead to disciplinary action as per company policy.
                    </div>
                    <div className="mt-4">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-600">Employee Sign</div>
                        <div className="mt-1 h-12 rounded-lg border border-slate-200 print:h-10"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
          <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 print:mt-2 print:p-2.5">
              <div className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Note:</span> Attach supporting documents if required.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};