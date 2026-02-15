import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Keyboard,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, YStack } from 'tamagui'
import { useLoginWithSMS } from '../auth/privy/useLoginWithSMS'
import { type Country, defaultCountry } from '../data/countries'
import { isValidPhoneNumber, toE164 } from '../utils/phoneFormat'
import { CodeInput } from './CodeInput'
import { CountryPickerDrawer } from './CountryPickerDrawer'
import { LoadingScreen } from './LoadingScreen'
import { PhoneInput } from './PhoneInput'

type LoginPhase =
  | 'phone-entry'
  | 'phone-valid'
  | 'sending-code'
  | 'code-entry'
  | 'code-entered'
  | 'submitting-code'
  | 'wrong-code'

const CODE_LENGTH = 6

export function LoginFlow() {
  const theme = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const { width: screenWidth } = useWindowDimensions()
  const { sendCode, loginWithCode, state: otpState } = useLoginWithSMS()

  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState<Country>(defaultCountry)
  const [code, setCode] = useState('')
  const [countryPickerOpen, setCountryPickerOpen] = useState(false)
  const [phase, setPhase] = useState<LoginPhase>('phone-entry')
  const autoSendTriggeredRef = useRef(false)
  const autoVerifyTriggeredRef = useRef(false)

  const isWeb = Platform.OS === 'web'

  // All platforms get same base height, native adds safe areas
  // Must match index.tsx button heights exactly
  const topTotalHeight = isWeb ? 100 : top + 100
  const bottomTotalHeight = isWeb ? 100 : bottom + 100
  const isPhoneValid = isValidPhoneNumber(phone, country)
  const isCodeComplete = code.length === CODE_LENGTH

  // Calculate button font size to fit text on one line
  const containerWidth = Math.min(screenWidth, 480)
  const buttonPadding = 32
  const availableButtonWidth = containerWidth - buttonPadding
  const calcButtonFontSize = (text: string, letterSpacing: number) => {
    const charCount = text.length
    // Account for letter spacing in total width
    const totalLetterSpacing = letterSpacing * (charCount - 1)
    const charWidthRatio = 0.65
    const maxFontSize =
      (availableButtonWidth - totalLetterSpacing) / (charCount * charWidthRatio)
    return Math.min(40, Math.max(24, maxFontSize))
  }

  // Sync phase with OTP state from Privy
  useEffect(() => {
    switch (otpState.status) {
      case 'sending-code':
        setPhase('sending-code')
        break
      case 'awaiting-code-input':
        setPhase('code-entry')
        break
      case 'submitting-code':
        setPhase('submitting-code')
        break
      case 'error': {
        setPhase('wrong-code')
        // Reset to code-entry after 1 second
        const timer = setTimeout(() => {
          setPhase('code-entry')
          setCode('')
        }, 1000)
        return () => clearTimeout(timer)
      }
      case 'done':
        // Login successful - parent component handles this
        break
    }
  }, [otpState])

  // Update phase based on local state when in phone/code entry
  // This handles the transition from phone-entry to phone-valid and code-entry to code-entered
  useEffect(() => {
    // Only handle phone validity when in initial state (before code is sent)
    if (otpState.status === 'initial') {
      setPhase(isPhoneValid ? 'phone-valid' : 'phone-entry')
    } else if (otpState.status === 'awaiting-code-input') {
      // Handle code completeness when waiting for code input
      setPhase(isCodeComplete ? 'code-entered' : 'code-entry')
    }
    // Note: don't handle 'error', 'done', 'sending-code', 'submitting-code' here
    // Those are handled by the first useEffect
  }, [isPhoneValid, isCodeComplete, otpState.status])

  // Auto-send code when phone number is complete
  useEffect(() => {
    if (
      isPhoneValid &&
      otpState.status === 'initial' &&
      !autoSendTriggeredRef.current
    ) {
      autoSendTriggeredRef.current = true
      const e164 = toE164(phone, country)
      sendCode(e164)
    }
  }, [isPhoneValid, otpState.status, phone, country, sendCode])

  // Reset auto-send flag when phone becomes invalid
  useEffect(() => {
    if (!isPhoneValid) {
      autoSendTriggeredRef.current = false
    }
  }, [isPhoneValid])

  // Auto-verify when code is complete
  useEffect(() => {
    if (
      isCodeComplete &&
      otpState.status === 'awaiting-code-input' &&
      !autoVerifyTriggeredRef.current
    ) {
      autoVerifyTriggeredRef.current = true
      loginWithCode(code)
    }
  }, [isCodeComplete, otpState.status, code, loginWithCode])

  // Reset auto-verify flag when code is cleared or changes to incomplete
  useEffect(() => {
    if (!isCodeComplete) {
      autoVerifyTriggeredRef.current = false
    }
  }, [isCodeComplete])

  const handleSendCode = useCallback(async () => {
    const e164 = toE164(phone, country)
    await sendCode(e164)
  }, [phone, country, sendCode])

  const handleVerifyCode = useCallback(async () => {
    await loginWithCode(code)
  }, [code, loginWithCode])

  const handleChangeNumber = useCallback(() => {
    setCode('')
    setPhone('')
    setPhase('phone-entry')
    autoSendTriggeredRef.current = false
  }, [])

  const handleResendCode = useCallback(async () => {
    setCode('')
    await handleSendCode()
  }, [handleSendCode])

  // Determine what's shown in phone vs code phase
  const isPhonePhase = ['phone-entry', 'phone-valid', 'sending-code'].includes(
    phase,
  )
  const isCodePhase = [
    'code-entry',
    'code-entered',
    'submitting-code',
    'wrong-code',
  ].includes(phase)

  // Button states - colors always match REQUEST (green) and SEND (blue)
  const getTopButton = () => {
    switch (phase) {
      case 'phone-entry':
        return { text: 'ENTER', disabled: true, onPress: undefined }
      case 'phone-valid':
        return { text: 'SEND CODE', disabled: false, onPress: handleSendCode }
      case 'sending-code':
        return { spinner: true }
      case 'code-entry':
      case 'code-entered':
        return { text: 'RESEND', disabled: false, onPress: handleResendCode }
      case 'submitting-code':
        return { spinner: true }
      case 'wrong-code':
        return { text: 'WRONG CODE', disabled: true, onPress: undefined }
    }
  }

  const getBottomButton = () => {
    switch (phase) {
      case 'phone-entry':
        return { text: 'NUMBER', disabled: true, onPress: undefined }
      case 'phone-valid':
        return { text: 'SEND CODE', disabled: false, onPress: handleSendCode }
      case 'sending-code':
        return { spinner: true }
      case 'code-entry':
        return { text: 'CHANGE', disabled: false, onPress: handleChangeNumber }
      case 'code-entered':
        return { text: 'VERIFY', disabled: false, onPress: handleVerifyCode }
      case 'submitting-code':
        return { spinner: true }
      case 'wrong-code':
        return { text: 'WRONG CODE', disabled: true, onPress: undefined }
    }
  }

  const topBtn = getTopButton()
  const bottomBtn = getBottomButton()

  // Show loading screen during spinner phases
  if (phase === 'sending-code' || phase === 'submitting-code') {
    return <LoadingScreen />
  }

  return (
    <YStack flex={1} width="100%" $platform-web={{ overflow: 'hidden' }}>
      {/* Top Button - always green like REQUEST */}
      <Pressable
        onPress={() =>
          !topBtn.disabled && !topBtn.spinner && topBtn.onPress?.()
        }
        style={
          {
            position: isWeb ? 'fixed' : 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1,
            height: topTotalHeight,
            backgroundColor: 'rgba(7, 104, 66, 0.3)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: isWeb ? 0 : top,
            paddingHorizontal: 16,
          } as object
        }
      >
        {!topBtn.spinner && topBtn.text && (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              fontSize: calcButtonFontSize(topBtn.text, 12),
              fontWeight: '900',
              letterSpacing: 12,
              paddingLeft: 12,
              textAlign: 'center',
              color: theme.brandGreen.val,
              opacity: topBtn.disabled ? 0.5 : 1,
            }}
          >
            {topBtn.text}
          </Text>
        )}
      </Pressable>

      {/* Center: Phone or Code Input - slightly above center */}
      <Pressable onPress={() => Keyboard.dismiss()} style={{ flex: 1 }}>
        <YStack flex={1} justify="center" items="center" px="$4" pb="$12">
          {isPhonePhase && (
            <PhoneInput
              value={phone}
              country={country}
              onChange={setPhone}
              onCountryPress={() => setCountryPickerOpen(true)}
            />
          )}
          {isCodePhase && <CodeInput value={code} onChange={setCode} />}
        </YStack>
      </Pressable>

      {/* Bottom Button - always blue like SEND */}
      <Pressable
        onPress={() =>
          !bottomBtn.disabled && !bottomBtn.spinner && bottomBtn.onPress?.()
        }
        style={
          {
            position: isWeb ? 'fixed' : 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1,
            height: bottomTotalHeight,
            backgroundColor: 'rgba(24, 143, 237, 0.3)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingBottom: isWeb ? 0 : bottom,
            paddingHorizontal: 16,
          } as object
        }
      >
        {!bottomBtn.spinner && bottomBtn.text && (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              fontSize: calcButtonFontSize(bottomBtn.text, 12),
              fontWeight: '900',
              letterSpacing: 12,
              paddingLeft: 12,
              textAlign: 'center',
              color: theme.brandBlue.val,
              opacity: bottomBtn.disabled ? 0.5 : 1,
            }}
          >
            {bottomBtn.text}
          </Text>
        )}
      </Pressable>

      {/* Country Picker */}
      <CountryPickerDrawer
        open={countryPickerOpen}
        onOpenChange={setCountryPickerOpen}
        selectedCountry={country}
        onSelectCountry={setCountry}
      />
    </YStack>
  )
}
