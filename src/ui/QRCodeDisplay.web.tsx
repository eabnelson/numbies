import { toCanvas } from 'qrcode'
import { useEffect, useRef } from 'react'

// Convert named colors to hex (qrcode library requires hex)
function toHexColor(color: string): string {
  const namedColors: Record<string, string> = {
    black: '#000000',
    white: '#ffffff',
    transparent: '#00000000',
  }
  return namedColors[color.toLowerCase()] ?? color
}

interface QRCodeDisplayProps {
  value: string
  size?: number
  backgroundColor?: string
  color?: string
}

export function QRCodeDisplay({
  value,
  size = 200,
  backgroundColor = '#ffffff',
  color = '#000000',
}: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hexColor = toHexColor(color)
  const hexBgColor = toHexColor(backgroundColor)

  useEffect(() => {
    if (canvasRef.current) {
      toCanvas(canvasRef.current, value, {
        width: size,
        margin: 0,
        color: {
          dark: hexColor,
          light: hexBgColor,
        },
      })
    }
  }, [value, size, hexBgColor, hexColor])

  return <canvas ref={canvasRef} width={size} height={size} />
}
