import { Link } from 'one'
import { ScrollView, Text, XStack, YStack } from 'tamagui'

export default function TermsOfService() {
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
          Terms of Service
        </Text>

        <Text color="$color11" fontSize={14}>
          Last updated: February 1, 2025
        </Text>

        <Section title="Acceptance of Terms">
          By accessing or using Numbies ("Service"), you agree to be bound by
          these Terms of Service ("Terms"). If you do not agree to these Terms,
          do not use the Service.
        </Section>

        <Section title="Description of Service">
          Numbies is a peer-to-peer payments application that enables users to
          send and receive digital payments. The Service is powered by Tempo and
          operates on blockchain technology.
        </Section>

        <Section title="Eligibility">
          You must be at least 18 years old and capable of forming a binding
          contract to use the Service. By using the Service, you represent and
          warrant that you meet these requirements.
        </Section>

        <Section title="Account Registration">
          To use certain features of the Service, you must register for an
          account using your phone number. You are responsible for:{'\n\n'}•
          Maintaining the confidentiality of your account{'\n'}• All activities
          that occur under your account{'\n'}• Notifying us immediately of any
          unauthorized use
        </Section>

        <Section title="User Conduct">
          You agree not to:{'\n\n'}• Use the Service for any illegal purpose
          {'\n'}• Violate any applicable laws or regulations{'\n'}• Engage in
          fraudulent or deceptive practices{'\n'}• Interfere with or disrupt the
          Service{'\n'}• Attempt to gain unauthorized access to the Service
          {'\n'}• Use the Service to launder money or finance illegal activities
        </Section>

        <Section title="Transactions">
          All transactions made through the Service are final. You are solely
          responsible for ensuring the accuracy of transaction details before
          confirming. We are not responsible for transactions sent to incorrect
          recipients due to user error.
        </Section>

        <Section title="Fees">
          We may charge fees for certain transactions or services. Any
          applicable fees will be disclosed before you complete a transaction.
          We reserve the right to change our fee structure at any time with
          notice.
        </Section>

        <Section title="Intellectual Property">
          The Service and its original content, features, and functionality are
          owned by Numbies and are protected by international copyright,
          trademark, and other intellectual property laws.
        </Section>

        <Section title="Disclaimer of Warranties">
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES
          OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE
          SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
        </Section>

        <Section title="Limitation of Liability">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, NUMBIES SHALL NOT BE LIABLE
          FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
          DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY
          OR INDIRECTLY.
        </Section>

        <Section title="Indemnification">
          You agree to indemnify and hold harmless Numbies and its officers,
          directors, employees, and agents from any claims, damages, losses, or
          expenses arising from your use of the Service or violation of these
          Terms.
        </Section>

        <Section title="Governing Law">
          These Terms shall be governed by and construed in accordance with the
          laws of the United States, without regard to its conflict of law
          provisions.
        </Section>

        <Section title="Changes to Terms">
          We reserve the right to modify these Terms at any time. We will notify
          users of any material changes by posting the new Terms on this page.
          Your continued use of the Service after changes constitutes acceptance
          of the modified Terms.
        </Section>

        <Section title="Termination">
          We may terminate or suspend your account and access to the Service
          immediately, without prior notice, for conduct that we believe
          violates these Terms or is harmful to other users, us, or third
          parties.
        </Section>

        <Section title="Contact Us">
          If you have questions about these Terms, please contact us at:{'\n\n'}
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
