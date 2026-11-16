import L from 'leaflet'

/**
 * A pin drawn as inline SVG. The map's default marker images are PNG files that bundlers tend to break, and drawing the
 * pin here also means no image is ever fetched from anywhere.
 */
export function pinIcon(color: string, selected = false): L.DivIcon {
  const size = selected ? 38 : 30
  return L.divIcon({
    className: 'geotrace-pin',
    html: `<svg width="${size}" height="${Math.round(size * 1.33)}" viewBox="0 0 30 40" aria-hidden="true"><path d="M15 39C15 39 2 24 2 14a13 13 0 0 1 26 0c0 10-13 25-13 25z" fill="${color}" stroke="#fff" stroke-width="2.5"/><circle cx="15" cy="14" r="5" fill="#fff"/></svg>`,
    iconSize: [size, Math.round(size * 1.33)],
    iconAnchor: [size / 2, Math.round(size * 1.33) - 1],
  })
}
