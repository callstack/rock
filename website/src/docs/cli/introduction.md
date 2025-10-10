# Introduction

The Rock CLI is a command-line tool that helps you develop, build, and run React Native applications.

We've created a new CLI from scratch with a focus on seamless migration from the Community CLI. Most projects can get started with our CLI in under 10 minutes.

At its core is a modular configuration system that lets you customize capabilities through plugins and replaceable build chain components: bundlers, platforms, remote cache providers, and other helpers available as npm packages.

Basic usage:

```shell title="Terminal"
npx rock [command] [options]
```

![](/cli.png)

## Key Features

The CLI handles all essential build and deployment tasks:

- Building and running APK/APP/HAP files on devices and simulators
- Creating builds for different variants and configurations
- Generating signed IPA and AAB archives for app stores
- Re-signing archives with fresh JS bundles
- Generating native project hashes for caching

## Command Changes from Community CLI

We've updated command names:

- `run-android` → `run:android`
- `build-android` → `build:android`
- `run-ios` → `run:ios`
- `build-ios` → `build:ios`

## Flag Changes

We've standardized flag naming across platforms:

Android:

- `--mode` → `--variant`
- `--appId` → `--app-id`
- `--appIdSuffix` → `--app-id-suffix`

iOS:

- `--mode` → `--configuration`
- `--buildFolder` → `--build-folder`

## Removed Flags

We've simplified the interface by removing redundant flags:

- `--interactive`/`-i` – CLI now prompts for input when needed
- `--list-devices` – Device selection is now automatic when no devices are connected

## Remote Cache

The CLI integrates with Rock's Remote Cache system to speed up builds by reusing cached native artifacts. When available, the CLI will automatically download and use cached builds (APK/AAB/APP/IPA) instead of rebuilding from scratch.

Learn more about [Remote Cache & GitHub Actions](/docs/remote-cache/introduction).

## Local Cache

Regardless of the remote cache provider you use, the CLI will also cache builds (APK/AAB/APP/IPA) in your local cache (`.rock/` directory). If a cached build is found, it will be used instead of rebuilding from scratch.

## Global Options

The following options are available for all commands:

| Options             | Description                     |
| ------------------- | ------------------------------- |
| `-h` or `--help`    | Shows all available options     |
| `-V` or `--version` | Outputs the Rock version number |
| `--verbose`         | Sets verbose logging            |

## Available Commands

