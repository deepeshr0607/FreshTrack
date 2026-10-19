import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import type { ImagePickerOptions } from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { ReceiptOcrError, type OcrPhotoSource } from '@/lib/receiptOcrProbe';

export function ocrProbeSupported() {
  return Platform.OS !== 'web' && !!(requireOptionalNativeModule('FreshTrackReceiptLayout') || requireOptionalNativeModule('ExpoTextExtractor'));
}
/** Only our cache copies are deleted. Original Photos-library assets are never removed. */
export function disposeOcrImage(uri: string) {
  if (!uri.startsWith(`${Paths.cache.uri.replace(/\/$/, '')}/`)) return;
  try { const file = new File(uri); if (file.exists) file.delete(); } catch { /* Cache cleanup is best effort. */ }
}
export async function chooseOcrImage(source: OcrPhotoSource): Promise<string | null> {
  if (!ocrProbeSupported()) throw new ReceiptOcrError('UNAVAILABLE');
  const ImagePicker = await import('expo-image-picker');
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new ReceiptOcrError('PERMISSION');
  }
  // The system photo picker lets the user select an image without requesting broad library access.
  const options: ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 0.8, exif: false, base64: false };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.uri?.startsWith('file://')) throw new ReceiptOcrError('IMAGE');
  let output: string | null = null;
  try {
    if (!asset.width || !asset.height || asset.width * asset.height > 40000000 || (asset.fileSize ?? 0) > 20000000) throw new ReceiptOcrError('IMAGE');
    const context = ImageManipulator.manipulate(asset.uri);
    try {
      context.resize(asset.width >= asset.height ? { width: Math.min(asset.width, 2000) } : { height: Math.min(asset.height, 2000) });
      const rendered = await context.renderAsync();
      try { output = (await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 })).uri; }
      finally { rendered.release(); }
    } finally { context.release(); }
    if (!output || new File(output).size > 6000000) throw new ReceiptOcrError('IMAGE');
    return output;
  } catch (error) { if (output) disposeOcrImage(output); throw error; }
  finally { disposeOcrImage(asset.uri); }
}
export async function recognizeOcrImage(uri: string) {
  if (!ocrProbeSupported()) throw new ReceiptOcrError('UNAVAILABLE');
  const layout = requireOptionalNativeModule<{ recognize(uri: string): Promise<unknown> }>('FreshTrackReceiptLayout');
  if (layout) return layout.recognize(uri);
  const extractor = await import('expo-text-extractor');
  return extractor.extractTextFromImage(uri);
}
