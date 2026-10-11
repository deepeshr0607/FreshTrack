---
name: FreshTrack Design System
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4a'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dba9'
  secondary: '#855300'
  on-secondary: '#ffffff'
  secondary-container: '#fea619'
  on-secondary-container: '#684000'
  tertiary: '#b90538'
  on-tertiary: '#ffffff'
  tertiary-container: '#dc2c4f'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#92002a'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  stat-counter:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 28px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-base: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 2.5rem
  screen-gutter-mobile: 1rem
  screen-gutter-tablet: 1.5rem
  nav-floating-clearance: 5.5rem
---

## Brand & Style

This design system sets the baseline for a premium, zero-friction smart kitchen assistant and culinary waste-prevention platform. The experience balances organic vitality with the precision of a high-performance inventory engine. The aesthetic feels proactive, clean, and reassuring—transforming kitchen inventory from a domestic chore into a frictionless, eco-conscious habit.

The visual style unites contemporary mobile-native paradigms with subtle tactile depth:
- **Crisp Organic Modernism:** Combines lush botanical hues with immaculate slate neutrals, avoiding sterile hospital-grade whites or hyperactive gamification.
- **Micro-Glass & Translucency:** Uses selective backdrop-filtered floating elements (such as the bottom navigation bar and sticky scanning modals) to maintain spatial context without distracting from inventory scannability.
- **High-Information Density with Visual Breathing Room:** Information layouts utilize tabular metrics, concise status pills, and segmented life-cycle progress meters that allow glanceable audits in sub-second interactions while cooking.

## Colors

The palette establishes immediate sensory recognition for food states: emerald for peak vitality, amber for impending expiration, rose for critical waste alerts, and azure for computational intelligence (scanning, categorizing, recipe pairing).

### Functional Color Assignments
- **Primary Emerald (`#059669` / `#10B981`):** Represents safe stock, optimal consumption windows, positive savings metrics, and primary confirmation calls-to-action.
- **Warning Amber (`#F59E0B`):** Denotes items entering the 2–3 day consumption window. Demands attention without panic.
- **Critical Rose (`#F43F5E`):** Reserved for same-day/expired items (<=1 day) and discarded waste tallies.
- **Smart Azure (`#0EA5E9`):** Indicates computer vision triggers, barcode scan captures, automated receipt ingestion, and recipe recommendation links.
- **Neutral Foundation:** Soft tinted background canvases (`#F8FAFC`, `#F1F5F9`) paired with crisp slate typography (`#0F172A`) ensure AAA contrast across variable ambient kitchen lighting. High-tier dark mode surfaces rely on deep slate bases (`#0F172A` with `#1E293B` containers) rather than pitch black, preventing harsh edges against vivid accents.

## Typography

Plus Jakarta Sans powers the entire scale, chosen for its friendly curves and mechanical structure.

Key rules for typographic usage:
- **Tabular Figures:** Always apply `font-variant-numeric: tabular-nums` to inventory quantity badges, expiration countdown timers (`2d left`, `0d`), financial savings calculations, and recipe match ratios.
- **Hierarchical Scannability:** Headlines use tight negative tracking (`-0.02em` to `-0.03em`) for punchy titles. Micro labels (e.g., `ESTIMATED EXPIRY`, `FREEZER`, `ORGANIC`) use uppercase tracking (`+0.04em`) at bold weights to maintain legibility when rendered in compact badge containers.

## Layout & Spacing

The layout adheres to an 8pt base grid with a 4pt sub-grid for badges, internal input padding, and progress indicators.

### Device Adaptations
- **Mobile Handheld (0–599px):** Employs a single fluid column with `16px` outer screen margins. Cards stretch horizontally, relying on unified interior paddings (`12px` or `16px`). Bottom safe areas reserve `88px` (`nav-floating-clearance`) so floating navigation bars do not obscure the lowest shelf items.
- **Tablet & Foldable (600–1023px):** Shifts to a dynamic 2-column or 3-column asymmetric layout (inventory ledger on the left, live smart meal suggestions and consumption insights on the right) with `24px` gutters.
- **Desktop Dashboard (1024px+):** A 12-column fixed grid bounded at `1200px` max width, pinning common action controls into standard thumb-reach navigation zones.

