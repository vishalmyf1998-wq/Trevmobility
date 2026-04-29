"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  inputClassName?: string
  list?: string
  id?: string
  name?: string
}

const COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 India (+91)", digits: 10 },
  { code: "+1", label: "🇺🇸 USA (+1)", digits: 10 },
  { code: "+44", label: "🇬🇧 UK (+44)", digits: 10 },
  { code: "+61", label: "🇦🇺 Australia (+61)", digits: 9 },
  { code: "+65", label: "🇸🇬 Singapore (+65)", digits: 8 },
  { code: "+971", label: "🇦🇪 UAE (+971)", digits: 9 },
  { code: "+966", label: "🇸🇦 Saudi Arabia (+966)", digits: 9 },
  { code: "+974", label: "🇶🇦 Qatar (+974)", digits: 8 },
  { code: "+965", label: "🇰🇼 Kuwait (+965)", digits: 8 },
  { code: "+973", label: "🇧🇭 Bahrain (+973)", digits: 8 },
  { code: "+968", label: "🇴🇲 Oman (+968)", digits: 8 },
  { code: "+92", label: "🇵🇰 Pakistan (+92)", digits: 10 },
  { code: "+880", label: "🇧🇩 Bangladesh (+880)", digits: 10 },
  { code: "+94", label: "🇱🇰 Sri Lanka (+94)", digits: 9 },
  { code: "+977", label: "🇳🇵 Nepal (+977)", digits: 10 },
  { code: "+86", label: "🇨🇳 China (+86)", digits: 11 },
  { code: "+81", label: "🇯🇵 Japan (+81)", digits: 10 },
  { code: "+82", label: "🇰🇷 South Korea (+82)", digits: 10 },
  { code: "+66", label: "🇹🇭 Thailand (+66)", digits: 9 },
  { code: "+84", label: "🇻🇳 Vietnam (+84)", digits: 9 },
  { code: "+62", label: "🇮🇩 Indonesia (+62)", digits: 10 },
  { code: "+60", label: "🇲🇾 Malaysia (+60)", digits: 9 },
  { code: "+63", label: "🇵🇭 Philippines (+63)", digits: 10 },
  { code: "+49", label: "🇩🇪 Germany (+49)", digits: 10 },
  { code: "+33", label: "🇫🇷 France (+33)", digits: 9 },
  { code: "+39", label: "🇮🇹 Italy (+39)", digits: 10 },
  { code: "+34", label: "🇪🇸 Spain (+34)", digits: 9 },
  { code: "+7", label: "🇷🇺 Russia (+7)", digits: 10 },
  { code: "+90", label: "🇹🇷 Turkey (+90)", digits: 10 },
  { code: "+27", label: "🇿🇦 South Africa (+27)", digits: 9 },
  { code: "+20", label: "🇪🇬 Egypt (+20)", digits: 10 },
  { code: "+254", label: "🇰🇪 Kenya (+254)", digits: 9 },
  { code: "+234", label: "🇳🇬 Nigeria (+234)", digits: 10 },
  { code: "+212", label: "🇲🇦 Morocco (+212)", digits: 9 },
  { code: "+98", label: "🇮🇷 Iran (+98)", digits: 10 },
  { code: "+964", label: "🇮🇶 Iraq (+964)", digits: 10 },
  { code: "+963", label: "🇸🇾 Syria (+963)", digits: 9 },
  { code: "+961", label: "🇱🇧 Lebanon (+961)", digits: 7 },
  { code: "+962", label: "🇯🇴 Jordan (+962)", digits: 9 },
  { code: "+970", label: "🇵🇸 Palestine (+970)", digits: 9 },
  { code: "+972", label: "🇮🇱 Israel (+972)", digits: 9 },
  { code: "+46", label: "🇸🇪 Sweden (+46)", digits: 10 },
  { code: "+47", label: "🇳🇴 Norway (+47)", digits: 8 },
  { code: "+45", label: "🇩🇰 Denmark (+45)", digits: 8 },
  { code: "+358", label: "🇫🇮 Finland (+358)", digits: 10 },
  { code: "+31", label: "🇳🇱 Netherlands (+31)", digits: 9 },
  { code: "+32", label: "🇧🇪 Belgium (+32)", digits: 9 },
  { code: "+41", label: "🇨🇭 Switzerland (+41)", digits: 9 },
  { code: "+43", label: "🇦🇹 Austria (+43)", digits: 10 },
  { code: "+48", label: "🇵🇱 Poland (+48)", digits: 9 },
  { code: "+420", label: "🇨🇿 Czech Republic (+420)", digits: 9 },
  { code: "+36", label: "🇭🇺 Hungary (+36)", digits: 9 },
  { code: "+30", label: "🇬🇷 Greece (+30)", digits: 10 },
  { code: "+351", label: "🇵🇹 Portugal (+351)", digits: 9 },
  { code: "+353", label: "🇮🇪 Ireland (+353)", digits: 9 },
  { code: "+372", label: "🇪🇪 Estonia (+372)", digits: 8 },
  { code: "+371", label: "🇱🇻 Latvia (+371)", digits: 8 },
  { code: "+370", label: "🇱🇹 Lithuania (+370)", digits: 8 },
  { code: "+375", label: "🇧🇾 Belarus (+375)", digits: 9 },
  { code: "+380", label: "🇺🇦 Ukraine (+380)", digits: 9 },
  { code: "+40", label: "🇷🇴 Romania (+40)", digits: 10 },
  { code: "+359", label: "🇧🇬 Bulgaria (+359)", digits: 9 },
  { code: "+386", label: "🇸🇮 Slovenia (+386)", digits: 9 },
  { code: "+385", label: "🇭🇷 Croatia (+385)", digits: 9 },
  { code: "+381", label: "🇷🇸 Serbia (+381)", digits: 9 },
  { code: "+382", label: "🇲🇪 Montenegro (+382)", digits: 8 },
  { code: "+389", label: "🇲🇰 North Macedonia (+389)", digits: 8 },
  { code: "+355", label: "🇦🇱 Albania (+355)", digits: 9 },
  { code: "+376", label: "🇦🇩 Andorra (+376)", digits: 6 },
  { code: "+423", label: "🇱🇮 Liechtenstein (+423)", digits: 7 },
  { code: "+377", label: "🇲🇨 Monaco (+377)", digits: 8 },
  { code: "+378", label: "🇸🇲 San Marino (+378)", digits: 8 },
  { code: "+379", label: "🇻🇦 Vatican City (+379)", digits: 8 },
]

