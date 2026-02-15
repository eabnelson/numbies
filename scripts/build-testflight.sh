#!/bin/bash
set -e

cd "$(dirname "$0")/.."

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BUILD_DIR="build"
ARCHIVE_PATH="$BUILD_DIR/Numbies.xcarchive"
EXPORT_PATH="$BUILD_DIR/export"

echo -e "${BLUE}=== Building Numbies for TestFlight ===${NC}"

# Clean build directory
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Prebuild (generates native code from Expo config)
echo -e "${BLUE}Running prebuild...${NC}"
bun run prebuild

# Build archive
echo -e "${BLUE}Creating release archive...${NC}"
xcodebuild -workspace ios/Numbies.xcworkspace \
  -scheme Numbies \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE_PATH" \
  -allowProvisioningUpdates \
  archive \
  | grep -E "^(Archive|Signing|Compiling|Linking|error:|warning:|\*\*)" || true

if [ ! -d "$ARCHIVE_PATH" ]; then
  echo -e "${RED}Archive failed. Check Xcode for errors.${NC}"
  exit 1
fi

echo -e "${GREEN}Archive created!${NC}"

# Export and upload to App Store Connect
echo -e "${BLUE}Exporting and uploading to App Store Connect...${NC}"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist ExportOptions.plist \
  -allowProvisioningUpdates

if [ $? -ne 0 ]; then
  echo -e "${RED}Export/upload failed. Check ExportOptions.plist and signing.${NC}"
  exit 1
fi

echo -e "${GREEN}=== Build uploaded to App Store Connect! ===${NC}"
echo -e "${YELLOW}Check App Store Connect for processing status.${NC}"
