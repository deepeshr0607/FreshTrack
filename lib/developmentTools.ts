/** Explicit opt-in for local diagnostic controls; never enabled in a release bundle. */
export function developmentToolsEnabled(development: boolean, flag: string | undefined): boolean {
  return development && flag === 'true';
}
