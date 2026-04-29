# Phone Input with Country Code & Indian Number Validation

## Steps
- [x] 1. Create `components/ui/phone-input.tsx` reusable component
- [x] 2. Update `app/drivers/page.tsx`
- [x] 3. Update `app/admin-users/page.tsx`
- [x] 4. Update `app/b2b-clients/page.tsx`
- [x] 5. Update `app/b2b-employees/page.tsx`
- [x] 6. Update `components/page.tsx`
- [x] 7. Update `app/bookings/page.tsx`
- [x] 8. Fix duplicate country code keys in COUNTRY_CODES array
- [x] 9. Run build check (PASSED)

## Pre-existing Errors (not related to PhoneInput):
- `app/b2b-clients/page.tsx`: `orgId` / `webhookUrl` type mismatches (10 errors)
- `app/bookings/page.tsx` & `components/page.tsx`: `DutySlip` type missing, `"pending"` status invalid (6 errors)
- `lib/admin-context.tsx`: Mock data type mismatches (9 errors)


