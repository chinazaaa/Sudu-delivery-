const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Watchman cannot read folders macOS keeps behind Full Disk Access, such as
// Documents, and it takes Metro down with it. Set EXPO_NO_WATCHMAN=1 to fall
// back to Metro's own file crawler, which is slower but always allowed.
if (process.env.EXPO_NO_WATCHMAN) {
  config.resolver.useWatchman = false;
}

module.exports = config;
