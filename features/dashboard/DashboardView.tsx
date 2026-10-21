import React from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Elevation, Radius, Spacing } from '@/constants/Theme';
import { brandImage, recipeImages } from '@/lib/designAssets';
import { dashboardExpiry, dashboardInitials, dashboardSummary, type DashboardFilter, type createDashboardSession } from '@/lib/dashboard';
import { formatAnalyticsMoney } from '@/lib/analyticsPresentation';
import { pantryCardItem, rupeeValue } from '@/lib/pantryApi';
import type { PantryItemDto } from '@/types/api';

export type DashboardAction = 'pantry' | 'scan' | 'add' | 'recipes' | 'shopping' | 'insights' | 'review' | 'settings';
export interface DashboardProps {
  name: string; state: ReturnType<ReturnType<typeof createDashboardSession>['getSnapshot']>;
  mode: 'home' | 'shopping'; filter: DashboardFilter; shopping: { name: string; checked: boolean }[];
  onMode(mode: 'home' | 'shopping'): void; onFilter(filter: DashboardFilter): void; onRefresh(): void;
  onAction(action: DashboardAction): void; onOpenItem(id: string): void; onShoppingToggle(name: string): void;
}
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
function Icon({ name, color = Colors.primary, size = 22 }: { name: IconName; color?: string; size?: number }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} accessible={false} />;
}
function Tap({ children, label, onPress, style }: { children: React.ReactNode; label: string; onPress(): void; style?: React.ComponentProps<typeof Pressable>['style'] }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={state => [typeof style === 'function' ? style(state) : style, state.pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] }]}>{children}</Pressable>;
}
function Section({ title, action, onPress }: { title: string; action: string; onPress(): void }) {
  return <View style={s.section}><Text accessibilityRole="header" style={s.sectionTitle}>{title}</Text>
    <Tap label={action} onPress={onPress} style={s.link}><Text style={s.linkText}>{action}</Text><Icon name="arrow-right" size={16} /></Tap></View>;
}

