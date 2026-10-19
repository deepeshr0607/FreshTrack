import { nativeReceiptImages } from '@/features/scanner/nativeReceiptImages';
import * as SecureStore from 'expo-secure-store';
import { nativePantryDiskCache } from '@/features/pantry/nativeDiskCache';
import { nativeReceiptImportStorage } from '@/features/scanner/nativeReceiptImport';
import { nativeBarcodeRetry } from '@/features/scanner/nativeBarcodeRetry';
import { notificationScope, nativeExpiryScheduler } from '@/features/notifications/nativeScheduler';
import { clearNativeReminderChoice } from '@/features/notifications/nativePreferences';
import { notificationOutboxKey, type createNotificationOutbox } from '@/lib/notificationOutbox';

/** Session is locked before this runs; await writers before deleting their storage keys. */
export async function clearDeletedAccountDeviceData(subject: string, outbox: ReturnType<typeof createNotificationOutbox> | null) {
  if (nativeReceiptImages()?.recover().failed) throw Error('RECEIPT_CLEANUP_FAILED');
  await nativeExpiryScheduler?.cancel();
  await outbox?.clear();
  await SecureStore.deleteItemAsync(notificationOutboxKey(notificationScope(subject)));
  await nativePantryDiskCache?.clear();
  await nativeReceiptImportStorage(subject).clear();
  await nativeBarcodeRetry(subject).clear();
  await clearNativeReminderChoice(notificationScope(subject));
}