Rock CLI uses a modular design where available commands depend on your configuration. The following commands are available by default for all configurations (these are internal commands that you typically won't need to run):

| Command        | Description                                     |
| :------------- | :---------------------------------------------- |
| `config`       | Outputs autolinking config (from Community CLI) |
| `fingerprint`  | Calculates fingerprint for project or platform  |
| `clean`        | Cleans various caches to free up disk space     |
| `help`         | Displays help menu for a command                |
| `remote-cache` | Manage remote cache                             |

Additional commands for development, building, and running apps are provided by specialized plugins.

### Bundler Plugins

Bundler plugins are configured through the [`bundler`](/docs/configuration/index#bundler) property in your configuration. Available bundlers include:

- `@rock-js/plugin-metro` – Metro bundler plugin with the following commands:

  | Command  | Description                   |
  | :------- | :---------------------------- |
  | `start`  | Starts Metro dev server       |
  | `bundle` | Bundles JavaScript with Metro |

- `@rock-js/plugin-repack` – Re.Pack bundler plugin with the following commands:

  | Command  | Description                     |
  | :------- | :------------------------------ |
  | `start`  | Starts Re.Pack dev server       |
  | `bundle` | Bundles JavaScript with Re.Pack |

### Platform Plugins

Platform plugins are configured through the [`platform`](/docs/configuration/index#platforms) property in your configuration. Available platforms include:

- `@rock-js/platform-android` – Android platform plugin with the following commands:

  | Command         | Description                                                     |
  | :-------------- | :-------------------------------------------------------------- |
  | `run:android`   | Runs Android app on emulator or device                          |
  | `build:android` | Builds Android app for generic emulator, device or distribution |
  | `sign:android`  | Signs Android app with keystore                                 |

- `@rock-js/platform-ios` – iOS platform plugin with the following commands:

  | Command     | Description                                                  |
  | :---------- | :----------------------------------------------------------- |
  | `build:ios` | Builds iOS app for generic simulator, device or distribution |
  | `run:ios`   | Runs iOS app on simulator or device                          |
  | `sign:ios`  | Signs iOS app with certificate and provisioning profile      |

- `@rock-js/platform-harmony` – HarmonyOS platform plugin (experimental) with the following commands:

  | Command         | Description                                 |
  | :-------------- | :------------------------------------------ |
  | `build:harmony` | Builds HarmonyOS app for emulator or device |
  | `run:harmony`   | Runs HarmonyOS app on device                |

## Platform iOS

### `rock build:ios` Options

The `build:ios` command builds your iOS app for simulators, devices, or distribution, producing either an APP directory (for simulators) or an IPA file (for devices and distribution).

| Option                            | Description                                                                                                                                                                                                                                                  |
| :-------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--configuration <string>`        | Xcode scheme configuration (case sensitive)                                                                                                                                                                                                                  |
| `--scheme <string>`               | Xcode scheme to use                                                                                                                                                                                                                                          |
| `--target <string>`               | Xcode target to use                                                                                                                                                                                                                                          |
| `--extra-params <string>`         | Custom xcodebuild parameters                                                                                                                                                                                                                                 |
| `--export-extra-params <string>`  | Custom xcodebuild export archive parameters                                                                                                                                                                                                                  |
| `--export-options-plist <string>` | Export options file for archiving (default: ExportOptions.plist)                                                                                                                                                                                             |
| `--build-folder <string>`         | Location for iOS build artifacts                                                                                                                                                                                                                             |
| `--destination <strings...>`      | Define destination(s) for the build. You can pass multiple destinations as separate values or repeated use of the flag. Values can be either: "simulator", "device" or destinations supported by "xcodebuild -destination" flag, e.g. "generic/platform=iOS" |
| `--archive`                       | Create Xcode archive (IPA)                                                                                                                                                                                                                                   |
| `--no-install-pods`               | Skip CocoaPods installation                                                                                                                                                                                                                                  |
| `--no-new-arch`                   | Build in legacy async architecture                                                                                                                                                                                                                           |

#### Supported environmental variables

The `build:ios` command supports the following environmental variables that are passed to `pod` command that installs CocoaPods dependencies:

| Variable                  | Description                                                                                  | Default |
| ------------------------- | -------------------------------------------------------------------------------------------- | ------- |
| `RCT_USE_RN_DEP`          | Use prebuilt React Native dependencies for faster compilation (only for React Native v0.81+) | `1`     |
| `RCT_USE_PREBUILT_RNCORE` | Use prebuilt React Native core for faster compilation (only for React Native v0.81+)         | `1`     |
| `USE_THIRD_PARTY_JSC`     | Use JavaScriptCore instead of Hermes for JavaScript execution                                | `0`     |

To change these variables, you can prefix the `build:ios` command with environmental variables. For example, to use prebuilt React Native dependencies and core for faster compilation, you can use the following command:

```shell
RCT_USE_PREBUILT_RNCORE=0 RCT_USE_RN_DEP=0 npx rock build:ios
```

### `rock run:ios` Options

The `run:ios` command runs your iOS app on a simulator or device. It follows this build strategy:

1. Use the provided binary if specified with `--binary-path`
1. Build locally if `--local` flag is set
1. Otherwise, try to use a cached build from cache (in `.rock` folder)

The build cache is populated either by a local build or when downloaded frome remote storage with [`remoteCacheProvider`](../configuration.md#remote-cache-configuration).

`run:ios` extends the functionality of `build:ios` with additional runtime options.

| Option                   | Description                               |
| :----------------------- | :---------------------------------------- |
| `--port <number>`        | Bundler port (default: 8081)              |
| `--binary-path <string>` | Path to pre-built .app binary             |
| `--device <string>`      | Device/simulator to use (by name or UDID) |
| `--catalyst`             | Run on Mac Catalyst                       |
| `--local`                | Force local build with xcodebuild         |

You can also pass the same environmental variables listed in [`build:ios` options](#supported-environmental-variables) to the `run:ios` command.

### `rock sign:ios` Options

The `sign:ios` command either signs your iOS app with certificates and provisioning profiles, producing a signed IPA file ready for distribution, or modifies APP file without signing. It allows for replacing the JS bundle with a new version.

| Argument     | Description                 |
| :----------- | :-------------------------- |
| `binaryPath` | Path to the IPA or APP file |

| Option                | Description                                                         |
| :-------------------- | :------------------------------------------------------------------ |
| `--app`               | Modify APP file (directory) instead of IPA file. No signing is done |
| `--identity <string>` | Certificate Identity name for code signing                          |
| `--output <string>`   | Path to output IPA file                                             |
| `--build-jsbundle`    | Build JS bundle before signing                                      |
| `--jsbundle <string>` | Path to JS bundle to apply before signing                           |
| `--no-hermes`         | Don't use Hermes for JS bundle                                      |

## Platform Android

### `rock build:android` Options

The `build:android` command builds your Android app for emulators, devices, or distribution, producing either APK or AAB files. It follows this build strategy:

1. Use the provided binary if specified with `--binary-path`
1. Build locally if `--local` flag is set
1. Otherwise, try to use a cached build from cache (in `.rock` folder)

The build cache is populated either by a local build or when downloaded frome remote storage with [`remoteCacheProvider`](../configuration.md#remote-cache-configuration).

| Option                   | Description                             |
| :----------------------- | :-------------------------------------- |
| `--variant <string>`     | Build variant (debug/release)           |
| `--aab`                  | Build Android App Bundle instead of APK |
| `--active-arch-only`     | Build only for active architecture      |
| `--tasks <array>`        | Custom Gradle tasks                     |
| `--extra-params <array>` | Extra parameters for Gradle             |

### `rock run:android` Options

The `run:android` command runs your Android app on an emulator or device. It extends the functionality of `build:android` with additional runtime options.

Same as for `build:android` and:

| Option                     | Description                           |
| :------------------------- | :------------------------------------ |
| `--app-id <string>`        | Application ID                        |
| `--app-id-suffix <string>` | Application ID suffix                 |
| `--binary-path <string>`   | Path to pre-built APK                 |
| `--local`                  | Force local build with Gradle wrapper |

### `rock sign:android` Options

The `sign:android <binaryPath>` command signs your Android app with a keystore, producing a signed APK or AAB file ready for distribution. It allows for replacing the JS bundle with a new version.

| Argument     | Description          |
| :----------- | :------------------- |
| `binaryPath` | Path to the APK or AAB file |

| Option                         | Description                               |
| :----------------------------- | :---------------------------------------- |
| `--keystore <string>`          | Path to keystore file                     |
| `--keystore-password <string>` | Password for keystore file                |
| `--output <string>`            | Path to output APK or AAB file                   |
| `--build-jsbundle`             | Build JS bundle before signing            |
| `--jsbundle <string>`          | Path to JS bundle to apply before signing |
| `--no-hermes`                  | Don't use Hermes for JS bundle            |

## Platform HarmonyOS (experimental)

:::warning
HarmonyOS integration is currently experimental and not fully feature complete with iOS and Android platforms. The API and functionality may change in future releases.

Missing functionality:

- Ready to use GitHub Action
- Re-signing with `sign:harmony` command
- Running on emulator (DevEco Studio doesn't allow for emulators outside of China)

:::

### `rock build:harmony` Options

The `build:harmony` command builds your HarmonyOS app for emulators or devices, producing HAP files. It follows this build strategy:

1. Build locally if `--local` flag is set
1. Otherwise, try to use a cached build from cache (in `.rock` folder)

The build cache is populated by a local build only for now (remote cache is not supported yet).

| Option                  | Description                   |
| :---------------------- | :---------------------------- |
| `--build-mode <string>` | Build mode (debug/release)    |
| `--module <string>`     | Module to build               |
| `--product <string>`    | Product to build              |
| `--local`               | Force local build with Hvigor |

### `rock run:harmony` Options

The `run:harmony` command runs your HarmonyOS app on an emulator or device. It extends the functionality of `build:harmony` with additional runtime options.

Same as for `build:harmony` and:

| Option                   | Description                            |
| :----------------------- | :------------------------------------- |
| `--port <number>`        | Bundler port (default: 8081)           |
| `--build-mode <string>`  | Build mode (debug/release)             |
| `--product <string>`     | Product to build                       |
| `--binary-path <string>` | Path to pre-built HAP binary           |
| `--device <string>`      | Device/emulator to use (by name or ID) |
| `--local`                | Force local build with Hvigor          |
| `--ability <string>`     | Name of the ability to start           |

## Plugin Bundler

### `rock start` Options

The `start` command launches a development server (either Re.Pack or Metro, depending on your bundler plugin) that connects to your apps through port 8081 by default. It provides features like Hot Module Reloading (HMR) and error reporting.

| Option                                            | Description                                                                                 |
| :------------------------------------------------ | :------------------------------------------------------------------------------------------ |
| `--port <number>`                                 | Port to run the server on (default: 8081)                                                   |
| `--host <string>`                                 | Host to run the server on (default: "")                                                     |
| `--project-root <path>`, `--projectRoot <path>`   | Path to a custom project root                                                               |
| `--watch-folders <list>`, `--watchFolders <list>` | Specify any additional folders to be added to the watch list                                |
| `--asset-plugins <list>`, `--assetPlugins <list>` | Specify any additional asset plugins to be used by the packager by full filepath            |
| `--source-exts <list>`,`--sourceExts <list>`      | Specify any additional source extensions to be used by the packager                         |
| `--max-workers <number>`                          | Specifies the maximum number of workers the worker-pool will spawn for transforming files   |
| `--transformer <string>`                          | Specify a custom transformer to be used                                                     |
| `--reset-cache`, `--resetCache`                   | Removes cached files                                                                        |
| `--custom-log-reporter-path <string>`             | Path to a JavaScript file that exports a log reporter as a replacement for TerminalReporter |
| `--https`                                         | Enables https connections to the server                                                     |
| `--key <path>`                                    | Path to custom SSL key                                                                      |
| `--cert <path>`                                   | Path to custom SSL cert                                                                     |
| `--config <string>`                               | Path to the CLI configuration file                                                          |
| `--no-interactive`                                | Disables interactive mode                                                                   |
| `--client-logs`                                   | [Deprecated] Enable plain text JavaScript log streaming for all connected apps              |

### `rock bundle` Options

The `bundle` command creates an optimized JavaScript bundle for your application, optionally using Hermes bytecode.

| Option                                  | Description                                                                                          |
| :-------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| `--entry-file <path>`                   | Path to the root JS file, either absolute or relative to JS root                                     |
| `--platform <string>`                   | Either "ios", "android", or "harmony" (default: "ios")                                               |
| `--transformer <string>`                | Specify a custom transformer to be used                                                              |
| `--dev [boolean]`                       | If false, warnings are disabled and the bundle is minified (default: true)                           |
| `--minify [boolean]`                    | Allows overriding whether bundle is minified. Defaults to false if dev is true, true if dev is false |
| `--bundle-output <string>`              | File name where to store the resulting bundle, ex. /tmp/groups.bundle                                |
| `--bundle-encoding <string>`            | Encoding the bundle should be written in (default: "utf8")                                           |
| `--max-workers <number>`                | Specifies the maximum number of workers the worker-pool will spawn for transforming files            |
| `--sourcemap-output <string>`           | File name where to store the sourcemap file for resulting bundle, ex. /tmp/groups.map                |
| `--sourcemap-sources-root <string>`     | Path to make sourcemap's sources entries relative to, ex. /root/dir                                  |
| `--sourcemap-use-absolute-path`         | Report SourceMapURL using its full path (default: false)                                             |
| `--assets-dest <string>`                | Directory name where to store assets referenced in the bundle                                        |
| `--unstable-transform-profile <string>` | Experimental, transform JS for a specific JS engine (default: "default")                             |
| `--asset-catalog-dest [string]`         | Path where to create an iOS Asset Catalog for images                                                 |
| `--reset-cache`                         | Removes cached files (default: false)                                                                |
| `--read-global-cache`                   | Try to fetch transformed JS code from the global cache, if configured (default: false)               |
| `--config <string>`                     | Path to the CLI configuration file                                                                   |
| `--resolver-option <string...>`         | Custom resolver options of the form key=value. URL-encoded. May be specified multiple times          |
| `--config-cmd [string]`                 | [Internal] A hack for Xcode build script pointing to wrong bundle command                            |
| `--hermes`                              | Passes the output JS bundle to Hermes compiler and outputs a bytecode file                           |

## Built-in plugins

### `rock fingerprint` Options

The `fingerprint` command calculates a unique hash that represents your project's native state. This hash is used for build caching and remains stable across builds unless you modify native files, change dependencies with native code, or update scripts in package.json.

| Option                    | Description                                    |
| :------------------------ | :--------------------------------------------- |
| `-p, --platform <string>` | Select platform, e.g. ios, android, or harmony |
| `--raw`                   | Output the raw fingerprint hash for piping     |

**Arguments:**

- `[path]` - Directory to calculate fingerprint for (optional)

### `rock config` Options

The `config` command outputs the autolinking configuration from Community CLI, which is useful for debugging and understanding how dependencies are linked.

| Option                    | Description                                    |
| :------------------------ | :--------------------------------------------- |
| `-p, --platform <string>` | Select platform, e.g. ios, android, or harmony |

### `rock clean` Options

The `clean` command helps you free up disk space by removing various caches and temporary files from your React Native project. It can clean Android (Gradle), iOS (CocoaPods), Metro, Watchman, Rock's own project caches, and package manager caches.

| Option               | Description                                                                                                                                             |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--include <string>` | Comma-separated list of caches to clean. Available options: `android`, `gradle`, `cocoapods`, `metro`, `watchman`, `npm`, `yarn`, `bun`, `pnpm`, `rock` |
| `--verify-cache`     | Whether to verify the cache (currently only applies to npm cache)                                                                                       |
| `--all`              | Clean all available caches without interactive prompt                                                                                                   |

## Plugin Remote Cache

### `rock remote-cache` Actions and Options

The `remote-cache <action>` command provides utilities to interact with the remote build cache configured via your `remoteCacheProvider`. This is useful for inspecting, downloading, uploading, or deleting build artifacts stored remotely.

Available actions:

| Action              | Description                                                                       |
| :------------------ | :-------------------------------------------------------------------------------- |
| `list`              | Lists the latest artifact matching the specified criteria                         |
| `list-all`          | Lists all artifacts (optionally filtered by platform and traits)                  |
| `download`          | Downloads an artifact from remote cache to local cache                            |
| `upload`            | Uploads a binary to remote cache. Accepts `--ad-hoc` flag for Ad-Hoc distritbuion |
| `delete`            | Deletes artifacts from remote cache                                               |
| `get-provider-name` | Returns the name of the configured remote cache provider                          |

Actions have different options available:

| Option                    | Description                                                                                                                                                                        |
| :------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--json`                  | Output results in JSON format instead of human-readable format                                                                                                                     |
| `--name <string>`         | Full artifact name to operate on. Cannot be used with `--platform` or `--traits`                                                                                                   |
| `--all`                   | List or delete all matching artifacts (affects `list` and `delete` actions only)                                                                                                   |
| `--all-but-latest`        | Delete all but the latest matching artifact (affects `delete` action only)                                                                                                         |
| `-p, --platform <string>` | Platform to target (`ios`, `android`, or `harmony`). Must be used with `--traits`                                                                                                  |
| `-t, --traits <list>`     | Comma-separated traits that construct the final artifact name. For Android: variant (e.g., `debug`, `release`). For iOS: destination and configuration (e.g., `simulator,Release`) |
| `--binary-path <string>`  | Path to the binary to upload (used with `upload` action)                                                                                                                           |
| `--ad-hoc <string>`       | Upload IPA for ad-hoc distribution and installation from URL. Additionally uploads index.html and manifest.plist'                                                                  |

For example, to download remote cache for iOS simulator with Release configuration, you can use `remote-cache download` with `--name` option

```shell
npx rock remote-cache download --name rock-ios-simulator-Release-abc123fbd28298
```

or pass `--traits`, so you don't need to pass the fingerprint:

```shell
npx rock remote-cache download --platform ios --traits simulator,Release
```

#### Ad-hoc distribution

Ad-hoc distribution allows you to share your iOS app with testers without going through the App Store. Testers can install your app directly on their devices by visiting a web page and tapping "Install App".

**What is Ad-hoc distribution?**

Ad-hoc distribution is a method for sharing iOS apps with testers without going through the App Store. It requires devices to be registered in your Apple Developer account and is perfect for beta testing, internal testing, or client demos. Apps installed this way will appear on the device's home screen just like any other app.

**How it works:**

1. Build your app with a valid provisioning profile that includes your testers' devices
   ```shell
   npx rock build:ios --archive # ...other required flags
   ```
2. Use `upload --ad-hoc` to upload the app for ad-hoc distribution
   ```shell
   npx rock remote-cache upload --ad-hoc --platform ios --traits device,Release
   ```
3. Share the generated URL with your testers
4. Testers visit the URL and tap "Install App" to install directly on their device

The command creates a special folder structure that includes:

- Your signed IPA file
- An HTML page for easy installation (you need to configure your provider to **make this file publicly available**)
- A manifest file that iOS uses to install the app

The folder will be available at `ad-hoc/` directory of your configured remote cache provider.