/** Presentational Dashboard: no fixtures, credentials, API requests or inferred savings. */
export default function DashboardView(props: DashboardProps) {
  const { name, state, mode, filter, shopping, onAction, onOpenItem } = props;
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 360 || fontScale > 1.25;
  const summary = state.items ? dashboardSummary(state.items) : null;
  const rows = summary ? (filter === 'overdue' ? summary.overdue : filter === 'all' ? summary.active : summary.priority) : [];
  const pendingShopping = shopping.filter(row => !row.checked).length;
  const firstName = name.trim().split(/\s+/)[0] || 'there';
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={state.status === 'loading'} onRefresh={props.onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}>
      <View style={s.header}>
        <View style={s.brand}><Image source={brandImage} style={s.logo} accessibilityIgnoresInvertColors /><View>
          <Text style={s.brandName}>FreshTrack</Text><Text style={s.caption}>Your kitchen, connected</Text></View></View>
        <Tap label="Open Settings" onPress={() => onAction('settings')} style={s.avatar}><Text style={s.initials}>{dashboardInitials(name)}</Text></Tap>
      </View>
      <View style={s.greeting}><Text accessibilityRole="header" style={s.title}>Hello, {firstName}<Text style={{ color: Colors.freshGreen }}>.</Text></Text></View>
      <View accessibilityRole="tablist" style={s.modes}>{([{ key: 'home', label: 'At Home', icon: 'home-outline' }, { key: 'shopping', label: 'Shopping', icon: 'cart-outline' }] as const).map(tab =>
        <Pressable key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: mode === tab.key }}
          onPress={() => props.onMode(tab.key)} style={[s.mode, mode === tab.key && s.modeActive]}>
          <Icon name={tab.icon} color={mode === tab.key ? Colors.primary : Colors.onSurfaceVariant} size={20} />
          <Text style={[s.modeText, mode === tab.key && { color: Colors.primary }]}>{tab.label}</Text>
          {tab.key === 'shopping' && pendingShopping > 0 && <Text style={s.count}>{pendingShopping}</Text>}
        </Pressable>)}</View>

      {state.status === 'error' ? <View style={s.errorCard}>
        <Icon name="wifi-off" color={Colors.cautionAmber} size={30} /><Text style={s.sectionTitle}>Let’s reconnect your kitchen</Text>
        <Text accessibilityRole="alert" style={s.body}>{state.error}</Text>
        <Tap label="Retry Dashboard" onPress={props.onRefresh} style={s.solidButton}><Icon name="refresh" color={Colors.white} size={18} /><Text style={s.whiteLabel}>Try again</Text></Tap>
        <Tap label="Open Pantry" onPress={() => onAction('pantry')} style={s.link}><Text style={s.linkText}>Open Pantry</Text><Icon name="arrow-right" size={16} /></Tap>
      </View> : !summary ? <View accessibilityRole="progressbar" accessibilityLabel="Loading your kitchen" style={s.loading}>
        <View style={[s.skeleton, { height: 150 }]} /><View style={s.metrics}><View style={[s.skeleton, { flex: 1, height: 95 }]} /><View style={[s.skeleton, { flex: 1, height: 95 }]} /></View>
        <ActivityIndicator color={Colors.primary} /><Text style={s.caption}>Getting your kitchen ready…</Text>
      </View> : <>
        <View style={[s.hero, !summary.total && { backgroundColor: Colors.primary }]}>
          <View pointerEvents="none" style={s.heroOrb} /><View pointerEvents="none" style={s.heroOrbSmall} />
          <View style={s.heroTop}><View style={s.heroTag}><Icon name={summary.overdue.length ? 'clock-alert-outline' : 'sprout-outline'} color={Colors.inversePrimary} size={16} />
            <Text style={s.heroTagText}>{mode === 'shopping' ? 'SHOP SMARTER' : summary.overdue.length ? 'YOUR NEXT RESCUE' : 'KITCHEN DIGEST'}</Text></View>
            <Icon name="leaf-circle-outline" color={Colors.inversePrimary} size={36} /></View>
          <Text style={s.heroTitle}>{mode === 'shopping' ? pendingShopping ? `${pendingShopping} left to buy.\nPantry first.` : 'Shop your kitchen.\nThen your list.' : !summary.total ? 'A fresh start\nfor your kitchen.' : summary.overdue.length ? `${summary.overdue.length} overdue.\nLet’s check in.` : summary.priority.length ? `${summary.priority.length} to use soon.\nMake them count.` : 'Looking fresh.\nKeep it that way.'}</Text>
          <Text style={s.heroSub}>{mode === 'shopping' ? 'Only buy what your kitchen is missing.' : !summary.total ? 'Start with your latest grocery receipt.' : summary.overdue.length ? 'Tell us what was used or wasted.' : summary.priority.length ? 'A good meal starts with what you have.' : 'Your groceries have time on their side.'}</Text>
          <Tap label={mode === 'shopping' ? 'Open shopping list' : !summary.total ? 'Scan your first receipt' : summary.overdue.length ? 'Review overdue groceries' : 'Browse Pantry'}
            onPress={() => onAction(mode === 'shopping' ? 'shopping' : !summary.total ? 'scan' : summary.overdue.length ? 'review' : 'pantry')} style={s.heroButton}>
            <Text style={s.heroButtonText}>{mode === 'shopping' ? 'Open shopping list' : !summary.total ? 'Scan a receipt' : summary.overdue.length ? 'Review items' : 'Open Pantry'}</Text><Icon name="arrow-top-right" size={19} />
          </Tap>
        </View>
        <View style={[s.metrics, compact && { flexDirection: 'column' }]}>
          <Tap label={`Open Pantry, ${summary.total} active items`} onPress={() => onAction('pantry')} style={s.metric}>
            <View style={s.spread}><Text style={s.eyebrow}>IN YOUR PANTRY</Text><View style={s.smallIcon}><Icon name="fridge-outline" size={19} /></View></View>
            <Text style={s.metricValue}>{summary.total}<Text style={s.metricUnit}> items</Text></Text>
            <Text style={s.caption}>{summary.fresh} with 7+ days left</Text>
            <View style={s.meter}><View style={{ height: 4, width: `${summary.total ? Math.round(summary.fresh / summary.total * 100) : 0}%`, backgroundColor: Colors.freshGreen, borderRadius: 4 }} /></View>
          </Tap>
          <Tap label="View Pantry value and groceries" onPress={() => onAction('pantry')} style={s.metric}>
            <View style={s.spread}><Text style={s.eyebrow}>RECORDED VALUE</Text><View style={[s.smallIcon, { backgroundColor: Colors.surfaceContainerLow }]}><Icon name="wallet-outline" size={19} /></View></View>
            <Text adjustsFontSizeToFit numberOfLines={1} style={s.metricValue}>{summary.priced ? formatAnalyticsMoney(summary.valueMinor) : '—'}</Text>
            <Text style={s.caption}>{summary.priced ? `${summary.priced} of ${summary.total} items priced` : 'Add prices to track value'}</Text>
          </Tap>
        </View>
      </>}

      <View style={s.quickActions}>{([{ action: 'scan', icon: 'receipt', title: 'Scan receipt', tint: Colors.freshGreenBg }, { action: 'add', icon: 'plus', title: 'Add item', tint: Colors.surfaceContainerLow },
        { action: 'shopping', icon: 'basket-outline', title: 'Shopping list', tint: Colors.cautionAmberBg }] as const).map(item => <Tap key={item.action} label={item.title} onPress={() => onAction(item.action)} style={s.quick}>
        <View style={[s.quickIcon, { backgroundColor: item.tint }]}><Icon name={item.icon} size={25} /></View><Text style={s.quickText}>{item.title}</Text>
      </Tap>)}</View>

      {mode === 'shopping' ? <>
        <Section title="Before you shop" action="Open list" onPress={() => onAction('shopping')} />
        <View style={s.shoppingCard}>
          <View style={s.spread}><Text style={s.sectionTitle}>{pendingShopping ? `${pendingShopping} still to pick up` : 'Your list is clear'}</Text><View style={s.smallIcon}><Icon name="basket-check-outline" /></View></View>
          {!shopping.length && <Text style={s.body}>Find a recipe and add its missing ingredients.</Text>}
          {shopping.slice(0, 5).map(item => <Pressable key={item.name} accessibilityRole="checkbox" accessibilityState={{ checked: item.checked }} accessibilityLabel={item.name}
            onPress={() => props.onShoppingToggle(item.name)} style={s.shoppingRow}>
            <Icon name={item.checked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} color={item.checked ? Colors.freshGreen : Colors.outline} />
            <Text style={[s.itemName, item.checked && { textDecorationLine: 'line-through', color: Colors.outline }]}>{item.name}</Text>
          </Pressable>)}
          {!!shopping.length && <Text style={s.caption}>Shopping list · this sign-in session</Text>}
          <Tap label="Find recipes for your shopping list" onPress={() => onAction('recipes')} style={s.outlineButton}><Text style={s.linkText}>Find meal ideas</Text><Icon name="arrow-right" size={18} /></Tap>
        </View>
        <Tap label="Check Pantry before shopping" onPress={() => onAction('pantry')} style={s.checkPantry}><Icon name="fridge-outline" size={27} /><View style={{ flex: 1 }}><Text style={s.itemName}>Already have it?</Text><Text style={s.caption}>A quick Pantry check saves a second purchase.</Text></View><Icon name="chevron-right" /></Tap>
      </> : <>
        <Section title="Use these first" action="See Pantry" onPress={() => onAction('pantry')} />
        <View style={s.filters}>{([{ key: 'priority', title: 'Use first' }, { key: 'overdue', title: 'Overdue' }, { key: 'all', title: 'All items' }] as const).map(tab =>
          <Pressable key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: filter === tab.key }} onPress={() => props.onFilter(tab.key)}
            style={[s.filter, filter === tab.key && s.filterActive]}><Text style={[s.filterText, filter === tab.key && { color: Colors.white }]}>{tab.title}{tab.key === 'overdue' && summary?.overdue.length ? ` ${summary.overdue.length}` : ''}</Text></Pressable>)}</View>
        {summary && (rows.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.carousel}>
          {rows.slice(0, 6).map(item => <ExpiryCard key={item.id} item={item} width={compact ? Math.max(190, width - 90) : 202} onPress={() => onOpenItem(item.id)} onRecipe={() => onAction('recipes')} />)}
        </ScrollView> : <View style={s.emptyCard}><View style={s.quickIcon}><Icon name={summary.total ? 'check-decagram-outline' : 'basket-plus-outline'} size={30} /></View>
          <Text style={s.itemName}>{summary.total ? filter === 'overdue' ? 'No overdue groceries' : 'Nothing urgent right now' : 'Your Pantry is ready for its first groceries'}</Text>
          <Tap label={summary.total ? 'Explore all Pantry items' : 'Add your first grocery'} onPress={() => summary.total ? props.onFilter('all') : onAction('add')} style={s.link}>
            <Text style={s.linkText}>{summary.total ? 'Browse your Pantry' : 'Add a grocery'}</Text><Icon name="arrow-right" size={16} /></Tap>
        </View>)}
        <Section title="Something good for dinner" action="Recipes" onPress={() => onAction('recipes')} />
        <Tap label="Find recipes with your Pantry ingredients" onPress={() => onAction('recipes')} style={s.mealCard}>
          <Image source={recipeImages.rigatoni} style={s.mealImage} resizeMode="cover" accessibilityLabel="Meal inspiration" />
          <View style={s.mealShade} /><View style={s.mealBody}><View style={s.mealTag}><Icon name="silverware-fork-knife" color={Colors.white} size={14} /><Text style={s.whiteLabel}>PANTRY TO PLATE</Text></View>
            <Text style={s.mealTitle}>{'Good food.\nAlready in your kitchen.'}</Text><View style={s.spread}><Text style={s.mealSub}>Find a recipe for what you have.</Text><View style={s.mealArrow}><Icon name="arrow-top-right" color={Colors.white} /></View></View>
          </View>
        </Tap>
        {summary && <>
          <Section title="Just added" action="View all" onPress={() => onAction('pantry')} />
          <View style={s.recentList}>{summary.recent.map(item => <Tap key={item.id} label={`Open ${item.name}`} onPress={() => onOpenItem(item.id)} style={s.recentRow}>
            <View style={s.recentIcon}><Text style={{ fontSize: 25 }}>{pantryCardItem(item).imageEmoji}</Text></View>
            <View style={{ flex: 1 }}><Text numberOfLines={2} style={s.itemName}>{item.name}</Text><Text style={s.caption}>{item.quantity} {item.unit} · {rupeeValue(item.totalCostMinor)}</Text></View>
            <Text style={[s.recentDate, { color: item.daysLeft < 0 ? Colors.criticalRose : Colors.primary }]}>{dashboardExpiry(item.daysLeft)}</Text><Icon name="chevron-right" size={17} />
          </Tap>)}
          {!summary.recent.length && <Text style={[s.body, { padding: 18 }]}>Your next grocery haul will appear here.</Text>}</View>
        </>}
      </>}
      <Tap label="Open your Insights" onPress={() => onAction('insights')} style={s.insightsLink}><Icon name="chart-timeline-variant-shimmer" size={23} /><Text style={s.linkText}>See your kitchen’s impact</Text><Icon name="arrow-right" size={18} /></Tap>
    </ScrollView>
  </SafeAreaView>;
}

