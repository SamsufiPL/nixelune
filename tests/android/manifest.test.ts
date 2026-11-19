import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import capacitorConfig from '../../capacitor.config';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string): string => readFileSync(resolve(root, path), 'utf8');

const manifest = read('android/app/src/main/AndroidManifest.xml');
const appGradle = read('android/app/build.gradle');
const rootGradle = read('android/build.gradle');
const variables = read('android/variables.gradle');
const styles = read('android/app/src/main/res/values/styles.xml');

interface Tag {
  readonly name: string;
  readonly attrs: Readonly<Record<string, string>>;
}

/** Opening tags of the manifest, comments stripped. Enough for a flat, hand-written file. */
function tags(xml: string): Tag[] {
  const withoutComments = xml.replace(/<!--[\s\S]*?-->/g, '');
  const result: Tag[] = [];
  for (const match of withoutComments.matchAll(/<([a-zA-Z][\w-]*)((?:\s+[\w:.-]+="[^"]*")*)\s*\/?>/g)) {
    const attrs: Record<string, string> = {};
    for (const attr of (match[2] ?? '').matchAll(/([\w:.-]+)="([^"]*)"/g)) {
      attrs[attr[1] as string] = attr[2] as string;
    }
    result.push({ name: match[1] as string, attrs });
  }
  return result;
}

const all = tags(manifest);
const byName = (name: string): Tag[] => all.filter((tag) => tag.name === name);
const application = byName('application')[0];

describe('AndroidManifest permissions', () => {
  it('requests exactly VIBRATE', () => {
    const requested = all
      .filter((tag) => tag.name.startsWith('uses-permission') && tag.attrs['tools:node'] !== 'remove')
      .map((tag) => tag.attrs['android:name']);
    expect(requested).toEqual(['android.permission.VIBRATE']);
  });

  it('strips INTERNET from the merged manifest and nothing else', () => {
    const removed = all
      .filter((tag) => tag.attrs['tools:node'] === 'remove')
      .map((tag) => `${tag.name} ${tag.attrs['android:name']}`);
    expect(removed).toEqual(['uses-permission android.permission.INTERNET']);
  });

  it('declares no custom permissions, features or queries', () => {
    for (const name of ['permission', 'uses-feature', 'queries', 'uses-permission-sdk-23']) {
      expect(byName(name), name).toEqual([]);
    }
  });
});

describe('AndroidManifest components', () => {
  it('has one activity, the exported launcher', () => {
    const activities = [...byName('activity'), ...byName('activity-alias')];
    expect(activities.map((a) => [a.attrs['android:name'], a.attrs['android:exported']])).toEqual([
      ['.MainActivity', 'true'],
    ]);
  });

  it('declares no services, receivers or providers', () => {
    for (const name of ['service', 'receiver', 'provider']) {
      expect(byName(name), name).toEqual([]);
    }
  });

  it('launches only from the launcher: one MAIN/LAUNCHER filter, no deep links', () => {
    expect(byName('intent-filter')).toHaveLength(1);
    expect(byName('action').map((t) => t.attrs['android:name'])).toEqual(['android.intent.action.MAIN']);
    expect(byName('category').map((t) => t.attrs['android:name'])).toEqual(['android.intent.category.LAUNCHER']);
    expect(byName('data')).toEqual([]);
  });

  it('allows portrait and landscape', () => {
    expect(byName('activity')[0]?.attrs['android:screenOrientation']).toBeUndefined();
  });
});

describe('application flags', () => {
  it('never sets debug or cleartext flags in the manifest', () => {
    expect(application?.attrs['android:debuggable']).toBeUndefined();
    expect(application?.attrs['android:testOnly']).toBeUndefined();
    expect(application?.attrs['android:usesCleartextTraffic']).toBe('false');
    expect(application?.attrs['android:networkSecurityConfig']).toBeUndefined();
  });

  it('backs up only the progress store', () => {
    expect(application?.attrs['android:allowBackup']).toBe('true');
    expect(application?.attrs['android:fullBackupContent']).toBe('@xml/backup_rules');
    expect(application?.attrs['android:dataExtractionRules']).toBe('@xml/data_extraction_rules');
    for (const file of ['backup_rules.xml', 'data_extraction_rules.xml']) {
      const rules = tags(read(`android/app/src/main/res/xml/${file}`));
      const includes = rules.filter((tag) => tag.name === 'include');
      expect(includes.length, file).toBeGreaterThan(0);
      for (const include of includes) {
        expect(include.attrs, file).toEqual({ domain: 'sharedpref', path: 'CapacitorStorage.xml' });
      }
    }
  });

  it('uses the ink window background and splash so there is no white flash', () => {
    expect(read('android/app/src/main/res/values/colors.xml')).toContain('<color name="ink">#0E1522</color>');
    expect(styles).toContain('<item name="android:windowBackground">@color/ink</item>');
    expect(styles).toContain('<item name="windowSplashScreenBackground">@color/ink</item>');
    expect(capacitorConfig.backgroundColor).toBe('#0E1522');
  });
});

describe('Gradle configuration', () => {
  it('targets SDK 36 with the Capacitor 8 minimum', () => {
    expect(variables).toMatch(/minSdkVersion = 24\b/);
    expect(variables).toMatch(/compileSdkVersion = 36\b/);
    expect(variables).toMatch(/targetSdkVersion = 36\b/);
  });

  it('shrinks and obfuscates the release build', () => {
    const release = appGradle.slice(appGradle.indexOf('release {', appGradle.indexOf('buildTypes {')));
    expect(release).toMatch(/minifyEnabled true/);
    expect(release).toMatch(/shrinkResources true/);
    expect(release).toMatch(/debuggable false/);
    expect(release).toMatch(/jniDebuggable false/);
    expect(release).toContain("getDefaultProguardFile('proguard-android-optimize.txt')");
    expect(appGradle).not.toMatch(/debuggable true/);
  });

  it('signs releases only with an explicit key and fails without one', () => {
    expect(appGradle).not.toMatch(/signingConfigs\.debug/);
    expect(appGradle).toContain('throw new GradleException');
    expect(appGradle).toContain('Release builds never fall back to the debug key');
    for (const name of ['NIXELUNE_KEYSTORE_FILE', 'NIXELUNE_KEYSTORE_PASSWORD', 'NIXELUNE_KEY_ALIAS', 'NIXELUNE_KEY_PASSWORD']) {
      expect(appGradle).toContain(name);
    }
    // No literal credentials in the build file.
    expect(appGradle).not.toMatch(/(storePassword|keyPassword)\s+['"]/);
  });

  it('keeps signing material out of git', () => {
    const ignore = read('android/.gitignore').split('\n');
    for (const pattern of ['*.jks', '*.keystore', 'keystore.properties']) {
      expect(ignore).toContain(pattern);
    }
    expect(existsSync(resolve(root, 'android/keystore.properties'))).toBe(false);
  });

  it('pulls in no Google services or network SDK plugins', () => {
    expect(rootGradle).not.toContain('google-services');
    expect(appGradle).not.toContain('google-services');
    expect(appGradle).not.toMatch(/firebase|play-services|crashlytics/i);
  });
});

describe('Capacitor configuration', () => {
  it('matches the Android application id and serves the Vite build', () => {
    expect(capacitorConfig.appId).toBe('com.nixelune.game');
    expect(appGradle).toContain('applicationId "com.nixelune.game"');
    expect(capacitorConfig.appName).toBe('NIXELUNE');
    expect(capacitorConfig.webDir).toBe('dist');
  });

  it('leaves WebView debugging to the build type and loads nothing remote', () => {
    expect(capacitorConfig.android?.webContentsDebuggingEnabled).toBeUndefined();
    expect(capacitorConfig.server).toBeUndefined();
    expect(capacitorConfig.android?.allowMixedContent).toBe(false);
  });
});
