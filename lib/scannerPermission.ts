/** Phase 1 permission fixtures. These states never read or change device camera permissions. */
export type MockCameraPermission = 'undetermined' | 'denied' | 'blocked' | 'granted';

export const MOCK_CAMERA_PERMISSION_COPY: Record<Exclude<MockCameraPermission, 'granted'>, { title: string; body: string }> = {
  undetermined: {
    title: 'Camera access for scanning',
    body: 'FreshTrack uses the camera to capture receipts, barcodes and package dates. Choose a demo response to preview this flow. No device permission is requested.',
  },
  denied: {
    title: 'Camera access denied',
    body: 'You can try the permission step again or enter groceries manually. This is a simulated denial; your device camera settings have not changed.',
  },
  blocked: {
    title: 'Camera access is blocked',
    body: 'This sample represents a permission that cannot be requested again. Review the demo camera setting or enter groceries manually. Device settings stay unchanged.',
  },
};

export function initialMockCameraPermission(value: string | string[] | undefined): MockCameraPermission {
  return value === 'denied' || value === 'blocked' || value === 'granted' ? value : 'undetermined';
}
