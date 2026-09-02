import React from 'react';
import { Booking, B2CCustomer, B2BClient, B2BEmployee } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Field, FieldLabel } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/phone-input";
import { Search, XCircle, Building2 } from "lucide-react";
import { toast } from "sonner";

type BookingFormData = Omit<Booking, "id" | "createdAt" | "bookingNumber" | "eventLog">;

interface CustomerInfoFormProps {
  formData: BookingFormData;
  setFormData: React.Dispatch<React.SetStateAction<BookingFormData>>;
  customerType: "b2c" | "b2b";
  setCustomerType: React.Dispatch<React.SetStateAction<"b2c" | "b2b">>;
  b2cSearchQuery: string;
  setB2cSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  b2cSearchOpen: boolean;
  setB2cSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isB2BUser: boolean;
  currentB2BUser: B2BEmployee | null;
  b2cCustomers: B2CCustomer[];
  b2bClients: B2BClient[];
  b2bEmployees: B2BEmployee[];
}

const CustomerInfoForm: React.FC<CustomerInfoFormProps> = ({
  formData,
  setFormData,
  customerType,
  setCustomerType,
  b2cSearchQuery,
  setB2cSearchQuery,
  b2cSearchOpen,
  setB2cSearchOpen,
  isB2BUser,
  currentB2BUser,
  b2cCustomers,
  b2bClients,
  b2bEmployees,
}) => {
  const isCorpEmployee = currentB2BUser && currentB2BUser.employeeId === 'dummy-corp-emp'; // Simplified check, refine if needed

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Information</CardTitle>
        <CardDescription>Select or create a customer for this booking.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Field>
            <FieldLabel>Customer Type</FieldLabel>
            <Select value={customerType} onValueChange={(v) => setCustomerType(v as "b2c" | "b2b")} disabled={isB2BUser}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="b2c">Individual (B2C)</SelectItem>
                <SelectItem value="b2b">Business (B2B)</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {customerType === 'b2c' && (
            <div className="space-y-4 pt-4 border-t">
              <Field>
                <FieldLabel>Search Existing Customer</FieldLabel>
                <Popover open={b2cSearchOpen} onOpenChange={setB2cSearchOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, phone, or code..."
                        value={b2cSearchQuery}
                        onChange={(e) => {
                          setB2cSearchQuery(e.target.value);
                          if (e.target.value.length > 0) setB2cSearchOpen(true);
                          else setB2cSearchOpen(false);
                        }}
                        className="pl-10"
                      />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                    <Command>
                      <CommandInput placeholder="Type to search..." />
                      <CommandList>
                        <CommandEmpty>
                          <div className="p-4 text-sm text-center">No customers found.</div>
                        </CommandEmpty>
                        <CommandGroup>
                          {b2cCustomers
                            .filter(c =>
                              !b2cSearchQuery ||
                              c.name.toLowerCase().includes(b2cSearchQuery.toLowerCase()) ||
                              c.phone.includes(b2cSearchQuery) ||
                              (c.customerCode && c.customerCode.toLowerCase().includes(b2cSearchQuery.toLowerCase()))
                            ).map((customer) => (
                              <CommandItem
                                key={customer.id}
                                onSelect={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    b2cCustomerId: customer.id,
                                    customerName: customer.name,
                                    customerPhone: customer.phone,
                                    customerEmail: customer.email || "",
                                    customerAddress: customer.address || "",
                                  }));
                                  setB2cSearchQuery(customer.name);
                                  setB2cSearchOpen(false);
                                  toast.success(`Selected: ${customer.name}`);
                                }}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div>
                                    <p>{customer.name} <span className="text-muted-foreground text-xs">({customer.customerCode})</span></p>
                                    <p className="text-xs text-muted-foreground">{customer.phone}</p>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </Field>
              {formData.b2cCustomerId ? (
                <div className="bg-muted/50 rounded-lg p-3 relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 text-muted-foreground"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        b2cCustomerId: undefined,
                        customerName: "",
                        customerPhone: "",
                        customerEmail: "",
                        customerAddress: "",
                      }));
                      setB2cSearchQuery("");
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                  <p className="text-sm font-semibold mb-2">Selected Customer</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div><strong className="text-muted-foreground font-normal">Name:</strong> {formData.customerName}</div>
                    <div><strong className="text-muted-foreground font-normal">Phone:</strong> {formData.customerPhone}</div>
                    {formData.customerEmail && <div className="col-span-2"><strong className="text-muted-foreground font-normal">Email:</strong> {formData.customerEmail}</div>}
                    {formData.customerAddress && <div className="col-span-2"><strong className="text-muted-foreground font-normal">Address:</strong> {formData.customerAddress}</div>}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Customer Name *</FieldLabel>
                    <Input value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} placeholder="Full Name" />
                  </Field>
                  <Field>
                    <FieldLabel>Customer Phone *</FieldLabel>
                    <PhoneInput value={formData.customerPhone} onChange={val => setFormData({...formData, customerPhone: val})} placeholder="Phone Number" />
                  </Field>
                </div>
              )}
            </div>
          )}

          {customerType === 'b2b' && (
            <div className="space-y-4 pt-4 border-t">
              {isB2BUser && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">B2B Booking Only</p>
                    <p className="text-xs text-muted-foreground">Your account is restricted to corporate bookings</p>
                  </div>
                </div>
              )}
              <Field>
                <FieldLabel>Select B2B Client *</FieldLabel>
                <Select
                  value={formData.b2bClientId || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, b2bClientId: value, b2bEmployeeId: undefined })
                  }
                  disabled={isB2BUser}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a B2B client" />
                  </SelectTrigger>
                  <SelectContent>
                    {b2bClients
                      .filter((c) => c.status === "active")
                      .map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.companyName} - {client.contactPerson}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
              {formData.b2bClientId && (
                <Field>
                  <FieldLabel>Select Employee {isCorpEmployee && "(Auto-selected)"}</FieldLabel>
                  <Select
                    value={formData.b2bEmployeeId || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, b2bEmployeeId: value })
                    }
                    disabled={isCorpEmployee}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {b2bEmployees
                        .filter((e) => e.b2bClientId === formData.b2bClientId && e.status === "approved" && e.canLogin)
                        .map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name} - {employee.employeeId} ({employee.officeEmail})
                          </SelectItem>
                        ))}
                      {b2bEmployees.filter((e) => e.b2bClientId === formData.b2bClientId && e.status === "approved" && e.canLogin).length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No approved employees found for this client
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {isB2BUser && currentB2BUser && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Logged in as: <strong>{currentB2BUser.name}</strong> ({currentB2BUser.employeeId})
                    </p>
                  )}
                </Field>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerInfoForm;
