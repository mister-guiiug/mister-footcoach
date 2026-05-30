/**
 * Static navigation links for the logistics module (specs §14.3).
 *
 * No user position is transmitted: these are plain URLs built from the
 * destination address only.
 */

export function googleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address
  )}`;
}

export function appleMapsUrl(address: string): string {
  return `https://maps.apple.com/?q=${encodeURIComponent(address)}`;
}
