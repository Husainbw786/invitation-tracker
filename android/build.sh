#!/bin/sh
# Builds the Play Store bundle (app-release-bundle.aab) without letting
# Bubblewrap regenerate the project.
#
# Why: the project has our own Android code (ContactsActivity.java, its entry
# in AndroidManifest.xml, and the flag in LauncherActivity.java). If
# twa-manifest.json changes, `bubblewrap build` offers to "apply the changes",
# which regenerates the project and deletes that code. This script marks the
# manifest as already applied first, so the build never asks.
#
# Before each new upload, raise the version in BOTH places:
#   - twa-manifest.json:      appVersionCode, appVersionName, appVersion
#   - app/build.gradle:       versionCode, versionName
#
# Usage (from this folder):  ./build.sh
# It asks for the keystore and key passwords.
set -e
cd "$(dirname "$0")"
shasum -a 1 twa-manifest.json | cut -d' ' -f1 | tr -d '\n' > manifest-checksum.txt
npx @bubblewrap/cli@1.27.0 build
