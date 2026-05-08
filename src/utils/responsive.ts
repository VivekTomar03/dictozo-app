import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Standard design width (e.g., iPhone 11 / Pixel 4)
const baseWidth = 375;

const scale = SCREEN_WIDTH / baseWidth;

/**
 * Normalizes font size based on screen width.
 * @param size The original font size from the design
 */
export function rf(size: number) {
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

/**
 * Normalizes layout dimensions (width/height/padding) based on screen width.
 */
export function rs(size: number) {
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
}
