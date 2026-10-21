# Phase 9 — local personal-use iPhone build

21 October 2026. Local Xcode Release configuration using the existing FreshTrack development services and app identity. No store submission, paid cloud build or production rollout.

## Build model

`APP_LOCAL_NATIVE_IDENTIFIER=com.deepeshr.freshtrack.development` selects the existing generated native project and its local-only signing plugin. Xcode's `Release` configuration embeds the JavaScript/assets and uses the non-debug AppDelegate path (`main.jsbundle`). This is different from setting `APP_VARIANT=production`, which retains its existing EAS/public-environment guards. The existing app remains named **FreshTrack Dev** and uses `freshtrack-dev`; this build is not a new production identity.

The local plugin removes unsupported APNs entitlement requests for Personal Team signing, while preserving local reminders and unrelated entitlements. It also preserves the earlier bundle-script quoting correction needed for the space in the repository path. Release JavaScript disables diagnostic controls even if a development opt-in were accidentally present. No native module, package version, schema, provider setting or grocery change is required for this build.

The current API and Neon Auth endpoints use hosted HTTPS. The preserved development Auth Origin is an already configured LAN HTTP origin string: the native client sends it in Origin/Referer headers to the HTTPS Auth service; it does not fetch that LAN address. Standalone sign-in, restoration and sign-out still require phone verification. This is not production Auth-origin readiness; a controlled HTTPS origin remains necessary before a production rollout. No allowlist changes are made here.

## Reproduce from the existing checkout

1. Keep the existing ignored `.env.local`, using the correct public development API/Auth values. Never add backend database/provider secrets. Do not set `APP_VARIANT=production` for this local Personal Team path.
2. Use the repository's Node/toolchain and `npm ci`. On a fresh checkout without generated iOS files, run:

   ```sh
   APP_LOCAL_NATIVE_IDENTIFIER=com.deepeshr.freshtrack.development npx expo prebuild --platform ios --no-install
   cd ios
   pod install
   cd ..
   ```

   Existing generated native files should not be manually recreated or deleted. In Xcode, open `ios/FreshTrackDev.xcworkspace` and select the owner's existing Personal Team/signing identity when a fresh machine needs it. Never commit certificates, profiles or account credentials. This fresh-checkout sequence is documented, not newly executed in this checkpoint.
3. Compile using the existing app identifier, without uninstalling the app:

   ```sh
   APP_LOCAL_NATIVE_IDENTIFIER=com.deepeshr.freshtrack.development \
   EXPO_PUBLIC_ENABLE_DIAGNOSTICS=false \
   xcodebuild -workspace ios/FreshTrackDev.xcworkspace \
     -scheme FreshTrackDev -configuration Release -sdk iphoneos \
     -destination 'generic/platform=iOS' \
     -derivedDataPath /private/tmp/freshtrack-phase9-personal-build \
     -allowProvisioningUpdates build
   ```

4. Verify the resulting `Build/Products/Release-iphoneos/FreshTrackDev.app` signature, embedded bundle, profile validity and app identity before installing. Update the same identifier with Xcode/devicectl rather than uninstalling; this preserves the existing application sandbox. A clean-device install is a separate acceptance check and must not erase the owner's working groceries/session merely for testing.
5. After installation, stop Metro and launch **FreshTrack Dev directly from its iPhone icon**. Do not open Expo Go or an `exp://` development URL. Internet remains necessary for verified authentication and hosted account data; being independent of Metro does not make all features offline.

A free Personal Team is appropriate for this local-device route, but its provisioning profiles expire seven days after issuance and require rebuilding/reinstalling with a valid profile. This is not permanent store-style distribution. Paid Apple membership is not purchased or configured here.

## Verification record

- Existing repository status and recent commits reviewed; unrelated `output/` preserved.
- Mobile `npx tsc --noEmit` and `npm run lint`: pass.
- Backend `npx tsc --noEmit`: pass; no backend change in this slice.
- `node --experimental-strip-types --test tests/release-config.test.mjs tests/development-tools.test.mjs`: 10/10 pass.
- Full suites from immediately preceding source checkpoint `a6d347d` passed mobile386/386, backend163/163 and live43/43 with fixture cleanup. Those full suites are not claimed rerun for this build-only review.

- Actual public Expo config resolves the existing `FreshTrack Dev` name, local identifier/scheme and local signing plugin.
- Signed generic-device **Release build: pass**. Existing generated workspace/pods were used; no clean/prebuild/dependency refresh was needed. Native build log: `/private/tmp/freshtrack-phase9-personal-build.log`. Existing compiler deprecation/script/linkage warnings remain; the build succeeded.
- Strict deep signature verification: pass. Embedded `main.jsbundle` is Hermes bytecode version98, 5,047,056 bytes; SHA256 `e87d348b5789a30f6f1e50f0f7b033709bd21059973ff9fc221a90979bc6989a`.
- Embedded bundle includes the current tested development API URL. App identifier matches the existing install, camera/photo permission descriptions exist, APNs entitlement is absent and Expo Bonjour discovery service is absent.
- Existing profile covers the paired iPhone and expires **23 October2026 at10:08:49AM IST**. It was reused, so this installation does not grant a fresh seven days. Rebuild/reprovision with Xcode before/after expiry as required. No paid membership or distribution profile was created.
- `devicectl device install app`: pass, updating the existing identifier without uninstalling. This is not yet user confirmation that session and app data survived.
- Stopped the identified Metro8087 process. No listeners remain on8081–8087. `devicectl device process launch --terminate-existing` without a server URL: pass. Process launch is not visible UI or end-to-end acceptance.

Artifact summary: `/private/tmp/freshtrack-personal-artifact.json`; app path: `/private/tmp/freshtrack-phase9-personal-build/Build/Products/Release-iphoneos/FreshTrackDev.app`. Install/launch logs: `/private/tmp/freshtrack-personal-{install,launch}.log`. Signing material and generated native outputs stay outside Git.

All eight numbered iPhone checks passed by user report on21October: USB-disconnected direct-icon startup without an Expo launcher/Metro, existing Pantry search/details/back, normal Settings/email without diagnostics, library receipt OCR and Clear without import, Recipes/details/Insights navigation, sign-out with blocked Back, remembered login and force-close/reopen restoration. This is user-reported functional evidence, not direct agent observation or storage forensics. Release notification delivery/actions and clean-device installation are separate, unverified checks; no existing app was uninstalled to manufacture a clean-install result.

Existing upstream advisories, Android runtime, network/update failure paths and the earlier unattributed read-only database failure remain open. Phase9 is not complete. This acceptance update changes documentation only; automated/native checks above were not rerun. `git diff --check` passed. Next: Release-native notification delivery/actions, then remaining personal-use acceptance review. No store publishing.

## References

- [Expo local Release configuration](https://docs.expo.dev/guides/local-app-development/)
- [Expo CLI local build and embedded production bundles](https://docs.expo.dev/more/expo-cli/)
- [Apple Personal Team limits and seven-day profiles](https://developer.apple.com/help/account/basics/about-your-developer-account)
