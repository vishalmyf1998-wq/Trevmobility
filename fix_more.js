const fs = require('fs');

// 1. Fix lib/types.ts
let typesContent = fs.readFileSync('lib/types.ts', 'utf8');

// B2BApprovalRule clientId
typesContent = typesContent.replace('b2bClientId?: string;', 'clientId?: string;');
typesContent = typesContent.replace('approverEmployeeId?: string;', 'approverEmployeeId?: string;');
typesContent = typesContent.replace('maxApprovalAmount?: number;', 'maxApprovalAmount?: number;');

// B2BClient paymentTerms
typesContent = typesContent.replace('paymentModel: ', 'paymentTerms?: string;\n  paymentModel?: ');

// B2CCustomer status blocked
typesContent = typesContent.replace(`status?: 'active' | 'inactive'`, `status?: 'active' | 'inactive' | 'blocked'`);

// WalletTransaction customerId
typesContent = typesContent.replace('b2cCustomerId?: string;', 'customerId?: string;');

// Driver optionals
typesContent = typesContent.replace('driverId: string', 'driverId?: string');
typesContent = typesContent.replace('licenseExpiry: string', 'licenseExpiry?: string');
typesContent = typesContent.replace('address: string', 'address?: string');

// Car optionals
typesContent = typesContent.replace('color: string', 'color?: string');
typesContent = typesContent.replace('seatingCapacity: number', 'seatingCapacity?: number');

// Booking tripType
typesContent = typesContent.replace(`tripType: 'airport_pickup' | 'airport_drop' | 'rental' | 'city_ride' | 'outstation'`, `tripType: string`);

fs.writeFileSync('lib/types.ts', typesContent);

// 2. Fix lib/admin-context.tsx
let adminContent = fs.readFileSync('lib/admin-context.tsx', 'utf8');
if (!adminContent.includes('BookingEventLog')) {
  // It probably does include it, but the import is missing
  adminContent = adminContent.replace('Invoice, PeakHourConfig', 'Invoice, PeakHourConfig, BookingEventLog');
}
fs.writeFileSync('lib/admin-context.tsx', adminContent);

// 3. Fix app/b2b-approvals/page.tsx
let b2bApprovals = fs.readFileSync('app/b2b-approvals/page.tsx', 'utf8');
b2bApprovals = b2bApprovals.replace(/"pending_approval"/g, '"pending"');
fs.writeFileSync('app/b2b-approvals/page.tsx', b2bApprovals);
