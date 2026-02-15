import QRCode from 'react-native-qrcode-svg'

interface QRCodeDisplayProps {
  value: string
  size?: number
  backgroundColor?: string
  color?: string
}

export function QRCodeDisplay({
  value,
  size = 200,
  backgroundColor = 'white',
  color = 'black',
}: QRCodeDisplayProps) {
  return (
    <QRCode
      value={value}
      size={size}
      backgroundColor={backgroundColor}
      color={color}
    />
  )
}
