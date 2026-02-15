import { ZoomIn, ZoomOut } from '@tamagui/lucide-icons'
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Slider, Text, XStack, YStack } from 'tamagui'
import { cropImage } from '../utils/cropImage'
import { AppSheet } from './AppSheet'

const CROP_SIZE = 250

type ImageCropperProps = {
  open: boolean
  imageUri: string
  onCancel: () => void
  onSave: (blob: Blob) => void
}

// Web-only image cropper component
export function ImageCropper({
  open,
  imageUri,
  onCancel,
  onSave,
}: ImageCropperProps) {
  const insets = useSafeAreaInsets()
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [scale, setScale] = useState(1)
  const [minScale, setMinScale] = useState(1)
  const [maxScale, setMaxScale] = useState(5)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isSaving, setIsSaving] = useState(false)

  // Load image dimensions
  useEffect(() => {
    if (!imageUri) return

    const img = new Image()
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height })
      // Calculate initial scale to fit image in crop area
      const minDim = Math.min(img.width, img.height)
      const initialScale = CROP_SIZE / minDim
      const min = initialScale
      const max = initialScale * 5
      setMinScale(min)
      setMaxScale(max)
      setScale(initialScale)
      setPosition({ x: 0, y: 0 })
    }
    img.src = imageUri
  }, [imageUri])

  // Constrain position to keep image covering crop area
  const constrainPosition = useCallback(
    (x: number, y: number, currentScale: number) => {
      const scaledWidth = imageSize.width * currentScale
      const scaledHeight = imageSize.height * currentScale
      const maxX = Math.max(0, (scaledWidth - CROP_SIZE) / 2)
      const maxY = Math.max(0, (scaledHeight - CROP_SIZE) / 2)

      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      }
    },
    [imageSize],
  )

  // Handle pointer events for dragging
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    },
    [position],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      if (!isDragging) return

      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y

      setPosition(constrainPosition(newX, newY, scale))
    },
    [isDragging, dragStart, scale, constrainPosition],
  )

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Handle zoom slider change
  const handleZoomChange = useCallback(
    (value: number[]) => {
      const newScale = value[0]
      setScale(newScale)
      setPosition((prev) => constrainPosition(prev.x, prev.y, newScale))
    },
    [constrainPosition],
  )

  // Save cropped image
  const handleSave = useCallback(async () => {
    if (!imageUri || isSaving || imageSize.width === 0) return

    setIsSaving(true)
    try {
      const blob = await cropImage({
        imageUri,
        imageWidth: imageSize.width,
        imageHeight: imageSize.height,
        scale,
        positionX: position.x,
        positionY: position.y,
      })
      onSave(blob)
    } catch (error) {
      console.error('Failed to crop image:', error)
    } finally {
      setIsSaving(false)
    }
  }, [imageUri, imageSize, scale, position, isSaving, onSave])

  return (
    <AppSheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel()
      }}
      snapPoint={85}
      tintColor="$brandGreen"
      tintOpacity={0.15}
    >
      <View style={{ flex: 1 }}>
        <YStack flex={1} p={16}>
          {/* Header */}
          <XStack mb="$4" items="center" justify="center">
            <Text
              fontSize="$4"
              fontWeight="700"
              color="$brandGreen"
              textTransform="uppercase"
              letterSpacing={1}
            >
              Crop Avatar
            </Text>
          </XStack>

          {/* Crop area */}
          <YStack flex={1} items="center" justify="center">
            <div
              style={{
                position: 'relative',
                width: CROP_SIZE + 40,
                height: CROP_SIZE + 40,
                borderRadius: 16,
                overflow: 'hidden',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Image container with circular mask */}
              <div
                style={{
                  width: CROP_SIZE,
                  height: CROP_SIZE,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  touchAction: 'none',
                  position: 'relative',
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                {imageUri && imageSize.width > 0 && (
                  <img
                    src={imageUri}
                    alt="Crop preview"
                    draggable={false}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
                      transformOrigin: 'center',
                      maxWidth: 'none',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>

              {/* Circle border */}
              <div
                style={{
                  position: 'absolute',
                  width: CROP_SIZE + 4,
                  height: CROP_SIZE + 4,
                  borderRadius: '50%',
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {/* Zoom slider */}
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              style={{ width: CROP_SIZE + 40 }}
            >
              <XStack items="center" gap="$3" px="$2" mt="$4">
                <ZoomOut size={20} color="$brandGreen" />
                <Slider
                  flex={1}
                  value={[scale]}
                  min={minScale}
                  max={maxScale}
                  step={(maxScale - minScale) / 100}
                  onValueChange={handleZoomChange}
                >
                  <Slider.Track
                    bg="rgba(7, 104, 66, 0.3)"
                    height={8}
                    borderRadius={4}
                  >
                    <Slider.TrackActive bg="$brandGreen" />
                  </Slider.Track>
                  <Slider.Thumb
                    index={0}
                    circular
                    size="$2"
                    bg="$brandGreen"
                    borderWidth={0}
                    shadowOpacity={0}
                    pressStyle={{ bg: '$brandGreen' }}
                    hoverStyle={{ bg: '$brandGreen' }}
                    focusStyle={{ bg: '$brandGreen' }}
                  />
                </Slider>
                <ZoomIn size={20} color="$brandGreen" />
              </XStack>
            </div>

            {/* Instructions */}
            <Text
              color="$color11"
              fontSize="$3"
              mt="$3"
              style={{ textAlign: 'center' }}
            >
              Drag to reposition
            </Text>
          </YStack>

          {/* Action buttons */}
          <XStack mx={-16} mb={-16 - insets.bottom} pb={insets.bottom}>
            <YStack
              flex={1}
              height={80}
              bg="rgba(24, 143, 237, 0.15)"
              justify="center"
              items="center"
              cursor="pointer"
              pressStyle={{ opacity: 0.7 }}
              onPress={onCancel}
            >
              <Text
                fontSize="$5"
                fontWeight="800"
                color="$brandBlue"
                textTransform="uppercase"
                letterSpacing={2}
              >
                Cancel
              </Text>
            </YStack>
            <YStack
              flex={1}
              height={80}
              bg="rgba(7, 104, 66, 0.15)"
              opacity={isSaving ? 0.5 : 1}
              justify="center"
              items="center"
              cursor={isSaving ? 'default' : 'pointer'}
              pressStyle={{ opacity: 0.7 }}
              onPress={handleSave}
            >
              <Text
                fontSize="$5"
                fontWeight="800"
                color="$brandGreen"
                textTransform="uppercase"
                letterSpacing={2}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </YStack>
          </XStack>
        </YStack>
      </View>
    </AppSheet>
  )
}
