/**
 * expiry.ts — Freshness threshold helpers.
 *
 * Rules from design spec:
 *   - red (critical):  ≤ 1 day (≤ 48h to keep symmetry with AI Chef's "48h" rule)
 *   - yellow (caution): 2–6 days
 *   - green (fresh):   ≥ 7 days
 *
 * The spec uses "48 hours" as the AI Chef boundary and
 * "within 48 hours" for critical-red. We align ≤1 day = critical for display.
 */

import { Colors } from '../constants/Theme';

export type FreshnessLevel = 'critical' | 'caution' | 'fresh' | 'expired';

export function getFreshnessLevel(daysLeft: number): FreshnessLevel {
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 1) return 'critical';
  if (daysLeft <= 6) return 'caution';
  return 'fresh';
}

export interface FreshnessStyle {
  badgeBg: string;
  badgeText: string;
  barColor: string;
  label: string;
}

export function getFreshnessStyle(daysLeft: number): FreshnessStyle {
  const level = getFreshnessLevel(daysLeft);
  switch (level) {
    case 'expired':
      return {
        badgeBg: Colors.criticalRoseBg,
        badgeText: Colors.criticalRose,
        barColor: Colors.criticalRose,
        label: 'Expired',
      };
    case 'critical':
      return {
        badgeBg: Colors.criticalRoseBg,
        badgeText: Colors.criticalRose,
        barColor: Colors.criticalRose,
        label: daysLeft === 0 ? 'Today' : `${daysLeft}d left`,
      };
    case 'caution':
      return {
        badgeBg: Colors.cautionAmberBg,
        badgeText: Colors.cautionAmber,
        barColor: Colors.cautionAmber,
        label: `${daysLeft}d left`,
      };
    case 'fresh':
      return {
        badgeBg: Colors.freshGreenBg,
        badgeText: Colors.freshGreen,
        barColor: Colors.freshGreen,
        label: `${daysLeft}d left`,
      };
  }
}

/** Returns 0–1 fraction representing how far through the freshness window we are. */
export function getFreshnessProgress(daysLeft: number, totalDays = 14): number {
  if (daysLeft <= 0) return 0;
  return Math.min(daysLeft / totalDays, 1);
}

export function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
