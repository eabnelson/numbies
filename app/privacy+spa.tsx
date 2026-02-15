import { Link } from 'one'
import { ScrollView, Text, XStack, YStack } from 'tamagui'

export default function PrivacyPolicy() {
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
          Privacy Policy
        </Text>

        <Text color="$color11" fontSize={14}>
          Last updated: February 1, 2025
        </Text>

        <Section title="Introduction">
          Numbies ("we," "our," or "us") is committed to protecting your
          privacy. This Privacy Policy explains how we collect, use, disclose,
          and safeguard your information when you use our mobile application and
          related services (collectively, the "Service").
        </Section>

        <Section title="Information We Collect">
          We collect information you provide directly to us, including:{'\n\n'}•
          Phone number (for authentication via SMS){'\n'}• Username and display
          name{'\n'}• Profile information you choose to provide{'\n'}•
          Transaction history and payment information{'\n'}• Communications with
          other users through the Service
        </Section>

        <Section title="How We Use Your Information">
          We use the information we collect to:{'\n\n'}• Provide, maintain, and
          improve our Service{'\n'}• Process transactions and send related
          information{'\n'}• Send you technical notices and support messages
          {'\n'}• Respond to your comments and questions{'\n'}• Detect,
          investigate, and prevent fraudulent transactions and abuse{'\n'}•
          Comply with legal obligations
        </Section>

        <Section title="Information Sharing">
          We may share your information in the following circumstances:{'\n\n'}•
          With other users as necessary to facilitate transactions{'\n'}• With
          service providers who assist in operating our Service{'\n'}• To comply
          with legal obligations or protect our rights{'\n'}• In connection with
          a merger, acquisition, or sale of assets{'\n'}• With your consent or
          at your direction
        </Section>

        <Section title="Data Security">
          We implement appropriate technical and organizational measures to
          protect your personal information. However, no method of transmission
          over the Internet or electronic storage is completely secure, and we
          cannot guarantee absolute security.
        </Section>

        <Section title="Your Rights">
          Depending on your location, you may have certain rights regarding your
          personal information, including the right to access, correct, or
          delete your data. To exercise these rights, please contact us using
          the information below.
        </Section>

        <Section title="Third-Party Services">
          Our Service integrates with third-party services including Privy
          (authentication), Convex (data storage), and Tempo (payments). These
          services have their own privacy policies, and we encourage you to
          review them.
        </Section>

        <Section title="Children's Privacy">
          Our Service is not intended for children under 18 years of age. We do
          not knowingly collect personal information from children under 18.
        </Section>

        <Section title="Changes to This Policy">
          We may update this Privacy Policy from time to time. We will notify
          you of any changes by posting the new Privacy Policy on this page and
          updating the "Last updated" date.
        </Section>

        <Section title="Contact Us">
          If you have questions about this Privacy Policy, please contact us at:
          {'\n\n'}
          Email: support@numbies.xyz
        </Section>
      </YStack>
    </ScrollView>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <YStack gap="$2" pt="$2">
      <Text fontSize={20} fontWeight="600" color="$color12">
        {title}
      </Text>
      <Text fontSize={15} color="$color11" lineHeight={24}>
        {children}
      </Text>
    </YStack>
  )
}
