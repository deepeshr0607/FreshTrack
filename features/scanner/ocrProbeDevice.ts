import { ReceiptImageCacheError } from '@/lib/receiptImageCache';
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import type { ImagePickerOptions } from 'expo-image-picker';
import { File } from 'expo-file-system';
import { nativeReceiptImages, disposeReturnedReceiptCopy } from './nativeReceiptImages';
import { ReceiptOcrError, type OcrPhotoSource } from '@/lib/receiptOcrProbe';

export function ocrProbeSupported() {
  return Platform.OS !== 'web' && !!(requireOptionalNativeModule('FreshTrackReceiptLayout') || requireOptionalNativeModule('ExpoTextExtractor'));
}
/** Only our cache copies are deleted. Original Photos-library assets are never removed. */
export function disposeOcrImage(uri: string) { nativeReceiptImages()?.release(uri); }
export async function chooseOcrImage(source: OcrPhotoSource): Promise<string | null> {
  if (!ocrProbeSupported()) throw new ReceiptOcrError('UNAVAILABLE');
  const images = nativeReceiptImages()!;
  try { images.prepare(); } catch { throw new ReceiptOcrError('CLEANUP'); }
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
  let input: string | null = null, exported: string | null = null, output: string | null = null;
  try {
    if (!asset.width || !asset.height || asset.width * asset.height > 40000000 || (asset.fileSize ?? 0) > 20000000) throw new ReceiptOcrError('IMAGE');
    input = await images.adopt(asset.uri, 'input');
    const context = ImageManipulator.manipulate(input);
    try {
      context.resize(asset.width >= asset.height ? { width: Math.min(asset.width, 2000) } : { height: Math.min(asset.height, 2000) });
      const rendered = await context.renderAsync();
      try {
        exported = (await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 })).uri;
        output = await images.adopt(exported, 'ready');
      }
      finally { rendered.release(); }
    } finally { context.release(); }
    const bytes = output ? new File(output).size : null;
    if (!output || typeof bytes !== 'number' || bytes <= 0 || bytes > 6000000) throw new ReceiptOcrError('IMAGE');
    return output;
  } catch (error) {
    if (output) disposeOcrImage(output);
    if (error instanceof ReceiptImageCacheError) throw new ReceiptOcrError('CLEANUP');
    throw error;
  }
  finally {
    if (input) images.release(input);
    if (exported) disposeReturnedReceiptCopy(exported);
    disposeReturnedReceiptCopy(asset.uri);
  }
}
export async function recognizeOcrImage(uri: string) {
  if (!ocrProbeSupported()) throw new ReceiptOcrError('UNAVAILABLE');
  const images = nativeReceiptImages()!;
  try { images.retain(uri); } catch { throw new ReceiptOcrError('IMAGE'); }
  try {
    const layout = requireOptionalNativeModule<{ recognize(uri: string): Promise<unknown> }>('FreshTrackReceiptLayout');
    if (layout) return await layout.recognize(uri);
    const extractor = await import('expo-text-extractor');
    return await extractor.extractTextFromImage(uri);
  } finally { images.release(uri); }
}
