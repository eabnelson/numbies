import { Link } from 'one'
import { Linking, Platform } from 'react-native'
import { ScrollView, Text, XStack, YStack } from 'tamagui'

export default function Support() {
  const handleEmailPress = () => {
    if (Platform.OS === 'web') {
      window.open('mailto:support@numbies.xyz', '_blank')
    } else {
      Linking.openURL('mailto:support@numbies.xyz')
    }
  }

  return (
    <ScrollView flex={1} bg="$background">
      <YStack p="$4" pb="$8" gap="$4" maxW={720} mx="auto">
        <XStack>
          <Link href="/">
            <Text color="$brandGreen" fontSize={14} fontWeight="600">
              &larr; Back to Numbies
            </Text>
          </Link>
        </XStack>

        <Text fontSize={32} fontWeight="700" color="$color12">
          Support
        </Text>

        <Text fontSize={16} color="$color11" lineHeight={26}>
          Need help with Numbies? We're here to assist you.
        </Text>

        <YStack gap="$4" pt="$4">
          <SupportCard
            title="Contact Us"
            description="For general inquiries, account issues, or technical support, reach out to our team."
          >
            <Text
              color="$brandGreen"
              fontSize={16}
              fontWeight="600"
              onPress={handleEmailPress}
              cursor="pointer"
            >
              support@numbies.xyz
            </Text>
          </SupportCard>

          <SupportCard
            title="Report an Issue"
            description="Found a bug or experiencing problems? Let us know and we'll investigate."
          >
            <Text
              color="$brandGreen"
              fontSize={16}
              fontWeight="600"
              onPress={handleEmailPress}
              cursor="pointer"
            >
              Report via Email
            </Text>
          </SupportCard>

          <SupportCard
            title="Account Recovery"
            description="Lost access to your account? Contact us with your phone number and we'll help you regain access."
          >
            <Text
              color="$brandGreen"
              fontSize={16}
              fontWeight="600"
              onPress={handleEmailPress}
              cursor="pointer"
            >
              Get Help
            </Text>
          </SupportCard>

          <SupportCard
            title="Transaction Disputes"
            description="If you have concerns about a transaction, please contact us with the transaction details within 30 days."
          >
            <Text
              color="$brandGreen"
              fontSize={16}
              fontWeight="600"
              onPress={handleEmailPress}
              cursor="pointer"
            >
              Dispute a Transaction
            </Text>
          </SupportCard>
        </YStack>

        <YStack gap="$3" pt="$6" borderTopWidth={1} borderColor="$color4">
          <Text fontSize={18} fontWeight="600" color="$color12">
            Frequently Asked Questions
          </Text>

          <FAQ
            question="How do I send money?"
            answer="Tap the SEND button at the bottom of the home screen, enter the recipient's username, specify the amount, and confirm the transaction."
          />

          <FAQ
            question="How do I request money?"
            answer="Tap the REQUEST button at the top of the home screen, enter the payer's username, specify the amount, and send the request."
          />

          <FAQ
            question="Are transactions reversible?"
            answer="No, all transactions are final. Please verify the recipient and amount before confirming any transaction."
          />

          <FAQ
            question="How do I change my username?"
            answer="Tap on your profile icon, then tap your username to edit it. Usernames must be unique and can only contain letters, numbers, and underscores."
          />

          <FAQ
            question="Is my money safe?"
            answer="Numbies uses industry-standard security measures and blockchain technology to secure your funds. We never store your private keys."
          />
        </YStack>

        <YStack gap="$2" pt="$6">
          <Text fontSize={14} color="$color10">
            Response times may vary. We typically respond within 24-48 hours
            during business days.
          </Text>
        </YStack>
      </YStack>
    </ScrollView>
  )
}

function SupportCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <YStack gap="$2" p="$4" bg="$color2" style={{ borderRadius: 12 }}>
      <Text fontSize={18} fontWeight="600" color="$color12">
        {title}
      </Text>
      <Text fontSize={14} color="$color11" lineHeight={22}>
        {description}
      </Text>
      {children}
    </YStack>
  )
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <YStack gap="$1" pt="$2">
      <Text fontSize={15} fontWeight="600" color="$color12">
        {question}
      </Text>
      <Text fontSize={14} color="$color11" lineHeight={22}>
        {answer}
      </Text>
    </YStack>
  )
}
