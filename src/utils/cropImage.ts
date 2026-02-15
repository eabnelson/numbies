// Web implementation using Canvas API

const CROP_SIZE = 250

type CropParams = {
  imageUri: string
  imageWidth: number
  imageHeight: number
  scale: number
  positionX: number
  positionY: number
}

export async function cropImage(params: CropParams): Promise<Blob> {
  const { imageUri, imageWidth, imageHeight, scale, positionX, positionY } =
    params

  const canvas = document.createElement('canvas')
  canvas.width = CROP_SIZE
  canvas.height = CROP_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No canvas context')

  const img = new Image()

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = (e) => {
      console.error('Image load error:', e)
      reject(e)
    }
    img.src = imageUri
  })

  // Calculate source rectangle in image coordinates
  const scaledWidth = imageWidth * scale
  const scaledHeight = imageHeight * scale

  // The crop area center in scaled image space
  const cropCenterX = scaledWidth / 2 - positionX
  const cropCenterY = scaledHeight / 2 - positionY

  // Convert to original image coordinates
  const srcCenterX = cropCenterX / scale
  const srcCenterY = cropCenterY / scale
  const srcSize = CROP_SIZE / scale

  const srcX = srcCenterX - srcSize / 2
  const srcY = srcCenterY - srcSize / 2

  ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, CROP_SIZE, CROP_SIZE)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create blob'))
        }
      },
      'image/jpeg',
      0.9,
    )
  })
}
