import { Platform } from 'react-native';
import {
  syncUser,
  fetchPlans,
  checkTrialExpiry,
  trackStartup,
  trackInstall,
  trackUpdate,
  type Plan,
} from './api';
import { AppStorage } from './storage';

const APP_VERSION = '1.0.0';
const platform = Platform.OS === 'android' ? 'mobile-android' : 'mobile-ios';

export interface StartupResult {
  planName: string;
  trChars: number;
  favourites: Record<string, string>;
  mastered: Record<string, string>;
  language: string;
  searchedWords: string[];
  plan: Plan | null;
  trialDaysLeft: number | null;
}

/**
 * Runs on every app open when user is logged in.
 * Syncs server → local state, fetches plan limits and trial info.
 * Per spec §7: PUT /users/update → GET /plans → GET /trial_expiry → POST /startups
 */
export const runStartupSync = async (email: string): Promise<StartupResult> => {
  // Track startup (fire-and-forget)
  trackStartup(email);

  // Track first install
  if (!AppStorage.getInstallDate()) {
    AppStorage.setInstallDate(new Date().toISOString());
    AppStorage.setInstallVersion(APP_VERSION);
    trackInstall(email, APP_VERSION, Platform.OS === 'android' ? 'Android' : 'iOS');
  }

  // Track version updates
  const savedVersion = AppStorage.getInstallVersion();
  if (savedVersion && savedVersion !== APP_VERSION) {
    AppStorage.setInstallVersion(APP_VERSION);
    AppStorage.setLastUpdateDate(new Date().toISOString());
    trackUpdate(email, APP_VERSION);
  }

  // Sync user data with server — merge server state into local
  const syncRes = await syncUser(email, {
    open_count: 1,
  });

  let planName = AppStorage.getPlanName();
  let trChars = AppStorage.getTranslationChars();
  let favourites = AppStorage.getFavourites();
  let mastered = AppStorage.getMastered();
  let language = AppStorage.getLang();
  let searchedWords = AppStorage.getSearchedWords();

  if (syncRes.status) {
    const d = syncRes.data;
    planName = d.plan_name ?? planName;
    trChars = d.tr_chars ?? trChars;
    language = d.language ?? language;

    try {
      favourites = JSON.parse(d.favourites ?? '{}');
    } catch { /* keep local */ }

    try {
      mastered = JSON.parse(d.mastered ?? '{}');
    } catch { /* keep local */ }

    try {
      searchedWords = JSON.parse(d.words ?? '[]');
    } catch { /* keep local */ }

    // Persist merged state
    AppStorage.setPlanName(planName);
    AppStorage.setTranslationChars(trChars);
    AppStorage.setLang(language);
    AppStorage.setFavourites(favourites);
    AppStorage.setMastered(mastered);
    AppStorage.setSearchedWords(searchedWords);
  }

  // Fetch plan limits
  let plan: Plan | null = null;
  try {
    const plans = await fetchPlans();
    AppStorage.setPlans(plans);
    plan = plans.find((p: Plan) => p.name === planName) ?? plans[0] ?? null;
  } catch { /* use cached */ }

  // Fetch trial expiry
  let trialDaysLeft: number | null = null;
  try {
    const trialRes = await checkTrialExpiry(email);
    trialDaysLeft = trialRes.days;
  } catch { /* non-critical */ }

  return { planName, trChars, favourites, mastered, language, searchedWords, plan, trialDaysLeft };
};
