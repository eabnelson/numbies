export type Country = {
  iso: string
  name: string
  code: string
  flag: string
}

export const countries: Country[] = [
  { iso: 'US', name: 'United States', code: '+1', flag: '🇺🇸' },
  { iso: 'CA', name: 'Canada', code: '+1', flag: '🇨🇦' },
  { iso: 'GB', name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { iso: 'AU', name: 'Australia', code: '+61', flag: '🇦🇺' },
  { iso: 'DE', name: 'Germany', code: '+49', flag: '🇩🇪' },
  { iso: 'FR', name: 'France', code: '+33', flag: '🇫🇷' },
  { iso: 'IT', name: 'Italy', code: '+39', flag: '🇮🇹' },
  { iso: 'ES', name: 'Spain', code: '+34', flag: '🇪🇸' },
  { iso: 'NL', name: 'Netherlands', code: '+31', flag: '🇳🇱' },
  { iso: 'BE', name: 'Belgium', code: '+32', flag: '🇧🇪' },
  { iso: 'CH', name: 'Switzerland', code: '+41', flag: '🇨🇭' },
  { iso: 'AT', name: 'Austria', code: '+43', flag: '🇦🇹' },
  { iso: 'SE', name: 'Sweden', code: '+46', flag: '🇸🇪' },
  { iso: 'NO', name: 'Norway', code: '+47', flag: '🇳🇴' },
  { iso: 'DK', name: 'Denmark', code: '+45', flag: '🇩🇰' },
  { iso: 'FI', name: 'Finland', code: '+358', flag: '🇫🇮' },
  { iso: 'IE', name: 'Ireland', code: '+353', flag: '🇮🇪' },
  { iso: 'PT', name: 'Portugal', code: '+351', flag: '🇵🇹' },
  { iso: 'PL', name: 'Poland', code: '+48', flag: '🇵🇱' },
  { iso: 'CZ', name: 'Czech Republic', code: '+420', flag: '🇨🇿' },
  { iso: 'HU', name: 'Hungary', code: '+36', flag: '🇭🇺' },
  { iso: 'RO', name: 'Romania', code: '+40', flag: '🇷🇴' },
  { iso: 'GR', name: 'Greece', code: '+30', flag: '🇬🇷' },
  { iso: 'JP', name: 'Japan', code: '+81', flag: '🇯🇵' },
  { iso: 'KR', name: 'South Korea', code: '+82', flag: '🇰🇷' },
  { iso: 'CN', name: 'China', code: '+86', flag: '🇨🇳' },
  { iso: 'IN', name: 'India', code: '+91', flag: '🇮🇳' },
  { iso: 'SG', name: 'Singapore', code: '+65', flag: '🇸🇬' },
  { iso: 'HK', name: 'Hong Kong', code: '+852', flag: '🇭🇰' },
  { iso: 'TW', name: 'Taiwan', code: '+886', flag: '🇹🇼' },
  { iso: 'TH', name: 'Thailand', code: '+66', flag: '🇹🇭' },
  { iso: 'MY', name: 'Malaysia', code: '+60', flag: '🇲🇾' },
  { iso: 'PH', name: 'Philippines', code: '+63', flag: '🇵🇭' },
  { iso: 'ID', name: 'Indonesia', code: '+62', flag: '🇮🇩' },
  { iso: 'VN', name: 'Vietnam', code: '+84', flag: '🇻🇳' },
  { iso: 'NZ', name: 'New Zealand', code: '+64', flag: '🇳🇿' },
  { iso: 'MX', name: 'Mexico', code: '+52', flag: '🇲🇽' },
  { iso: 'BR', name: 'Brazil', code: '+55', flag: '🇧🇷' },
  { iso: 'AR', name: 'Argentina', code: '+54', flag: '🇦🇷' },
  { iso: 'CL', name: 'Chile', code: '+56', flag: '🇨🇱' },
  { iso: 'CO', name: 'Colombia', code: '+57', flag: '🇨🇴' },
  { iso: 'PE', name: 'Peru', code: '+51', flag: '🇵🇪' },
  { iso: 'ZA', name: 'South Africa', code: '+27', flag: '🇿🇦' },
  { iso: 'AE', name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
  { iso: 'SA', name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
  { iso: 'IL', name: 'Israel', code: '+972', flag: '🇮🇱' },
  { iso: 'TR', name: 'Turkey', code: '+90', flag: '🇹🇷' },
  { iso: 'RU', name: 'Russia', code: '+7', flag: '🇷🇺' },
  { iso: 'UA', name: 'Ukraine', code: '+380', flag: '🇺🇦' },
]

export const defaultCountry = countries[0] // US

export function getCountryByIso(iso: string): Country | undefined {
  return countries.find((c) => c.iso === iso)
}

export function getCountryByCode(code: string): Country | undefined {
  return countries.find((c) => c.code === code)
}
