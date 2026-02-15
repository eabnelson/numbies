import { Settings } from '@tamagui/lucide-icons'
import {
  type BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from 'expo-camera'
import * as Clipboard from 'expo-clipboard'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar, Button, Text, XStack, YStack } from 'tamagui'
import { useAuth } from '~/src/auth/AuthContext'
import { usePrivyAuth } from '~/src/auth/privy/usePrivyAuth'
import { getUserAvatarUrl } from '../utils/avatar'
import { truncateAddress } from '../utils/formatters'
import { AppSheet } from './AppSheet'
import { QRCodeDisplay } from './QRCodeDisplay'

export type QRScannerMode = 'send' | 'receive' | 'user'

// Environment-aware URL generation for QR codes
const getBaseUrl = () => {
  if (__DEV__) {
    // In development, use window.location.origin on web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.location.origin
    }
    // For native devices, use DEV_HMR_HOST if set, otherwise fall back to production URL
    const devHost = process.env.EXPO_PUBLIC_DEV_HMR_HOST
    if (devHost) {
      return `https://${devHost}`
    }
  }
  return 'https://numbies.xyz'
}

const getUserQRUrl = (username: string) => {
  return `${getBaseUrl()}/user/${username}`
}

// Ethereum address regex: 0x followed by exactly 40 hex characters
const ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/

// Check if a string is a valid Ethereum address
const isValidEthereumAddress = (value: string): boolean => {
  return ETHEREUM_ADDRESS_REGEX.test(value)
}

// Extract Ethereum address from various wallet QR formats
// Supported formats:
// - Raw address: 0x1234...
// - EIP-681: ethereum:0x1234...
// - EIP-681 with params: ethereum:0x1234...?value=1000
// - EIP-681 with chain: ethereum:0x1234...@1
// - Coinbase format: ethereum:0x1234.../transfer?...
const extractEthereumAddress = (value: string): string | null => {
  // Check raw address first
  if (isValidEthereumAddress(value)) {
    return value.toLowerCase()
  }

  // Check for ethereum: URI scheme (EIP-681 and variations)
  const ethereumMatch = value.match(/^ethereum:(0x[a-fA-F0-9]{40})/i)
  if (ethereumMatch) {
    return ethereumMatch[1].toLowerCase()
  }

  return null
}

// Extract username from various URL formats
// Supported formats:
// - numbies://user/{username} (deep link)
// - https://numbies.xyz/user/{username} (production)
// - https://{dev-host}/user/{username} (when EXPO_PUBLIC_DEV_HMR_HOST is set)
// - http://localhost:8081/user/{username} (local dev)
// - http://localhost:{port}/user/{username} (any local port)
const extractUsernameFromUrl = (url: string): string | null => {
  // Deep link format: numbies://user/{username}
  const deepLinkMatch = url.match(/^numbies:\/\/user\/([a-zA-Z0-9_]+)$/)
  if (deepLinkMatch) {
    return deepLinkMatch[1]
  }

  // Web URL format: any URL ending in /user/{username}
  // Match both http and https, any host, and extract the username
  const webUrlMatch = url.match(/^https?:\/\/[^/]+\/user\/([a-zA-Z0-9_]+)$/)
  if (webUrlMatch) {
    return webUrlMatch[1]
  }

  return null
}

// Result type for QR code parsing
type QRParseResult =
  | { type: 'username'; username: string }
  | { type: 'address'; address: string }
  | { type: 'invalid' }

// Parse a scanned QR code value
const parseQRCode = (value: string): QRParseResult => {
  // Trim whitespace
  const trimmed = value.trim()

  // Check for username URL first
  const username = extractUsernameFromUrl(trimmed)
  if (username) {
    return { type: 'username', username }
  }

  // Check for Ethereum address (raw or in URI format)
  const address = extractEthereumAddress(trimmed)
  if (address) {
    return { type: 'address', address }
  }

  // Invalid QR code
  return { type: 'invalid' }
}

// Debounce timeout in milliseconds
const SCAN_DEBOUNCE_MS = 2000

type QRScannerDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: QRScannerMode
  onUsernameScanned?: (username: string) => void
  onAddressScanned?: (address: string) => void
  onError?: (message: string) => void
}

type TabType = 'scan' | 'view' | 'deposit'

// Size of the focus square for scanning
const FOCUS_SIZE = 250

