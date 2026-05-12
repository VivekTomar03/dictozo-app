import { MMKV } from 'react-native-mmkv';
import { NativeModules } from 'react-native';

const { DictozoModule } = NativeModules;

let _storage: MMKV | null = null;

const getStorage = () => {
  if (!_storage) {
    try {
      _storage = new MMKV();
    } catch (e) {
      console.error('Failed to initialize MMKV:', e);
      // Fallback mock to prevent crashes
      return {
        getString: () => null,
        set: () => {},
        delete: () => {},
      } as any;
    }
  }
  return _storage;
};

export const AppStorage = {
  // ─── Auth ──────────────────────────────────────────────────────────────────
  isVerified: () => getStorage()?.getString('verified') === '1',
  setVerified: (v: boolean) => {
    getStorage()?.set('verified', v ? '1' : '0');
    if (DictozoModule?.setLoginStatus) {
      DictozoModule.setLoginStatus(v);
    }
  },

  getEmail: () => getStorage()?.getString('user_email') ?? '',
  setEmail: (email: string) => getStorage()?.set('user_email', email),

  getPlanName: () => getStorage()?.getString('_u') ?? 'free',
  setPlanName: (plan: string) => getStorage()?.set('_u', plan),

  getTranslationChars: () => parseInt(getStorage()?.getString('char') ?? '500', 10),
  setTranslationChars: (n: number) => getStorage()?.set('char', String(n)),

  getLang: () => getStorage()?.getString('local-lang') ?? 'hi',
  setLang: (lang: string) => getStorage()?.set('local-lang', lang),

  // ─── Temp (OTP flow only — cleared after login) ───────────────────────────
  getOtp: () => getStorage()?.getString('otp') ?? '',
  setOtp: (encoded: string) => getStorage()?.set('otp', encoded),
  clearOtp: () => getStorage()?.delete('otp'),

  getTempEmail: () => getStorage()?.getString('tempEmail') ?? '',
  setTempEmail: (email: string) => getStorage()?.set('tempEmail', email),
  clearTempEmail: () => getStorage()?.delete('tempEmail'),

  // ─── Favourites ────────────────────────────────────────────────────────────
  getFavourites: (): Record<string, string> => {
    try {
      return JSON.parse(getStorage()?.getString('favourites') ?? '{}');
    } catch {
      return {};
    }
  },
  setFavourites: (favs: Record<string, string>) =>
    getStorage()?.set('favourites', JSON.stringify(favs)),

  // ─── Mastered Words ────────────────────────────────────────────────────────
  getMastered: (): Record<string, string> => {
    try {
      return JSON.parse(getStorage()?.getString('mastered') ?? '{}');
    } catch {
      return {};
    }
  },
  setMastered: (words: Record<string, string>) =>
    getStorage()?.set('mastered', JSON.stringify(words)),

  // ─── Recent Searches ───────────────────────────────────────────────────────
  getSearchedWords: (): string[] => {
    try {
      return JSON.parse(getStorage()?.getString('searchedWords') ?? '[]');
    } catch {
      return [];
    }
  },
  setSearchedWords: (words: string[]) => {
    if (!Array.isArray(words)) return;
    getStorage()?.set('searchedWords', JSON.stringify(words.slice(0, 50)));
  },

  addSearchedWord: (word: string) => {
    const current = AppStorage.getSearchedWords().filter(w => w !== word);
    AppStorage.setSearchedWords([word, ...current]);
  },

  // ─── Plans ─────────────────────────────────────────────────────────────────
  getPlans: () => {
    try {
      return JSON.parse(getStorage()?.getString('plans') ?? '[]');
    } catch {
      return [];
    }
  },
  setPlans: (plans: object[]) => getStorage()?.set('plans', JSON.stringify(plans)),

  // ─── Onboarding ────────────────────────────────────────────────────────────
  isOnboardingDone: () => getStorage()?.getString('instructions_understood') === 'true',
  setOnboardingDone: () => getStorage()?.set('instructions_understood', 'true'),

  // ─── Install / Update Tracking ─────────────────────────────────────────────
  getInstallDate: () => getStorage()?.getString('installDate') ?? '',
  setInstallDate: (d: string) => getStorage()?.set('installDate', d),

  getInstallVersion: () => getStorage()?.getString('installVersion') ?? '',
  setInstallVersion: (v: string) => getStorage()?.set('installVersion', v),

  getLastUpdateDate: () => getStorage()?.getString('lastUpdateDate') ?? '',
  setLastUpdateDate: (d: string) => getStorage()?.set('lastUpdateDate', d),

  // ─── Logout ────────────────────────────────────────────────────────────────
  clearSession: () => {
    const s = getStorage();
    if (!s) return;
    s.clearAll();
    if (DictozoModule?.setLoginStatus) {
      DictozoModule.setLoginStatus(false);
    }
    if (DictozoModule?.clearLocalDatabase) {
      DictozoModule.clearLocalDatabase();
    }
  },
};