## Elevation & Depth

Depth in this design system differentiates persistent hardware controls from transient inventory items.

### Depth Hierarchy
1. **Level 0 (Base Surface):** Flat, muted canvas (`#F8FAFC`). No shadow.
2. **Level 1 (Card & Content Containers):** Clean white (`#FFFFFF`) with a hairline border (`1px solid #E2E8F0`) and an ambient, light-diffused downward glow: `0px 2px 8px rgba(15, 23, 42, 0.04)`.
3. **Level 2 (Interactive Elements & Sheets):** Elevated grocery drawer modals, popovers, and quick-add chips: `0px 8px 24px rgba(15, 23, 42, 0.08)`.
4. **Level 3 (Floating HUD & Quick Scanner FAB):** The bottom navigation panel uses a frosted glass effect: `background: rgba(255, 255, 255, 0.82)` with `backdrop-filter: blur(16px)` and a directional shadow: `0px 12px 32px rgba(15, 23, 42, 0.12)`.
5. **State Glows:** Critical cards nearing expiry use a faint perimeter border tint rather than heavy shadows (e.g., `rgba(244, 63, 94, 0.35)`), signaling urgency without cluttering the screen.

## Shapes

The interface balances soft radii (`roundedness: 2`) with fully rounded pills for interactive states.

- **Standard Cards & Containers:** Radii set to `16px` (`rounded-lg`), delivering a soft, non-aggressive enclosure that feels natural in mobile environments.
- **Badges, Status Tags & Action Buttons:** Radii set to `9999px` (Pill format) to cleanly separate clickable pills and metadata badges from content cards.
- **Segmented Control Sliders & Linear Bars:** Inner meters feature `rounded-full` caps to preserve smooth graphical progression across fractional consumption milestones.

## Components

### Buttons
- **Primary Action (Scan / Save / Add):** Pill shape, height `48px` on mobile, rich emerald fill (`#059669`), white bold text (`label-lg`), subtle press compression (`scale(0.98)`).
- **Secondary (Smart Recipe Match):** Crisp azure tint (`#0EA5E9` at 10% fill), azure text, zero border.
- **Scanner FAB:** Elevated center-docked button (`56px` diameter) with emerald gradient (`#10B981` to `#059669`), crisp white capture icon, casting an emerald ambient glow (`0px 8px 20px rgba(16, 185, 129, 0.35)`).

### Badges & Status Pills
- **Expiry Status Indicators:**
  - *Fresh (4+ days):* Soft green tint background (`#ECFDF5`), bold emerald text (`#059669`).
  - *Caution (2–3 days):* Warm amber tint (`#FFFBEB`), amber text (`#D97706`).
  - *Critical (<=1 day):* Vivid rose tint (`#FFF1F2`), rose text (`#E11D48`).
- **Confidence Mode (Dual-Tier):**
  - *Confirmed Date:* Solid border with solid checkmark prefix icon.
  - *Estimated (AI prediction):* Outlined dashed border with subtle spark icon indicator (`0EA5E9`).

### Inventory Food Item Card
- **Structure:** Level 1 elevation, `16px` padding, thumbnail on the left (`48x48px` rounded-md), primary item label with quantity, right-aligned days-remaining metric.
- **Embedded Health Progress Bar:** Slim linear bar (`4px` height) across the bottom of the card, color-transitioned according to the expiration tier (Fresh green -> Caution yellow -> Critical red).

### Inputs & Search
- Surface tinted (`#F1F5F9`), borderless by default, transitioning to a `2px` focus ring in emerald (`#059669`). Includes built-in barcode/voice triggers on trailing ends.

### Dynamic Bottom Navigation Dock
- Floating pill-pod style with inset glassmorphic background, housing 4 standard navigation anchors plus the elevated centerpiece scan button.