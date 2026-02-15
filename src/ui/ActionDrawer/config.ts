import type { ColorTokens, YStackProps } from 'tamagui'
import type { ActionMode } from './types'

/**
 * Mode-specific configuration for ActionDrawer
 *
 * | Aspect               | Send Mode    | Request Mode |
 * |----------------------|--------------|--------------|
 * | AppSheet position    | bottom       | top          |
 * | labelColor           | $brandBlue   | $brandGreen  |
 * | accentColor          | #188FED      | #076842      |
 * | ConfirmationDisplay  | "Sent"       | "Requested"  |
 * | NoteInput rightText  | balance      | (none)       |
 * | ActionButton mode    | "send"       | "request"    |
 * | QRScannerDrawer mode | "send"       | "receive"    |
 * | Has balance check    | Yes          | No           |
 */
export type ModeConfig = {
  /** AppSheet position - 'bottom' for send, 'top' for request */
  position: 'top' | 'bottom'
  /** Tamagui color token for labels */
  labelColor: ColorTokens
  /** Hex color for keypad accent (backspace button) */
  accentColor: string
  /** Tint color for AppSheet overlay */
  tintColor: YStackProps['bg']
  /** Label shown in ConfirmationDisplay on success */
  successLabel: string
  /** Mode for QRScannerDrawer */
  qrScannerMode: 'send' | 'receive'
  /** Whether to show balance in NoteInput */
  showBalance: boolean
  /** Whether to check for insufficient balance */
  checkBalance: boolean
  /** Whether to disable safe area (send mode needs manual padding) */
  disableSafeArea: boolean
}

/**
 * Configuration map for each mode
 */
export const MODE_CONFIG: Record<ActionMode, ModeConfig> = {
  send: {
    position: 'bottom',
    labelColor: '$brandBlue',
    accentColor: '#188FED',
    tintColor: '$brandBlue',
    successLabel: 'Sent',
    qrScannerMode: 'send',
    showBalance: true,
    checkBalance: true,
    disableSafeArea: true,
  },
  request: {
    position: 'top',
    labelColor: '$brandGreen',
    accentColor: '#076842',
    tintColor: '$brandGreen',
    successLabel: 'Requested',
    qrScannerMode: 'receive',
    showBalance: false,
    checkBalance: false,
    disableSafeArea: false,
  },
}

/**
 * Get configuration for a specific mode
 */
export function getModeConfig(mode: ActionMode): ModeConfig {
  return MODE_CONFIG[mode]
}
