import { defaultConfig } from '@tamagui/config/v4'
import { createTamagui, createTokens } from 'tamagui'

const tokens = createTokens({
  ...defaultConfig.tokens,
  color: {
    brandGreen: '#076842',
    brandRed: '#DD2616',
    brandBlue: '#188FED',
  },
})

export const config = createTamagui({
  ...defaultConfig,
  tokens,
})

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}

  // for group types:
  // interface TypeOverride {
  //   groupNames(): 'message'
  // }
}

export default config
