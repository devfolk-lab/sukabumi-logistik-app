import type { Area } from '#shared/types'

/** "Cibadak" — the kecamatan, which is what a Biteship area stands for. */
export function areaTitle(a: Area): string {
  return titleCase(a.administrative_division_level_3_name)
}

/** "Sukabumi, Jawa Barat, 43351" — kota, provinsi and kode pos under the kecamatan. */
export function areaSubtitle(a: Area): string {
  return [
    titleCase(a.administrative_division_level_2_name),
    titleCase(a.administrative_division_level_1_name),
    a.postal_code ? String(a.postal_code) : ''
  ].filter(Boolean).join(', ')
}

/** "Cibadak, Sukabumi" — the short place used on timelines and cards. */
export function areaPlace(a: Area): string {
  return [a.administrative_division_level_3_name, a.administrative_division_level_2_name]
    .filter(Boolean).map(titleCase).join(', ')
}

/** Biteship names are title case already; older rows were upper case. */
export function titleCase(value: string): string {
  return value.toLowerCase().replace(/(^|[\s/(-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}
