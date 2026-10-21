import { DIAGNOSTICS_ENABLED } from '@/lib/runtimeFeatures';
/**
 * Scanner screen
 * Design references:
 *   - design-reference/packaged_item_expiry_verification/screen.png
 *   - design-reference/receipt_ocr_scanner/screen.png
 *
 * Phase 1: Prototype UI only. No real camera/OCR integration.
 * Mock "scan" results appear after tapping Scan buttons.
 * Phase 6: real receipt entry opens the shared protected on-device review/import route.
 * Real barcode entry opens the protected single-code camera and reviewed catalog form.
 * Demo receipt and barcode previews remain explicit prototypes.
 */
import React, { useState } from 'react';
import {
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import CameraPermissionGate from '@/features/scanner/CameraPermissionGate';
import { initialMockCameraPermission, type MockCameraPermission } from '@/lib/scannerPermission';
import ReceiptReview from '@/features/scanner/ReceiptReview';
import ScreenHeader from '@/components/ScreenHeader';
import { ScannerHeader, ScannerLanding } from '@/features/scanner/ScannerPresentation';
import BarcodeReview from '@/features/scanner/BarcodeReview';
import PrimaryButton from '@/components/PrimaryButton';
import { useAuth } from '@/context/AuthContext';
import { Colors, Elevation, FontSize, FontWeight, Radius, Spacing } from '@/constants/Theme';

type ScanMode = 'none' | 'barcode' | 'receipt';

export default function ScannerScreen() {
  const { state: auth } = useAuth();
  const realReceipt = !!auth.user && !auth.demo;
  const [mode, setMode] = useState<ScanMode>('none');
  const { permission: permissionPreview } = useLocalSearchParams<{ permission?: string }>();
  const [permission, setPermission] = useState<MockCameraPermission>(() => initialMockCameraPermission(permissionPreview));

  return (
    <SafeAreaView style={styles.safe}>
      {!realReceipt && <ScreenHeader title="FreshTrack" subtitle="Scanner" />}


      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {realReceipt ? <><ScannerHeader onSettings={() => router.push('/settings')} /><ScannerLanding
          onReceipt={() => router.push('/scanner/receipt')} onManual={() => router.push('/pantry/add')} onBarcode={() => router.push('/scanner/barcode')} />
          {DIAGNOSTICS_ENABLED && <>
            <PrimaryButton label="Test On-device Receipt OCR" onPress={() => router.push('/scanner/ocr-check')} />
            <PrimaryButton label="Test Receipt Layout Review" variant="ghost" onPress={() => router.push('/scanner/receipt-layout-check')} />
            <PrimaryButton label="Test Barcode Camera" onPress={() => router.push('/scanner/barcode-check')} />
          </>}
        </> : <>
        {/* Title */}
        <Text style={styles.screenTitle}>Smart Scanner</Text>
        <Text style={styles.screenSub}>
          {realReceipt ? 'Read a grocery receipt, review the details and choose what to add to your pantry.' : 'Preview receipt and barcode entry in your demo kitchen.'}
        </Text>

        {/* Phase 1 notice */}
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>
            {realReceipt ? 'Receipt text is read on your device. Barcode product details come from the catalog; review all fields before saving.' : 'Demo Scanner · Sample results only · No device camera access requested'}
          </Text>
        </View>
        <PrimaryButton label="Enter Item Manually" variant="ghost" onPress={() => router.push('/pantry/add')} />
        {DIAGNOSTICS_ENABLED && auth.user && !auth.demo && <PrimaryButton label="Test On-device Receipt OCR" onPress={() => router.push('/scanner/ocr-check')} />}
        {DIAGNOSTICS_ENABLED && auth.user && !auth.demo && <PrimaryButton label="Test Receipt Layout Review" variant="ghost" onPress={() => router.push('/scanner/receipt-layout-check')} />}
        {DIAGNOSTICS_ENABLED && auth.user && !auth.demo && <PrimaryButton label="Test Barcode Camera" onPress={() => router.push('/scanner/barcode-check')} />}

        {/* Mode selector */}
        {mode === 'none' && (
          <View style={styles.modeGrid}>
            {/* Receipt OCR card */}
            <Pressable
              style={({ pressed }) => [styles.modeCard, pressed && styles.pressed]}
              onPress={() => realReceipt ? router.push('/scanner/receipt') : setMode('receipt')}
              accessibilityRole="button"
              accessibilityLabel="Scan receipt"
            >
              <View style={[styles.modeCardIcon, { backgroundColor: Colors.cautionAmberBg }]}>
                <Text style={{ fontSize: 40 }}>🧾</Text>
              </View>
              <Text style={styles.modeCardTitle}>Receipt OCR</Text>
              <Text style={styles.modeCardDesc}>
                {realReceipt ? 'Photograph or choose a receipt, then review groceries and dates before saving.' : 'Explore an editable sample receipt without changing your real pantry.'}
              </Text>
              <View style={styles.modeCardBadge}>
                <Text style={styles.modeCardBadgeText}>{realReceipt ? 'On-device' : 'Demo'}</Text>
              </View>
            </Pressable>

            {/* Barcode scanner card */}
            <Pressable
              style={({ pressed }) => [styles.modeCard, pressed && styles.pressed]}
              onPress={() => realReceipt ? router.push('/scanner/barcode') : setMode('barcode')}
              accessibilityRole="button"
              accessibilityLabel="Scan barcode"
            >
              <View style={[styles.modeCardIcon, { backgroundColor: Colors.freshGreenBg }]}>
                <Text style={{ fontSize: 40 }}>▣</Text>
              </View>
              <Text style={styles.modeCardTitle}>Barcode Scan</Text>
              <Text style={styles.modeCardDesc}>
                {realReceipt ? 'Scan a package, review its catalog details and enter your purchase and expiry information.' : 'Try sample barcode products and expiry-date review.'}
              </Text>
              <View style={[styles.modeCardBadge, { backgroundColor: Colors.freshGreenBg }]}>
                <Text style={[styles.modeCardBadgeText, { color: Colors.freshGreen }]}>
                  {realReceipt ? 'Review first' : 'Demo'}
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        </>}
        {/* Receipt Scanner View */}
        {mode === 'receipt' && !realReceipt && (
          <View style={styles.scannerSection}>
            <View style={styles.scannerTopRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Change Scanner Mode" onPress={() => setMode('none')}>
                <Text style={styles.backLink}>← Change Mode</Text>
              </Pressable>
              <Text style={styles.modeTitleLabel}>Receipt OCR</Text>
            </View>

            <CameraPermissionGate permission={permission} onChange={setPermission}>
              <ReceiptReview />
            </CameraPermissionGate>
          </View>
        )}

        {/* Barcode Scanner View */}
        {mode === 'barcode' && (
          <View style={styles.scannerSection}>
            <View style={styles.scannerTopRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Change Scanner Mode" onPress={() => setMode('none')}>
                <Text style={styles.backLink}>← Change Mode</Text>
              </Pressable>
              <Text style={styles.modeTitleLabel}>Barcode Scan</Text>
            </View>

            <CameraPermissionGate permission={permission} onChange={setPermission}>
              <BarcodeReview />
            </CameraPermissionGate>
          </View>
        )}

        {/* Bottom clearance */}
        <View style={{ height: Spacing.navClearance }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, width: '100%', maxWidth: 600, alignSelf: 'center' },

  screenTitle: {
    fontSize: FontSize.headlineLg,
    fontWeight: FontWeight.extrabold,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: Colors.onSurface,
    marginVertical: Spacing.sm,
    letterSpacing: -0.5,
  },
  screenSub: {
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 22,
    marginBottom: Spacing.base,
  },

  noticeBanner: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderStyle: 'dashed',
  },
  noticeText: {
    fontSize: FontSize.bodySm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  modeGrid: { flexDirection: 'column', gap: Spacing.base },
  modeCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Elevation.card,
  },
  pressed: { opacity: 0.9 },
  modeCardIcon: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCardTitle: {
    fontSize: FontSize.headlineMd,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  modeCardDesc: {
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  modeCardBadge: {
    backgroundColor: Colors.cautionAmberBg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  modeCardBadgeText: {
    fontSize: FontSize.labelMd,
    fontWeight: FontWeight.bold,
    color: Colors.cautionAmber,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  scannerSection: { gap: Spacing.base },
  scannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  backLink: {
    fontSize: FontSize.bodyMd,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  modeTitleLabel: {
    fontSize: FontSize.headlineSm,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  viewfinder: {
    height: 240,
    backgroundColor: '#0F172A',
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  viewfinderCorner1: { position: 'absolute', top: 20, left: 20, width: 32, height: 32, borderTopWidth: 3, borderLeftWidth: 3, borderColor: Colors.primary, borderRadius: 2 },
  viewfinderCorner2: { position: 'absolute', top: 20, right: 20, width: 32, height: 32, borderTopWidth: 3, borderRightWidth: 3, borderColor: Colors.primary, borderRadius: 2 },
  viewfinderCorner3: { position: 'absolute', bottom: 20, left: 20, width: 32, height: 32, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: Colors.primary, borderRadius: 2 },
  viewfinderCorner4: { position: 'absolute', bottom: 20, right: 20, width: 32, height: 32, borderBottomWidth: 3, borderRightWidth: 3, borderColor: Colors.primary, borderRadius: 2 },
  viewfinderEmoji: { fontSize: 56, opacity: 0.2 },
  scanLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: Colors.primary,
    top: '50%',
  },
  viewfinderHint: {
    position: 'absolute',
    bottom: 16,
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.bodySm,
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  scanningIndicator: {
    alignItems: 'center',
    padding: Spacing.base,
  },
  scanningText: {
    fontSize: FontSize.bodyLg,
    color: Colors.smartAzure,
    fontWeight: FontWeight.semibold,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },

  parsedTitle: {
    fontSize: FontSize.headlineSm,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_700Bold',
    marginBottom: Spacing.sm,
  },

  receiptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Elevation.card,
  },
  receiptItemUnselected: { opacity: 0.5 },
  receiptCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptCheckSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkMark: { color: Colors.onPrimary, fontSize: 13, fontWeight: FontWeight.bold },
  receiptEmoji: { fontSize: 28 },
  receiptInfo: { flex: 1 },
  receiptName: {
    fontSize: FontSize.headlineSm,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  receiptMeta: { fontSize: FontSize.bodySm, color: Colors.onSurfaceVariant, marginTop: 2 },

  editHint: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.smartAzure,
  },
  editHintText: {
    fontSize: FontSize.bodySm,
    color: Colors.onSurfaceVariant,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 18,
  },

  barcodeResult: { gap: Spacing.sm },
  resultTitle: {
    fontSize: FontSize.headlineSm,
    fontWeight: FontWeight.bold,
    color: Colors.freshGreen,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Elevation.card,
  },
  resultThumb: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: { flex: 1, gap: Spacing.xs },
  resultName: {
    fontSize: FontSize.headlineSm,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  resultMeta: { fontSize: FontSize.bodySm, color: Colors.onSurfaceVariant },
  overrideLabel: {
    fontSize: FontSize.labelLg,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: FontSize.bodyMd,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  queueHint: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.smartAzure,
  },
  queueHintText: { fontSize: FontSize.bodySm, color: Colors.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular' },
});
