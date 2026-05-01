# Employee Login Add Booking Restrictions - Implementation Plan

## Status: 🚀 In Progress

### Plan Summary
- Restrict add booking to **B2B only** for employee login (no B2C tab)
- **Auto-select** logged-in employee's name (read-only)
- **Remove promo code** field for employees
- Changes **only** for employee login via `isEmployee` check

### Step 1: ✅ Create TODO.md (Current)
- Track implementation progress

### Step 2: 🔄 Edit app/bookings/page.tsx
**Changes needed:**
```
1. Hide B2C TabsList completely when isEmployee:
   {!isEmployee && (
     <TabsList className="grid w-full grid-cols-2 mb-4">
       <TabsTrigger value="b2c">Individual (B2C)</TabsTrigger>
       <TabsTrigger value="b2b">Business (B2B)</TabsTrigger>
     </TabsList>
   )}

2. Auto-select B2B Employee field when isEmployee:
   useEffect(() => {
     if (isEmployee && currentEmployee?.id) {
       setFormData(prev => ({
         ...prev,
         b2bClientId: currentEmployee.b2bClientId,
         b2bEmployeeId: currentEmployee.id
       }));
     }
   }, [isEmployee, currentEmployee]);

3. Make B2B Employee field read-only for employees:
   <Select disabled={isEmployee} ...>

4. Hide Promo Code section for employees:
   {!isEmployee && (
     <Field>
       <FieldLabel>Promo Code</FieldLabel>
       ... promo code select
     </Field>
   )}

5. Auto-fill customer details from currentEmployee when isEmployee
```

### Step 3: ✅ Test Changes
```
1. Login as Employee → Verify:
   ✅ B2C tab hidden
   ✅ B2B Employee auto-selected & read-only  
   ✅ Promo code field hidden
   ✅ Customer details auto-filled from employee
   ✅ Can create B2B booking successfully

2. Login as Admin → Verify no changes:
   ✅ Both B2C/B2B tabs visible
   ✅ Promo code available
```

### Step 4: ✅ Complete
```
- [ ] Step 2: Edit app/bookings/page.tsx
- [ ] Step 3: Test employee booking flow  
- [ ] Verify admin flow unchanged
```

**Next Action:** Edit `app/bookings/page.tsx` with targeted changes using `edit_file` tool.

