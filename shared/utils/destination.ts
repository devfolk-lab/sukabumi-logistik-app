import type { Destination } from '#shared/types'

/** "Cibadak, Cibadak" — kelurahan first, then kecamatan. */
export function destinationTitle(d: Pick<Destination, 'subdistrict' | 'district'>): string {
  return [d.subdistrict, d.district].filter(Boolean).map(titleCase).join(', ')
}

/** "Sukabumi, Jawa Barat 43351" — the part that disambiguates the title. */
export function destinationSubtitle(d: Pick<Destination, 'city' | 'province' | 'zipCode'>): string {
  const place = [d.city, d.province].filter(Boolean).map(titleCase).join(', ')
  return d.zipCode ? `${place} ${d.zipCode}` : place
}

/**
 * Rebuilds a `Destination` from the label RajaOngkir returns
 * ("CIBADAK, CIBADAK, SUKABUMI, JAWA BARAT, 43351"), which is all a saved
 * address or an order keeps of the subdistrict.
 */
export function destinationFromLabel(id: number, label: string, zipCode?: string | null): Destination {
  const [subdistrict = '', district = '', city = '', province = '', zip = ''] = label.split(',').map(p => p.trim())
  return {
    id,
    label,
    province,
    city,
    district,
    subdistrict,
    zipCode: zipCode || zip
  }
}

/** RajaOngkir shouts in upper case; the UI should not. */
export function titleCase(value: string): string {
  return value.toLowerCase().replace(/(^|[\s/(-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}
