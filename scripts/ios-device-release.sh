#!/bin/bash
set -e

cd "$(dirname "$0")/.."

# Load environment variables
if [ -f ".env.local" ]; then
  export $(grep -E "^IOS_DEVICE" .env.local | xargs)
fi

BUNDLE_ID="com.numbies.xyz"

# Check for device IDs in environment
if [ -z "$IOS_DEVICE_UDID" ] || [ -z "$IOS_DEVICE_XCODE_ID" ]; then
  echo -e "\033[0;31mMissing device configuration.\033[0m"
  echo ""
  echo "Add these to your .env.local file:"
  echo ""
  echo "  IOS_DEVICE_UDID=<your-device-udid>"
  echo "  IOS_DEVICE_XCODE_ID=<your-xcode-device-id>"
  echo ""
  echo "To find your device IDs, run:"
  echo "  xcrun devicectl list devices    # for UDID"
  echo "  xcodebuild -showdestinations -scheme numbiesxyz -workspace ios/numbiesxyz.xcworkspace | grep 'platform:iOS, '"
  echo ""
  exit 1
fi

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if device is connected
echo -e "${BLUE}Checking device connection...${NC}"
if ! xcrun devicectl list devices 2>/dev/null | grep "$IOS_DEVICE_UDID" | grep -qE "(connected|available)"; then
  echo -e "${RED}Device not connected. Make sure your iPhone is plugged in or wireless debugging is enabled.${NC}"
  echo -e "${YELLOW}Run 'xcrun devicectl list devices' to see available devices.${NC}"
  exit 1
fi

echo -e "${GREEN}Device connected!${NC}"

# Prebuild if needed
if [ "$1" = "--rebuild" ] || [ ! -d "ios/numbiesxyz.xcworkspace" ]; then
  echo -e "${BLUE}Running prebuild...${NC}"
  bun run prebuild
fi

# Build release for device
echo -e "${BLUE}Building RELEASE for physical device...${NC}"
xcodebuild -workspace ios/numbiesxyz.xcworkspace \
  -scheme numbiesxyz \
  -destination "id=$IOS_DEVICE_XCODE_ID" \
  -configuration Release \
  build \
  | grep -E "^(Build |Signing|Compiling|Linking|error:|warning:|\*\*)" || true

# Find the built app
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData/numbiesxyz-*/Build/Products/Release-iphoneos -name "Numbies.app" -type d 2>/dev/null | head -1)

if [ -z "$APP_PATH" ]; then
  echo -e "${RED}Could not find built app. Build may have failed.${NC}"
  exit 1
fi

echo -e "${GREEN}Build complete!${NC}"

# Install on device
echo -e "${BLUE}Installing on device...${NC}"
xcrun devicectl device install app --device "$IOS_DEVICE_UDID" "$APP_PATH"

# Launch the app
echo -e "${BLUE}Launching app...${NC}"
xcrun devicectl device process launch --device "$IOS_DEVICE_UDID" "$BUNDLE_ID" 2>/dev/null || true

echo -e "${GREEN}Release build installed and launched!${NC}"
echo -e "${YELLOW}No dev server needed - the app runs standalone.${NC}"
