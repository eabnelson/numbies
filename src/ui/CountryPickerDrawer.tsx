import { useCallback } from 'react'
import { Pressable, ScrollView } from 'react-native'
import { Text, XStack, YStack } from 'tamagui'
import { type Country, countries } from '../data/countries'
import { AppSheet } from './AppSheet'

type CountryPickerDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCountry: Country
  onSelectCountry: (country: Country) => void
}

export function CountryPickerDrawer({
  open,
  onOpenChange,
  selectedCountry,
  onSelectCountry,
}: CountryPickerDrawerProps) {
  const handleSelect = useCallback(
    (country: Country) => {
      onSelectCountry(country)
      onOpenChange(false)
    },
    [onSelectCountry, onOpenChange],
  )

  return (
    <AppSheet open={open} onOpenChange={onOpenChange} snapPoint={70}>
      <YStack flex={1} pt="$4">
        <YStack items="center" pb="$4">
          <Text fontSize="$6" fontWeight="600" color="$color12">
            Select Country
          </Text>
        </YStack>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <YStack pb="$4">
            {countries.map((country) => {
              const isSelected = country.iso === selectedCountry.iso
              return (
                <Pressable
                  key={country.iso}
                  onPress={() => handleSelect(country)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <XStack
                    px="$4"
                    py="$3"
                    items="center"
                    gap="$3"
                    bg={isSelected ? '$color5' : 'transparent'}
                  >
                    <Text fontSize="$7">{country.flag}</Text>
                    <Text
                      flex={1}
                      fontSize="$5"
                      fontWeight={isSelected ? '600' : '400'}
                      color="$color12"
                    >
                      {country.name}
                    </Text>
                    <Text fontSize="$5" color="$color10" fontWeight="500">
                      {country.code}
                    </Text>
                  </XStack>
                </Pressable>
              )
            })}
          </YStack>
        </ScrollView>
      </YStack>
    </AppSheet>
  )
}
