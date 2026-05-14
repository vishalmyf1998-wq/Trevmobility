const fs = require('fs');

let code = fs.readFileSync('lib/types.ts', 'utf8');

if (!code.includes('export interface WalletTransaction')) {
  code += `
export interface WalletTransaction {
  id: string;
  b2cCustomerId: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  createdAt: string;
}

export interface B2BApprovalRule {
  id: string;
  b2bClientId?: string;
  name?: string;
  isActive: boolean;
  createdAt: string;
}
`;
}

// Update Booking
code = code.replace(/export interface Booking \{[\s\S]*?createdAt: string;\n\}/g, (match) => {
  if (match.includes('pendingEdits?: any')) return match;
  return match.replace('createdAt: string;', `
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  pendingEdits?: any;
  originalStatus?: string;
  createdAt: string;
`).replace(`status: 'pending' | 'confirmed' | 'assigned' | 'dispatched' | 'arrived' | 'picked_up' | 'dropped' | 'closed' | 'cancelled'`, 
  `status: 'pending' | 'confirmed' | 'assigned' | 'dispatched' | 'arrived' | 'picked_up' | 'dropped' | 'closed' | 'cancelled' | 'pending_edit_approval' | 'completed' | 'edit_approved' | 'rejected' | 'status_reverted' | 'created' | 'reassigned'`);
});

// Update BookingEventLog
code = code.replace(/event: 'created' \| 'confirmed'[\s\S]*?'status_reverted'/g, 
  `event: 'created' | 'confirmed' | 'assigned' | 'reassigned' | 'dispatched' | 'arrived' | 'picked_up' | 'dropped' | 'closed' | 'cancelled' | 'status_reverted' | 'pending_edit_approval' | 'completed' | 'edit_approved' | 'rejected'`);

// Update Driver
code = code.replace(/export interface Driver \{[\s\S]*?createdAt: string;\n\}/g, (match) => {
  return match.replace(`status: 'active' | 'inactive' | 'suspended'`, 
  `status: 'active' | 'inactive' | 'suspended';
  joiningDate?: string;
  monthlySalary?: number;
  password?: string;
`);
});

// Update Car
code = code.replace(/export interface Car \{[\s\S]*?createdAt: string;\n\}/g, (match) => {
  return match.replace('createdAt: string;', `
  createdAt: string;
`);
});

// Update B2CCustomer
code = code.replace(/export interface B2CCustomer \{[\s\S]*?updatedAt\?: string;\n\}/g, (match) => {
  if (match.includes('walletBalance')) return match;
  return match.replace('updatedAt?: string;', `
  status?: 'active' | 'inactive';
  walletBalance?: number;
  updatedAt?: string;
`);
});

// Update B2BClient
code = code.replace(/export interface B2BClient \{[\s\S]*?createdAt: string;\n\}/g, (match) => {
  if (match.includes('webhookUrl')) return match;
  return match.replace('createdAt: string;', `
  webhookUrl?: string;
  orgId?: string;
  industry?: string;
  createdAt: string;
`);
});

// Replace peakHour with array support
code = code.replace(/peakHour: PeakHourConfig/g, 'peakHour: PeakHourConfig | PeakHourConfig[]');

fs.writeFileSync('lib/types.ts', code);
