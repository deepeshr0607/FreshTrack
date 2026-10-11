/**
 * Scanner screen
 * Design references:
 *   - design-reference/packaged_item_expiry_verification/screen.png
 *   - design-reference/receipt_ocr_scanner/screen.png
 *
 * Phase 1: Prototype UI only. No real camera/OCR integration.
 * Mock "scan" results appear after tapping Scan buttons.
 */
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import ScreenHeader from '@/components/ScreenHeader';
import ExpiryBadge from '@/components/ExpiryBadge';
import PrimaryButton from '@/components/PrimaryButton';
import { Colors, Elevation, FontSize, FontWeight, Radius, Spacing } from '@/constants/Theme';
import { MOCK_PANTRY_ITEMS } from '@/lib/mock';

type ScanMode = 'none' | 'barcode' | 'receipt';

// Mock OCR receipt result
const MOCK_RECEIPT_ITEMS = [
  { id: 'ri1', name: 'Baby Spinach 5oz', price: 3.99, qty: 1, emoji: '🥬', daysLeft: 5 },
  { id: 'ri2', name: 'Whole Milk 1 Gal', price: 4.49, qty: 1, emoji: '🥛', daysLeft: 7 },
  { id: 'ri3', name: 'Greek Yogurt', price: 5.29, qty: 2, emoji: '🍶', daysLeft: 12 },
  { id: 'ri4', name: 'Sourdough Bread', price: 5.20, qty: 1, emoji: '🍞', daysLeft: 4 },
  { id: 'ri5', name: 'Pasture Eggs 12ct', price: 6.49, qty: 1, emoji: '🥚', daysLeft: 14 },
];

// Mock barcode scan result
const MOCK_BARCODE_RESULT = MOCK_PANTRY_ITEMS[0]!;

