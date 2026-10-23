# Google Maps setup notes

This starter uses `react-native-maps` with Expo configuration. The destination map is the only map screen at this stage.

## Configure carefully

1. Create or select a Google Cloud project and enable **Maps SDK for Android**.
2. Create an Android-restricted API key. Restrict it to package name `np.com.blackdiamondtours.mobile` and the SHA-1 signing certificate(s) for the builds you actually distribute.
3. Store the key in your EAS/project secrets or native build configuration. Never commit a real key to Git.
4. Configure the Android map key using Expo's current app configuration guidance, then create a native development/production build. A config change for native SDK keys generally requires a new build.
5. Set billing budgets/alerts and review usage. API restrictions and app restrictions reduce exposure but do not make a client-side key secret.

`app.json` currently contains a placeholder string. Replace it through your build configuration before releasing. Verify the exact key injection syntax against the Expo SDK version you use; environment-variable interpolation in plain JSON is not automatic in every build workflow.

No location permission is requested. The map shows curated destination markers only.
