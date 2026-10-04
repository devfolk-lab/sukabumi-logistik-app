/** A point as Biteship takes it. */
export interface Coordinate {
  latitude: number
  longitude: number
}

/**
 * Reads "lat, lng" the way Google Maps copies it ("-6.9175, 106.9277").
 * Returns null for an empty field, `false` for one that does not parse.
 */
export function parseCoordinate(text: string): Coordinate | null | false {
  const value = text.trim()
  if (!value) return null

  const parts = value.split(/[\s,;]+/).filter(Boolean).map(Number)
  if (parts.length !== 2 || parts.some(n => !Number.isFinite(n))) return false

  const [latitude, longitude] = parts as [number, number]
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false
  return { latitude, longitude }
}
