#!/bin/bash
set -e

cd "$(dirname "$0")/.."

HASH_FILE=".native-build-hash"
BUNDLE_ID="com.numbies.xyz"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Files that affect native build
native_hash() {
  cat package.json app.json bun.lock ios/Podfile 2>/dev/null | shasum -a 256 | cut -d' ' -f1
}

current_hash=$(native_hash)
stored_hash=""
if [ -f "$HASH_FILE" ]; then
  stored_hash=$(cat "$HASH_FILE")
fi

# Check if app is installed on booted simulator
app_installed() {
  booted_udid=$(xcrun simctl list devices | grep -i "booted" | sed 's/.*(\([^)]*\)).*/\1/' | head -1)
  if [ -n "$booted_udid" ]; then
    xcrun simctl get_app_container "$booted_udid" "$BUNDLE_ID" > /dev/null 2>&1
    return $?
  fi
  return 1
}

needs_rebuild=false
skip_server=false

for arg in "$@"; do
  case $arg in
    --rebuild) needs_rebuild=true ;;
    --no-server) skip_server=true ;;
  esac
done

if [ "$current_hash" != "$stored_hash" ] && [ "$needs_rebuild" = false ]; then
  echo -e "${YELLOW}Native dependencies changed since last build${NC}"
  needs_rebuild=true
fi

# Ensure simulator is running first (needed for app_installed check)
if ! pgrep -x "Simulator" > /dev/null; then
  echo -e "${BLUE}Opening iOS Simulator...${NC}"
  open -a Simulator
  sleep 3
fi

# Boot a device if none booted
booted=$(xcrun simctl list devices | grep -i booted | head -1)
if [ -z "$booted" ]; then
  echo -e "${BLUE}Booting simulator...${NC}"
  device=$(xcrun simctl list devices available | grep -i "iphone" | head -1 | sed 's/.*(\([^)]*\)).*/\1/' | head -1)
  if [ -n "$device" ]; then
    xcrun simctl boot "$device" 2>/dev/null || true
    sleep 2
  fi
fi

# Check if app needs to be installed
if [ "$needs_rebuild" = false ] && ! app_installed; then
  echo -e "${YELLOW}App not installed on simulator${NC}"
  needs_rebuild=true
fi

if [ "$needs_rebuild" = true ]; then
  echo -e "${BLUE}Building and installing iOS dev client...${NC}"
  bun run prebuild
  one run:ios
  echo "$current_hash" > "$HASH_FILE"
  echo -e "${GREEN}Build complete. Hash saved.${NC}"
  if [ "$skip_server" = true ]; then
    echo -e "${GREEN}App installed. Server skipped (--no-server).${NC}"
  else
    echo -e "${BLUE}Starting dev server...${NC}"
    exec bun run dev
  fi
else
  echo -e "${GREEN}Dev client is up to date.${NC}"
  # Launch app
  xcrun simctl launch booted "$BUNDLE_ID" 2>/dev/null || true
  if [ "$skip_server" = true ]; then
    echo -e "${GREEN}App launched. Server skipped (--no-server).${NC}"
  else
    echo -e "${BLUE}Starting dev server...${NC}"
    echo -e "${YELLOW}Tip: Press 'r' in terminal to reload, or shake device for dev menu${NC}"
    exec bun run dev
  fi
fi