function ExpiryCard({ item, width, onPress, onRecipe }: { item: PantryItemDto; width: number; onPress(): void; onRecipe(): void }) {
  const color = item.daysLeft <= 1 ? Colors.criticalRose : item.daysLeft <= 6 ? Colors.cautionAmber : Colors.freshGreen;
  const tint = item.daysLeft <= 1 ? Colors.criticalRoseBg : item.daysLeft <= 6 ? Colors.cautionAmberBg : Colors.freshGreenBg;
  return <View style={[s.expiryCard, { width, borderTopColor: color }]}>
    <Tap label={`Open ${item.name}, ${dashboardExpiry(item.daysLeft)}`} onPress={onPress} style={s.expiryBody}>
      <View style={[s.expiryPill, { backgroundColor: tint }]}><Icon name="clock-outline" color={color} size={13} /><Text style={[s.expiryText, { color }]}>{dashboardExpiry(item.daysLeft)}</Text></View>
      <View style={[s.foodIcon, { backgroundColor: tint }]}><Text style={{ fontSize: 36 }}>{pantryCardItem(item).imageEmoji}</Text></View>
      <Text numberOfLines={2} style={s.itemName}>{item.name}</Text><Text style={s.caption}>{item.quantity} {item.unit} · {rupeeValue(item.totalCostMinor)}</Text>
      <Text style={s.source}>{item.expirySource === 'PRESET_ESTIMATE' ? '✧ Estimated date' : item.expirySource === 'PACKAGE_DATE' ? '✓ Printed date' : 'Your chosen date'}</Text>
    </Tap>
    <Tap label={item.daysLeft < 0 ? `Review ${item.name}` : `Find recipes for ${item.name}`} onPress={item.daysLeft < 0 ? onPress : onRecipe} style={s.cardAction}>
      <Icon name={item.daysLeft < 0 ? 'clipboard-check-outline' : 'silverware-fork-knife'} size={16} /><Text style={s.linkText}>{item.daysLeft < 0 ? 'Review item' : 'Find a recipe'}</Text><Icon name="arrow-right" size={15} />
    </Tap>
  </View>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  content: { width: '100%', maxWidth: 650, alignSelf: 'center', paddingHorizontal: Spacing.lg, paddingTop: 12, paddingBottom: Spacing.navClearance + 48, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, brand: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  logo: { width: 36, height: 36, borderRadius: 11 }, brandName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 19, color: Colors.onSurface, letterSpacing: -0.7 },
  avatar: { width: 44, minHeight: 44, borderRadius: 22, backgroundColor: Colors.freshGreenBg, borderWidth: 1, borderColor: Colors.outlineVariant, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: Colors.primary }, greeting: { gap: 5, marginTop: 8 },
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 32, lineHeight: 42, color: Colors.onSurface, letterSpacing: -1.2 },
  eyebrow: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, lineHeight: 15, letterSpacing: 1.1, color: Colors.onSurfaceVariant },
  caption: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: Colors.onSurfaceVariant, lineHeight: 18 },
  body: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: Colors.onSurfaceVariant, lineHeight: 21 },
  modes: { flexDirection: 'row', backgroundColor: Colors.surfaceContainerHigh, padding: 5, borderRadius: 99, gap: 4 },
  mode: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8, borderRadius: 99 },
  modeActive: { backgroundColor: Colors.white, ...Elevation.card }, modeText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: Colors.onSurfaceVariant },
  count: { fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary, fontSize: 11, backgroundColor: Colors.white, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10 },
  hero: { backgroundColor: Colors.primary, borderRadius: Radius.xl, padding: 22, overflow: 'hidden', gap: 12, minHeight: 218 },
  heroOrb: { position: 'absolute', width: 210, height: 210, borderRadius: 110, backgroundColor: '#108260', right: -85, bottom: -70 },
  heroOrbSmall: { position: 'absolute', width: 110, height: 110, borderRadius: 60, borderWidth: 20, borderColor: '#167D5E', right: 10, top: -65 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heroTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroTagText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, letterSpacing: 1, color: Colors.inversePrimary },
  heroTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 27, lineHeight: 35, letterSpacing: -0.8, color: Colors.white },
  heroSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, lineHeight: 20, color: Colors.onPrimaryContainer },
  heroButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 99, backgroundColor: Colors.white, paddingHorizontal: 18, minHeight: 45, marginTop: 3 },
  heroButtonText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: Colors.primary },
  metrics: { flexDirection: 'row', gap: 12 }, metric: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 15, gap: 8, borderWidth: 1, borderColor: '#E9EAEF', ...Elevation.card },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, smallIcon: { backgroundColor: Colors.freshGreenBg, borderRadius: 12, padding: 7 },
  metricValue: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 25, lineHeight: 34, letterSpacing: -1, color: Colors.primary, fontVariant: ['tabular-nums'] },
  metricUnit: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, letterSpacing: 0, color: Colors.onSurface }, meter: { height: 4, backgroundColor: Colors.surfaceContainerLow, borderRadius: 4, marginTop: 1 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 3 }, quick: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 8 },
  quickIcon: { minWidth: 52, minHeight: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.freshGreenBg },
  quickText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: Colors.onSurface, textAlign: 'center' },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  sectionTitle: { fontFamily: 'PlusJakartaSans_700Bold', color: Colors.onSurface, fontSize: 18, lineHeight: 26, letterSpacing: -0.4 },
  link: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 }, linkText: { fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary, fontSize: 12, lineHeight: 18 },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: -10 }, filter: { minHeight: 44, borderRadius: 99, paddingHorizontal: 17, justifyContent: 'center', backgroundColor: Colors.white, borderWidth: 1, borderColor: '#E3E8E4' },
  filterActive: { backgroundColor: Colors.primary, borderColor: Colors.primary }, filterText: { fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.onSurfaceVariant, fontSize: 12 },
  carousel: { gap: 12, paddingBottom: 8, paddingRight: 2 }, expiryCard: { borderRadius: Radius.lg, borderWidth: 1, borderColor: '#E9EAEF', borderTopWidth: 3, backgroundColor: Colors.white, overflow: 'hidden', ...Elevation.card },
  expiryBody: { padding: 14, gap: 8, flex: 1 }, expiryPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4 },
  expiryText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, lineHeight: 16 }, foodIcon: { height: 65, width: 65, alignItems: 'center', justifyContent: 'center', borderRadius: 20, marginVertical: 3 },
  itemName: { fontFamily: 'PlusJakartaSans_700Bold', color: Colors.onSurface, fontSize: 14, lineHeight: 21, flexShrink: 1 }, source: { fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.outline, fontSize: 11, lineHeight: 16 },
  cardAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 46, backgroundColor: Colors.surfaceContainerLow, paddingHorizontal: 12, gap: 5 },
  emptyCard: { backgroundColor: Colors.white, padding: 22, borderRadius: Radius.lg, gap: 12, alignItems: 'center' },
  mealCard: { minHeight: 228, borderRadius: Radius.xl, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: Colors.inverseSurface },
  mealImage: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, width: '100%', height: '100%', opacity: 0.7 }, mealShade: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(10,30,20,0.38)' },
  mealBody: { padding: 20, gap: 12 }, mealTag: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(0,105,72,0.9)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 },
  whiteLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, letterSpacing: 0.4, color: Colors.white }, mealTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 24, lineHeight: 32, color: Colors.white, letterSpacing: -0.6 },
  mealSub: { fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.white, fontSize: 12, lineHeight: 18, flex: 1 }, mealArrow: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  recentList: { borderRadius: Radius.lg, backgroundColor: Colors.white, paddingHorizontal: 14, ...Elevation.card },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 15, minHeight: 82 }, recentIcon: { width: 48, height: 48, backgroundColor: Colors.surfaceContainerLow, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  recentDate: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, lineHeight: 17, maxWidth: 72, textAlign: 'right' },
  insightsLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 54, marginTop: 12, backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.lg, paddingHorizontal: 12 },
  shoppingCard: { backgroundColor: Colors.white, padding: 20, borderRadius: Radius.xl, gap: 14, ...Elevation.card },
  shoppingRow: { flexDirection: 'row', alignItems: 'center', minHeight: 50, gap: 12 }, checkPantry: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, backgroundColor: Colors.freshGreenBg, borderRadius: Radius.lg },
  outlineButton: { minHeight: 48, borderRadius: 99, borderWidth: 1, borderColor: Colors.outlineVariant, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  errorCard: { borderRadius: Radius.xl, padding: 24, backgroundColor: Colors.white, gap: 14 }, solidButton: { flexDirection: 'row', minHeight: 46, justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 99 },
  loading: { gap: 16, alignItems: 'stretch' }, skeleton: { backgroundColor: Colors.surfaceContainerHigh, borderRadius: Radius.xl },
});
