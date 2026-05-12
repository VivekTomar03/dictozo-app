import axios from 'axios';
import { Platform } from 'react-native';

const BASE_URL = 'https://dictozo.com';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://dictozo.com/',
    'Cookie': '_ga=GA1.1.1388226149.1758537788; _ga_YLFH1QCCZZ=GS2.1.s1778161892$o72$g1$t1778162236$j60$l0$h0; _dd_s=logs=1&id=1e17ed6d-5b61-4e96-8e6b-64d4eac9f81f&created=1778161895656&expire=1778163137616; _dictozo_rails7_session=PjLbjYxRwnIz%2Ftr003CmUCkrxpSoPa7stLpD7KYTo78fJzdSw%2FAq680Wu06u2%2Bdz9dmHCk3nufRFGrn0xMlGsfqYVfpcE%2FOrWA0NnodKheWJJHA6QP4pNQp2I9vfvPw8yTOMLUS8NhJNt2COIHXZCpujBcLM3rqIyN7%2B2ZKZhDFt1R2McOaqWed4akQ9Mp94QByKDZSGnlWVLxbbJYTtjiYy5nXshisaysVz5owhjrJLRwPnpWfiWhvIItvg8W2PLECc6AgmUmnQ25V%2BYfciDGBn7j8mixEdOus5TIHBNHOuGWjm0JSR3kAhOdOpYwWhHWXa8OU0rVuHog8XoQajKLoJWB4sWGs%3D--5gx1SzbbNWAX51%2FV--NBpG%2BMP9mtKRfPg%2BKyxStw%3D%3D',
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WordDefinition {
  partOfSpeech: string;
  definition: string;
  examples: string[];
}

export interface TranslationResult {
  translatedText: string;
  detectedSourceLanguage: string;
}

export interface UserData {
  plan_name: 'free' | 'pro' | 'premium';
  tr_chars: number;
  favourites: string;
  words: string;
  mastered: string;
  language: string;
  trial_expiry: string;
  updated_at: string;
}

export interface SyncResponse {
  status: boolean;
  reinstalled: boolean;
  data: UserData;
}

export interface Plan {
  name: string;
  _sa: number;
  _tr: number;
}

// ─── 4.1 Word Definitions ─────────────────────────────────────────────────────

export const getWordDefinitions = async (word: string): Promise<WordDefinition[]> => {
  console.log('[API] getWordDefinitions for:', word);
  const res = await client.get(`/getwords?word=${encodeURIComponent(word.trim())}`);
  console.log('[API] getWordDefinitions response:', res.data);
  // Extract results from wrapped response: { status: true, data: { results: [...] } }
  return res.data?.data?.results ?? [];
};

// ─── 4.2 Translation ─────────────────────────────────────────────────────────

export const getTranslation = async (
  word: string,
  targetLang: string,
): Promise<TranslationResult> => {
  console.log('[API] getTranslation for:', word, 'to:', targetLang);
  const res = await client.get(
    `/translation?q=${encodeURIComponent(word.trim())}&target=${targetLang}`,
  );
  console.log('[API] getTranslation response:', res.data);
  // Extract first result from wrapped response: { status: true, data: [{ ... }] }
  return res.data?.data?.[0];
};

// ─── 4.3 Sync User Data ───────────────────────────────────────────────────────

export const syncUser = async (
  email: string,
  userData: {
    language?: string;
    favourites?: string;
    mastered?: string;
    words?: string;
    open_count?: number;
  },
): Promise<SyncResponse> => {
  const res = await client.put('/users/update', { email, user: userData });
  // console.log('[API] syncUser response:', res.data);
  return res.data;
};

// ─── 4.4 Get User Data ───────────────────────────────────────────────────────

export const getUser = async (email: string): Promise<SyncResponse> => {
  const { AppStorage } = await import('./storage');
  return syncUser(email, {
    language: AppStorage.getLang(),
    favourites: JSON.stringify(AppStorage.getFavourites()),
    mastered: JSON.stringify(AppStorage.getMastered()),
    words: JSON.stringify(AppStorage.getSearchedWords()),
  });
};

// 4.4 Save Word logic
export const saveWordToServer = async (email: string, entry: string, word: string): Promise<SyncResponse> => {
  const { AppStorage } = await import('./storage');
  const favs = AppStorage.getFavourites();
  favs[word.toUpperCase()] = entry;
  // Sync to server
  return syncUser(email, { favourites: JSON.stringify(favs) });
};

// ─── 4.5 Send OTP ─────────────────────────────────────────────────────────────

export const sendOTP = async (email: string, code: string): Promise<void> => {
  const body = `to=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`;
  await client.post('/confirmation', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
};

// ─── 4.6 Delete Specific Words ────────────────────────────────────────────────

export const deleteWords = async (email: string, words: string[]): Promise<void> => {
  await client.post('/delete_words', { email, data: words });
};

// ─── 4.7 Delete All Words ─────────────────────────────────────────────────────

export const deleteAllWords = async (email: string): Promise<void> => {
  await client.post('/delete_all', { email });
};

// 4.8 Mastered words are now synced via syncUser (PUT /users/update)


// ─── 4.9 Delete All Mastered ─────────────────────────────────────────────────

export const deleteAllMastered = async (email: string): Promise<void> => {
  await client.post('/deletemastered', { email });
};

// ─── 4.10 Trial Expiry ────────────────────────────────────────────────────────

export const checkTrialExpiry = async (email: string): Promise<{ days: number }> => {
  const res = await client.get(`/trial_expiry?email=${encodeURIComponent(email)}`);
  return res.data;
};

// ─── 4.11 Plans ───────────────────────────────────────────────────────────────

export const fetchPlans = async (): Promise<Plan[]> => {
  const res = await client.get('/plans');
  return res.data;
};

// ─── 4.14 Remote Logs ────────────────────────────────────────────────────────

export const getRemoteLogs = async (email: string) => {
  const res = await client.post('/get_remote_logs', { email });
  return res.data;
};

// ─── 4.15 Shorten URL ────────────────────────────────────────────────────────

export const shortenUrl = async (url: string): Promise<{ shortUrl: string }> => {
  const res = await client.post('/shorten', { url });
  return res.data;
};

// ─── Lifecycle & Analytics (fire-and-forget, never throw) ─────────────────────

const platform = Platform.OS === 'android' ? 'mobile-android' : 'mobile-ios';

export const logError = (email: string, error: string, version: string) =>
  client.post('/errors', { email, error, platform, version }).catch(() => { });

export const trackAnalytics = (email: string, event: string, data?: object) =>
  client.post('/analytics', { email, event, data }).catch(() => { });

export const trackInstall = (email: string, version: string, os: string) =>
  client.post('/installs', { email, platform, version, os }).catch(() => { });

export const trackUpdate = (email: string, version: string) =>
  client.post('/updates', { email, version, platform }).catch(() => { });

export const trackStartup = (email: string) =>
  client.post('/startups', { email, platform }).catch(() => { });

export const trackEvent = (email: string, name: string, data?: object) =>
  client.post('/events', { email, name, data }).catch(() => { });