export default function ScannerScreen() {
  const [mode, setMode] = useState<ScanMode>('none');
  const [scanning, setScanning] = useState(false);
  const [receiptItems, setReceiptItems] = useState(
    MOCK_RECEIPT_ITEMS.map((i) => ({ ...i, selected: true })),
  );
  const [barcodeResult, setBarcodeResult] = useState<typeof MOCK_BARCODE_RESULT | null>(null);
  const [expiryOverride, setExpiryOverride] = useState('');

  const handleBarcodeScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setBarcodeResult(MOCK_BARCODE_RESULT);
    }, 1200);
  };

  const handleReceiptScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
    }, 1200);
  };

  const handleAddHaul = () => {
    const selected = receiptItems.filter((i) => i.selected);
    Alert.alert(
      '✓ Added to Pantry',
      `${selected.length} items added to your kitchen inventory! FreshTrack will monitor their expiry dates.`,
      [{ text: 'View Pantry', onPress: () => router.push('/(tabs)/pantry' as any) }],
    );
  };

  const handleAddBarcode = () => {
    Alert.alert(
      '✓ Item Added',
      `${barcodeResult?.name} added to your pantry with expiry set.`,
      [{ text: 'OK', onPress: () => { setBarcodeResult(null); setMode('none'); } }],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="FreshTrack" subtitle="Scanner" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.screenTitle}>Smart Scanner</Text>
        <Text style={styles.screenSub}>
          Scan receipts or barcodes to instantly add items to your kitchen inventory
        </Text>

        {/* Phase 1 notice */}
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>
            🛠 Phase 1 Prototype · Camera not connected · Tap scan buttons to simulate
          </Text>
        </View>
        <PrimaryButton label="Enter Item Manually" variant="ghost" onPress={() => router.push('/pantry/add')} />

        {/* Mode selector */}
        {mode === 'none' && (
          <View style={styles.modeGrid}>
            {/* Receipt OCR card */}
            <Pressable
              style={({ pressed }) => [styles.modeCard, pressed && styles.pressed]}
              onPress={() => setMode('receipt')}
              accessibilityRole="button"
              accessibilityLabel="Scan receipt"
            >
              <View style={[styles.modeCardIcon, { backgroundColor: Colors.cautionAmberBg }]}>
                <Text style={{ fontSize: 40 }}>🧾</Text>
              </View>
              <Text style={styles.modeCardTitle}>Receipt OCR</Text>
              <Text style={styles.modeCardDesc}>
                Photograph your grocery receipt and let AI extract all items automatically
              </Text>
              <View style={styles.modeCardBadge}>
                <Text style={styles.modeCardBadgeText}>AI-Powered</Text>
              </View>
            </Pressable>

            {/* Barcode scanner card */}
            <Pressable
              style={({ pressed }) => [styles.modeCard, pressed && styles.pressed]}
              onPress={() => setMode('barcode')}
              accessibilityRole="button"
              accessibilityLabel="Scan barcode"
            >
              <View style={[styles.modeCardIcon, { backgroundColor: Colors.freshGreenBg }]}>
                <Text style={{ fontSize: 40 }}>▣</Text>
              </View>
              <Text style={styles.modeCardTitle}>Barcode Scan</Text>
              <Text style={styles.modeCardDesc}>
                Scan a product barcode to identify items and verify expiry dates
              </Text>
              <View style={[styles.modeCardBadge, { backgroundColor: Colors.freshGreenBg }]}>
                <Text style={[styles.modeCardBadgeText, { color: Colors.freshGreen }]}>
                  Instant
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* Receipt Scanner View */}
        {mode === 'receipt' && (
          <View style={styles.scannerSection}>
            <View style={styles.scannerTopRow}>
              <Pressable onPress={() => { setMode('none'); setScanning(false); }}>
                <Text style={styles.backLink}>← Change Mode</Text>
              </Pressable>
              <Text style={styles.modeTitleLabel}>Receipt OCR</Text>
            </View>

            {/* Camera viewfinder placeholder */}
            <View style={styles.viewfinder}>
              <View style={styles.viewfinderCorner1} />
              <View style={styles.viewfinderCorner2} />
              <View style={styles.viewfinderCorner3} />
              <View style={styles.viewfinderCorner4} />
              <Text style={styles.viewfinderEmoji}>🧾</Text>
              {scanning ? (
                <View style={styles.scanLine} />
              ) : null}
              <Text style={styles.viewfinderHint}>
                {scanning ? '⚡ Scanning receipt...' : 'Position receipt in frame'}
              </Text>
            </View>

            {!scanning && receiptItems.length === 0 ? (
              <PrimaryButton
                label="📷 Simulate Receipt Scan"
                onPress={handleReceiptScan}
                loading={scanning}
              />
            ) : null}

            {scanning && (
              <View style={styles.scanningIndicator}>
                <Text style={styles.scanningText}>⚡ Extracting items with OCR AI...</Text>
              </View>
            )}

            {/* Parsed items list (shown immediately in Phase 1 prototype) */}
            {!scanning && (
              <View>
                <Text style={styles.parsedTitle}>
                  Detected Haul · {receiptItems.filter(i => i.selected).length} items selected
                </Text>

                {receiptItems.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[styles.receiptItem, !item.selected && styles.receiptItemUnselected]}
                    onPress={() =>
                      setReceiptItems((prev) =>
                        prev.map((ri) => (ri.id === item.id ? { ...ri, selected: !ri.selected } : ri)),
                      )
                    }
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: item.selected }}
                  >
                    <View style={[styles.receiptCheck, item.selected && styles.receiptCheckSelected]}>
                      {item.selected && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                    <Text style={styles.receiptEmoji}>{item.emoji}</Text>
                    <View style={styles.receiptInfo}>
                      <Text style={styles.receiptName}>{item.name}</Text>
                      <Text style={styles.receiptMeta}>
                        Qty: {item.qty} · ${item.price.toFixed(2)}
                      </Text>
                    </View>
                    <ExpiryBadge daysLeft={item.daysLeft} expirySource="PRESET_ESTIMATE" compact />
                  </Pressable>
                ))}

                {/* Edit/verify note */}
                <View style={styles.editHint}>
                  <Text style={styles.editHintText}>
                    ✦ Expiry dates are estimated — tap any item to edit before adding.
                    Never auto-imported without your review.
                  </Text>
                </View>

                <PrimaryButton
                  label={`✓ Add ${receiptItems.filter(i => i.selected).length} Items to Kitchen`}
                  onPress={handleAddHaul}
                  style={{ marginTop: Spacing.sm }}
                />
                <PrimaryButton
                  label="Scan Another Receipt"
                  onPress={handleReceiptScan}
                  variant="ghost"
                  style={{ marginTop: Spacing.sm }}
                />
              </View>
            )}
          </View>
        )}

        {/* Barcode Scanner View */}
        {mode === 'barcode' && (
          <View style={styles.scannerSection}>
            <View style={styles.scannerTopRow}>
              <Pressable onPress={() => { setMode('none'); setBarcodeResult(null); setScanning(false); }}>
                <Text style={styles.backLink}>← Change Mode</Text>
              </Pressable>
              <Text style={styles.modeTitleLabel}>Barcode Scan</Text>
            </View>

            {/* Viewfinder */}
            <View style={styles.viewfinder}>
              <View style={styles.viewfinderCorner1} />
              <View style={styles.viewfinderCorner2} />
              <View style={styles.viewfinderCorner3} />
              <View style={styles.viewfinderCorner4} />
              <Text style={styles.viewfinderEmoji}>▣</Text>
              {scanning && <View style={styles.scanLine} />}
              <Text style={styles.viewfinderHint}>
                {scanning ? '⚡ Reading barcode...' : 'Align barcode in frame'}
              </Text>
            </View>

            {!barcodeResult && (
              <PrimaryButton
                label="▣ Simulate Barcode Scan"
                onPress={handleBarcodeScan}
                loading={scanning}
                style={{ marginTop: Spacing.base }}
              />
            )}

            {/* Result card */}
            {barcodeResult && !scanning && (
              <View style={styles.barcodeResult}>
                <Text style={styles.resultTitle}>✓ Item Identified</Text>
                <View style={styles.resultCard}>
                  <View style={styles.resultThumb}>
                    <Text style={{ fontSize: 36 }}>{barcodeResult.imageEmoji}</Text>
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{barcodeResult.name}</Text>
                    <Text style={styles.resultMeta}>{barcodeResult.category}</Text>
                    <ExpiryBadge daysLeft={barcodeResult.daysLeft} expirySource={barcodeResult.expirySource} />
                  </View>
                </View>

                {/* Expiry override */}
                <Text style={styles.overrideLabel}>📅 Override Expiry Date (optional)</Text>
                <View style={styles.searchBar}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    value={expiryOverride}
                    onChangeText={setExpiryOverride}
                    keyboardType="numeric"
                    accessibilityLabel="Override expiry date"
                  />
                </View>

                {/* Item queue hint */}
                <View style={styles.queueHint}>
                  <Text style={styles.queueHintText}>
                    💡 Scan another barcode to queue multiple items before adding to pantry.
                  </Text>
                </View>

                <PrimaryButton
                  label="✓ Add to Pantry"
                  onPress={handleAddBarcode}
                  style={{ marginTop: Spacing.sm }}
                />
                <PrimaryButton
                  label="▣ Scan Another Barcode"
                  onPress={() => { setBarcodeResult(null); handleBarcodeScan(); }}
                  variant="ghost"
                  style={{ marginTop: Spacing.sm }}
                />
              </View>
            )}
          </View>
        )}

        {/* Bottom clearance */}
        <View style={{ height: Spacing.navClearance }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.screenGutter },

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
