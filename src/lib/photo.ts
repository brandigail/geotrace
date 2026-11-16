const MAX_SIDE = 1280
const QUALITY = 0.8
const MAX_INPUT_BYTES = 25 * 1024 * 1024

export class PhotoError extends Error {}

/**
 * Shrinks a waypoint photo to at most 1280 px on the long side as JPEG, so a multi-megabyte phone photo becomes a
 * few hundred kilobytes in IndexedDB. The camera's rotation is applied, so a portrait shot is stored upright.
 */
export async function preparePhoto(file: Blob): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new PhotoError('That file is not an image.')
  if (file.size > MAX_INPUT_BYTES) throw new PhotoError('That photo is too large (the limit is 25 MB).')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new PhotoError('That photo could not be read. Try a JPEG or PNG image.')
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new PhotoError('Your browser could not prepare the photo.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
  if (!blob) throw new PhotoError('Your browser could not prepare the photo.')
  return blob
}

/** A plain picture with a caption, drawn in the browser, used as the sample waypoint photos so no image files ship with the app. */
export async function drawPlaceholderPhoto(label: string, hue: number): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 420
  const context = canvas.getContext('2d')
  if (!context) return null
  const sky = context.createLinearGradient(0, 0, 0, 420)
  sky.addColorStop(0, `hsl(${hue} 70% 72%)`)
  sky.addColorStop(1, `hsl(${(hue + 40) % 360} 60% 88%)`)
  context.fillStyle = sky
  context.fillRect(0, 0, 640, 420)
  context.fillStyle = `hsl(${(hue + 120) % 360} 35% 38%)`
  context.beginPath()
  context.moveTo(0, 420)
  context.lineTo(0, 300)
  context.lineTo(160, 210)
  context.lineTo(300, 290)
  context.lineTo(450, 170)
  context.lineTo(640, 300)
  context.lineTo(640, 420)
  context.closePath()
  context.fill()
  context.fillStyle = 'rgba(15, 23, 42, 0.78)'
  context.font = '600 24px system-ui, sans-serif'
  context.fillText(label.length > 38 ? `${label.slice(0, 37)}…` : label, 24, 48)
  context.font = '14px system-ui, sans-serif'
  context.fillText('Sample photo (generated placeholder)', 24, 76)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8))
}