export function QRScannerDrawer({
  open,
  onOpenChange,
  mode: _mode,
  onUsernameScanned,
  onAddressScanned,
  onError,
}: QRScannerDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('scan')
  const [copied, setCopied] = useState(false)
  const [lastScanFeedback, setLastScanFeedback] = useState<string | null>(null)
  const { dbUser } = useAuth()
  const { walletAddress } = usePrivyAuth()
  const insets = useSafeAreaInsets()

  // Debounce state for scanning - track the last scanned value to prevent duplicates
  const lastScannedRef = useRef<string | null>(null)
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions()

  // Request permission when scan tab is active and drawer opens
  useEffect(() => {
    if (open && activeTab === 'scan' && permission && !permission.granted) {
      requestPermission()
    }
  }, [open, activeTab, permission, requestPermission])

  // Reset scan state when drawer closes
  useEffect(() => {
    if (!open) {
      lastScannedRef.current = null
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
        scanTimeoutRef.current = null
      }
    }
  }, [open])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
      }
    }
  }, [])

  // Process scanned QR data (shared between native and web)
  const processScannedData = useCallback(
    (scannedValue: string) => {
      // Debounce: Skip if we just scanned this same value
      if (lastScannedRef.current === scannedValue) {
        return
      }

      // Mark as scanned and set timeout to allow re-scan
      lastScannedRef.current = scannedValue
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
      }
      scanTimeoutRef.current = setTimeout(() => {
        lastScannedRef.current = null
      }, SCAN_DEBOUNCE_MS)

      // Parse the QR code
      const parseResult = parseQRCode(scannedValue)

      switch (parseResult.type) {
        case 'username':
          setLastScanFeedback(`Found user: @${parseResult.username}`)
          onUsernameScanned?.(parseResult.username)
          break
        case 'address':
          setLastScanFeedback(
            `Found address: ${parseResult.address.slice(0, 10)}...`,
          )
          onAddressScanned?.(parseResult.address)
          break
        case 'invalid': {
          // Show what was scanned for debugging
          const preview =
            scannedValue.length > 30
              ? `${scannedValue.slice(0, 30)}...`
              : scannedValue
          setLastScanFeedback(`Unknown format: ${preview}`)
          onError?.('Invalid QR code')
          break
        }
      }

      // Clear feedback after 3 seconds
      setTimeout(() => setLastScanFeedback(null), 3000)
    },
    [onUsernameScanned, onAddressScanned, onError],
  )

  // Handle barcode scan from expo-camera (native)
  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      processScannedData(result.data)
    },
    [processScannedData],
  )

  // Open device settings
  const openSettings = useCallback(() => {
    Linking.openSettings()
  }, [])

  // Copy wallet address to clipboard
  const copyAddress = useCallback(async () => {
    if (!walletAddress) return
    await Clipboard.setStringAsync(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [walletAddress])

  // Copy username to clipboard
  const copyUsername = useCallback(async () => {
    if (!dbUser?.username) return
    await Clipboard.setStringAsync(`@${dbUser.username}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [dbUser?.username])

  // Get avatar URL
  const avatarUrl = getUserAvatarUrl(
    dbUser?._id || 'numbies',
    dbUser?.avatarUrl,
  )

  // Get tint color based on active tab
  const getTintColor = () => {
    switch (activeTab) {
      case 'view':
        return '$brandGreen'
      case 'deposit':
        return '$brandBlue'
      default:
        return undefined
    }
  }

  // Get tab color
  const getTabColor = (tabId: TabType, isActive: boolean) => {
    if (!isActive) return '$color10'
    switch (tabId) {
      case 'view':
        return '$brandGreen'
      case 'deposit':
        return '$brandBlue'
      default:
        return '$color12'
    }
  }

  // Render scan tab content with camera
  const renderScanTab = () => {
    // Permission loading state
    if (!permission) {
      return (
        <YStack flex={1} items="center" justify="center" gap="$4">
          <Text fontSize="$4" opacity={0.5}>
            Checking camera permissions...
          </Text>
        </YStack>
      )
    }

    // Permission denied state
    if (!permission.granted) {
      const wasDenied = permission.canAskAgain === false

      return (
        <YStack flex={1} items="center" justify="center" gap="$4" p="$4">
          <YStack
            width={FOCUS_SIZE}
            height={FOCUS_SIZE}
            borderWidth={2}
            borderColor="$color6"
            style={{ borderRadius: 16 }}
            items="center"
            justify="center"
            gap="$3"
          >
            <Text fontSize="$5" opacity={0.7} style={{ textAlign: 'center' }}>
              Camera access needed
            </Text>
            <Text
              fontSize="$3"
              opacity={0.5}
              style={{ textAlign: 'center' }}
              px="$3"
            >
              {wasDenied
                ? 'Camera access was denied. Enable it in settings to scan QR codes.'
                : 'Allow camera access to scan QR codes for quick payments.'}
            </Text>
          </YStack>

          {wasDenied ? (
            <Button
              size="$4"
              bg="$color5"
              color="$color12"
              pressStyle={{ opacity: 0.7 }}
              onPress={openSettings}
              icon={<Settings size={18} />}
            >
              Open Settings
            </Button>
          ) : (
            <Button
              size="$4"
              bg="$brandBlue"
              color="white"
              pressStyle={{ opacity: 0.7 }}
              onPress={requestPermission}
            >
              Allow Camera
            </Button>
          )}
        </YStack>
      )
    }

    // Camera view with focus overlay
    return (
      <YStack flex={1} items="center" justify="center" gap="$3">
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={handleBarcodeScanned}
          />

          {/* Overlay with focus square cutout */}
          <View style={styles.overlay}>
            {/* Top dark area */}
            <View style={styles.overlayTop} />

            {/* Middle row: left dark, focus square, right dark */}
            <View style={styles.overlayMiddle}>
              <View style={styles.overlaySide} />
              <View style={styles.focusSquare}>
                {/* Corner brackets */}
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
              </View>
              <View style={styles.overlaySide} />
            </View>

            {/* Bottom dark area */}
            <View style={styles.overlayBottom} />
          </View>
        </View>

        {/* Scan feedback */}
        <YStack height={24} justify="center">
          {lastScanFeedback && (
            <Text
              fontSize="$3"
              color="$color11"
              style={{ textAlign: 'center' }}
            >
              {lastScanFeedback}
            </Text>
          )}
        </YStack>
      </YStack>
    )
  }

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'scan':
        return renderScanTab()

      case 'view':
        return (
          <YStack flex={1}>
            <YStack flex={1} items="center" justify="center" gap="$4">
              {/* QR Code - tappable to copy */}
              <Pressable onPress={copyUsername}>
                <YStack
                  bg="white"
                  p="$4"
                  style={{ borderRadius: 16 }}
                  items="center"
                  justify="center"
                >
                  {dbUser?.username ? (
                    <QRCodeDisplay
                      value={getUserQRUrl(dbUser.username)}
                      size={180}
                      backgroundColor="white"
                      color="black"
                    />
                  ) : (
                    <YStack
                      width={180}
                      height={180}
                      items="center"
                      justify="center"
                    >
                      <Text fontSize="$4" opacity={0.5} color="black">
                        No username set
                      </Text>
                    </YStack>
                  )}
                </YStack>
              </Pressable>

              {/* User info */}
              <YStack height={60} justify="center">
                <Pressable onPress={copyUsername}>
                  <XStack items="center" gap="$3">
                    <Avatar circular size="$5">
                      <Avatar.Image src={avatarUrl} />
                      <Avatar.Fallback bg="$color5" />
                    </Avatar>
                    <Text fontSize="$6" fontWeight="700" color="$brandGreen">
                      @{dbUser?.username || 'username'}
                    </Text>
                  </XStack>
                </Pressable>
              </YStack>
            </YStack>

            {/* Copy button - full width at bottom */}
            <XStack
              bg="rgba(7, 104, 66, 0.15)"
              height={80 + insets.bottom}
              mx={-16}
              mb={-16 - insets.bottom}
              pb={insets.bottom}
              justify="center"
              items="center"
              cursor="pointer"
              pressStyle={{ opacity: 0.7 }}
              onPress={copyUsername}
            >
              <Text
                fontSize="$5"
                fontWeight="800"
                color="$brandGreen"
                textTransform="uppercase"
                letterSpacing={2}
              >
                {copied ? 'Copied!' : 'Copy your username'}
              </Text>
            </XStack>
          </YStack>
        )

      case 'deposit':
        return (
          <YStack flex={1}>
            <YStack flex={1} items="center" justify="center" gap="$4">
              {/* QR Code - tappable to copy */}
              <Pressable onPress={copyAddress}>
                <YStack
                  bg="white"
                  p="$4"
                  style={{ borderRadius: 16 }}
                  items="center"
                  justify="center"
                >
                  {walletAddress ? (
                    <QRCodeDisplay
                      value={walletAddress}
                      size={180}
                      backgroundColor="white"
                      color="black"
                    />
                  ) : (
                    <YStack
                      width={180}
                      height={180}
                      items="center"
                      justify="center"
                    >
                      <Text fontSize="$4" opacity={0.5} color="black">
                        No wallet connected
                      </Text>
                    </YStack>
                  )}
                </YStack>
              </Pressable>

              {/* Truncated address */}
              <YStack height={60} justify="center">
                <Pressable onPress={copyAddress}>
                  <Text fontSize="$6" fontWeight="700" color="$brandBlue">
                    {walletAddress
                      ? truncateAddress(walletAddress)
                      : 'No address'}
                  </Text>
                </Pressable>
              </YStack>
            </YStack>

            {/* Copy button - full width at bottom */}
            <XStack
              bg="rgba(24, 143, 237, 0.15)"
              height={80 + insets.bottom}
              mx={-16}
              mb={-16 - insets.bottom}
              pb={insets.bottom}
              justify="center"
              items="center"
              cursor="pointer"
              pressStyle={{ opacity: 0.7 }}
              onPress={copyAddress}
            >
              <Text
                fontSize="$5"
                fontWeight="800"
                color="$brandBlue"
                textTransform="uppercase"
                letterSpacing={2}
              >
                {copied ? 'Copied!' : 'Copy your deposit address'}
              </Text>
            </XStack>
          </YStack>
        )
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      snapPoint={85}
      tintColor={getTintColor()}
      tintOpacity={0.15}
    >
      <View style={{ flex: 1 }}>
        <YStack flex={1} p={16}>
          {/* Tab Navigation */}
          <XStack mb="$4" items="center">
            <YStack
              width={80}
              items="center"
              onPress={() => setActiveTab('scan')}
              cursor="pointer"
              pressStyle={{ opacity: 0.7 }}
              opacity={activeTab === 'scan' ? 1 : 0.5}
            >
              <Text
                fontSize="$4"
                fontWeight={activeTab === 'scan' ? '700' : '500'}
                color={getTabColor('scan', activeTab === 'scan')}
                textTransform="uppercase"
                letterSpacing={1}
              >
                Scan
              </Text>
            </YStack>
            <YStack
              flex={1}
              items="center"
              onPress={() => setActiveTab('view')}
              cursor="pointer"
              pressStyle={{ opacity: 0.7 }}
              opacity={activeTab === 'view' ? 1 : 0.5}
            >
              <Text
                fontSize="$4"
                fontWeight={activeTab === 'view' ? '700' : '500'}
                color={getTabColor('view', activeTab === 'view')}
                textTransform="uppercase"
                letterSpacing={1}
              >
                View
              </Text>
            </YStack>
            <YStack
              width={80}
              items="center"
              onPress={() => setActiveTab('deposit')}
              cursor="pointer"
              pressStyle={{ opacity: 0.7 }}
              opacity={activeTab === 'deposit' ? 1 : 0.5}
            >
              <Text
                fontSize="$4"
                fontWeight={activeTab === 'deposit' ? '700' : '500'}
                color={getTabColor('deposit', activeTab === 'deposit')}
                textTransform="uppercase"
                letterSpacing={1}
              >
                Deposit
              </Text>
            </YStack>
          </XStack>

          {/* Tab Content */}
          <YStack flex={1}>{renderTabContent()}</YStack>
        </YStack>
      </View>
    </AppSheet>
  )
}

// Styles for camera overlay
const OVERLAY_COLOR = 'rgba(0, 0, 0, 0.6)'
const CORNER_SIZE = 24
const CORNER_THICKNESS = 3
const CORNER_COLOR = 'white'

const styles = StyleSheet.create({
  cameraContainer: {
    width: FOCUS_SIZE + 40,
    height: FOCUS_SIZE + 40,
    borderRadius: 16,
    overflow: 'hidden',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: FOCUS_SIZE,
  },
  overlaySide: {
    width: 20,
    backgroundColor: OVERLAY_COLOR,
  },
  focusSquare: {
    width: FOCUS_SIZE,
    height: FOCUS_SIZE,
    position: 'relative',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
    borderBottomRightRadius: 8,
  },
})
