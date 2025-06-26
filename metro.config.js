const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable web support and ensure proper platform resolution
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Ensure proper asset resolution for all platforms
config.resolver.assetExts.push('db', 'mp3', 'ttf', 'obj', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg');

// Add support for additional file extensions
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

// Ensure proper source map generation for debugging
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Enable symlinks for better development experience
config.resolver.symlinks = false;

// Optimize for mobile performance
config.transformer.enableBabelRCLookup = false;

module.exports = config;