export function getCountryCodeFromPhone(phone: string): string {
  if (!phone) return "+91"
  // Check if phone starts with any country code
  const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length)
  for (const country of sortedCodes) {
    if (phone.startsWith(country.code)) {
      return country.code
    }
  }
  return "+91"
}

export function getPhoneWithoutCountryCode(phone: string, countryCode: string): string {
  if (!phone) return ""
  if (phone.startsWith(countryCode)) {
    return phone.slice(countryCode.length)
  }
  // If no country code prefix, return as-is (might be raw digits)
  return phone.replace(/^\+/, "")
}

export function formatPhoneNumber(phone: string, countryCode: string): string {
  const digits = phone.replace(/\D/g, "")
  if (countryCode === "+91" && digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  return digits
}

export function validatePhoneNumber(phone: string, countryCode: string): { valid: boolean; error?: string } {
  const digits = phone.replace(/\D/g, "")
  const country = COUNTRY_CODES.find((c) => c.code === countryCode)
  const expectedDigits = country?.digits || 10

  if (!digits) {
    return { valid: false, error: "Phone number is required" }
  }

  if (digits.length !== expectedDigits) {
    return {
      valid: false,
      error: `Phone number must be exactly ${expectedDigits} digits for ${country?.label.split("(")[0].trim() || "selected country"}`,
    }
  }

  return { valid: true }
}

export function getFullPhoneNumber(phoneWithoutCode: string, countryCode: string): string {
  const digits = phoneWithoutCode.replace(/\D/g, "")
  return `${countryCode}${digits}`
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value,
      onChange,
      onBlur,
      placeholder = "Enter phone number",
      required = false,
      disabled = false,
      className,
      inputClassName,
      list,
      id,
      name,
    },
    ref
  ) => {
    const [countryCode, setCountryCode] = React.useState(() => getCountryCodeFromPhone(value))
    const [localValue, setLocalValue] = React.useState(() => getPhoneWithoutCountryCode(value, countryCode))
    const [error, setError] = React.useState<string | null>(null)

    // Sync when external value changes
    React.useEffect(() => {
      const newCountryCode = getCountryCodeFromPhone(value)
      setCountryCode(newCountryCode)
      setLocalValue(getPhoneWithoutCountryCode(value, newCountryCode))
    }, [value])

    const handleCountryChange = (newCode: string) => {
      setCountryCode(newCode)
      const fullPhone = getFullPhoneNumber(localValue, newCode)
      onChange(fullPhone)
      // Re-validate
      const validation = validatePhoneNumber(localValue, newCode)
      setError(validation.valid ? null : validation.error || null)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Only allow digits
      const raw = e.target.value.replace(/\D/g, "")
      setLocalValue(raw)
      const fullPhone = getFullPhoneNumber(raw, countryCode)
      onChange(fullPhone)
      // Clear error while typing
      if (error) {
        const validation = validatePhoneNumber(raw, countryCode)
        setError(validation.valid ? null : validation.error || null)
      }
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const validation = validatePhoneNumber(localValue, countryCode)
      setError(validation.valid ? null : validation.error || null)
      onBlur?.(e)
    }

    const country = COUNTRY_CODES.find((c) => c.code === countryCode)
    const maxLength = country?.digits || 10

    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <div className="flex gap-2">
          <Select
            value={countryCode}
            onValueChange={handleCountryChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-[140px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {COUNTRY_CODES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            ref={ref}
            type="tel"
            inputMode="numeric"
            value={localValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            maxLength={maxLength}
            className={cn("flex-1", inputClassName)}
            list={list}
            id={id}
            name={name}
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }
)
PhoneInput.displayName = "PhoneInput"

export { PhoneInput }

