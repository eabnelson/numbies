import type { ConfigContext, ExpoConfig } from 'expo/config'

export default ({ config: _config }: ConfigContext): ExpoConfig => {
  const devHmrHost = process.env.EXPO_PUBLIC_DEV_HMR_HOST
  const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID

  // Build associated domains list
  const associatedDomains = ['applinks:numbies.xyz']
  if (devHmrHost) {
    associatedDomains.push(`applinks:${devHmrHost}`)
  }

  // Build Android intent filters
  const intentFilters = [
    {
      action: 'VIEW',
      autoVerify: true,
      data: [
        { scheme: 'https', host: 'numbies.xyz', pathPrefix: '/user' },
        ...(devHmrHost
          ? [{ scheme: 'https', host: devHmrHost, pathPrefix: '/user' }]
          : []),
      ],
      category: ['BROWSABLE', 'DEFAULT'],
    },
  ]

  return {
    name: 'Numbies',
    slug: 'numbies',
    scheme: 'numbies',
    newArchEnabled: true,
    platforms: ['ios', 'android'],
    plugins: [
      'vxrn/expo-plugin',
      [
        'expo-build-properties',
        {
          ios: {
            ccacheEnabled: true,
          },
        },
      ],
      'expo-secure-store',
      'expo-web-browser',
      [
        'expo-camera',
        {
          cameraPermission:
            'Numbies uses your camera to scan QR codes for quick payments',
        },
      ],
    ],
    icon: './public/app-icon.png',
    splash: {
      image: './public/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#FFFFFF',
    },
    ios: {
      bundleIdentifier: 'com.numbies.xyz',
      associatedDomains,
      infoPlist: {
        NSCameraUsageDescription:
          'Numbies uses your camera to scan QR codes for quick payments',
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.numbies.xyz',
      intentFilters,
    },
    ...(easProjectId && {
      updates: {
        url: `https://u.expo.dev/${easProjectId}`,
      },
    }),
    runtimeVersion: {
      policy: 'appVersion',
    },
    extra: {
      eas: {
        projectId: easProjectId,
      },
    },
  }
}
