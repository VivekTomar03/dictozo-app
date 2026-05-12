import { create } from 'zustand';
import { AppStorage } from '../services/storage';
import type { Plan } from '../services/api';

export type Screen = 'Splash' | 'Onboarding' | 'Auth' | 'Main';
export type AuthStep = 'Email' | 'OTP';
export type Tab = 'Home' | 'Saved' | 'Mastered' | 'Profile';

interface AppState {
  // ─── Navigation ────────────────────────────────────────────────────────────
  currentScreen: Screen;
  authStep: AuthStep;
  activeTab: Tab;

  // ─── User ──────────────────────────────────────────────────────────────────
  email: string;
  planName: string;
  plan: Plan | null;
  trChars: number;
  favourites: Record<string, string>;
  mastered: Record<string, string>;
  language: string;
  trialDaysLeft: number | null;
  searchedWords: string[];

  // ─── Navigation Actions ────────────────────────────────────────────────────
  navigateTo: (screen: Screen) => void;
  setAuthStep: (step: AuthStep) => void;
  setActiveTab: (tab: Tab) => void;

  // ─── User Actions ──────────────────────────────────────────────────────────
  login: (params: {
    email: string;
    planName: string;
    trChars: number;
    favourites: Record<string, string>;
    mastered: Record<string, string>;
    language: string;
    searchedWords: string[];
  }) => void;

  setPlan: (plan: Plan) => void;
  setPlanName: (name: string) => void;
  setFavourites: (favs: Record<string, string>) => void;
  setMastered: (words: Record<string, string>) => void;
  setTrChars: (n: number) => void;
  setLanguage: (lang: string) => void;
  setTrialDaysLeft: (days: number | null) => void;

  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  // ─── Initial State ─────────────────────────────────────────────────────────
  currentScreen: 'Splash',
  authStep: 'Email',
  activeTab: 'Home',

  email: '',
  planName: 'free',
  plan: null,
  trChars: 500,
  favourites: {},
  mastered: {},
  language: 'hi',
  trialDaysLeft: null,
  searchedWords: [],

  // ─── Navigation ────────────────────────────────────────────────────────────
  navigateTo: (screen) => set({ currentScreen: screen }),
  setAuthStep: (step) => set({ authStep: step }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  // ─── User ──────────────────────────────────────────────────────────────────
  login: ({ email, planName, trChars, favourites, mastered, language, searchedWords }) => {
    try {
      const safeEmail = email || '';
      const safePlanName = planName || 'free';
      const safeTrChars = trChars || 500;
      const safeFavourites = favourites || {};
      const safeMastered = mastered || {};
      const safeLanguage = language || 'hi';
      const safeSearchedWords = Array.isArray(searchedWords) ? searchedWords : [];

      AppStorage.setVerified(true);
      AppStorage.setEmail(safeEmail);
      AppStorage.setPlanName(safePlanName);
      AppStorage.setTranslationChars(safeTrChars);
      AppStorage.setFavourites(safeFavourites);
      AppStorage.setMastered(safeMastered);
      AppStorage.setLang(safeLanguage);
      AppStorage.setSearchedWords(safeSearchedWords);
      
      // Sync favourites to SQLite for Accessibility Service
      import('../services/db').then(async ({ saveWord }) => {
        for (const [word, dataStr] of Object.entries(safeFavourites)) {
          try {
            const entry = JSON.parse(dataStr as string);
            const definition = entry.data?.[0]?.definition || entry.data?.[0]?.translatedText || '';
            await saveWord(word, definition);
          } catch (e) {
            // Silently skip if fails
          }
        }
      }).catch(() => {});

      set({ 
        email: safeEmail, 
        planName: safePlanName, 
        trChars: safeTrChars, 
        favourites: safeFavourites, 
        mastered: safeMastered, 
        language: safeLanguage, 
        searchedWords: safeSearchedWords 
      });
    } catch (e) {
      console.error('Login error:', e);
      set({ email: email || '', planName: planName || 'free', trChars: trChars || 500, favourites: favourites || {}, mastered: mastered || {}, language: language || 'hi', searchedWords: [] });
    }
  },

  setPlan: (plan) => set({ plan }),
  setPlanName: (name) => {
    AppStorage.setPlanName(name);
    set({ planName: name });
  },

  setFavourites: (favs) => {
    AppStorage.setFavourites(favs);
    set({ favourites: favs });
  },
  
  setMastered: (words) => {
    AppStorage.setMastered(words);
    set({ mastered: words });
  },

  setTrChars: (n) => {
    AppStorage.setTranslationChars(n);
    set({ trChars: n });
  },

  setLanguage: (lang) => {
    AppStorage.setLang(lang);
    set({ language: lang });
  },

  setTrialDaysLeft: (days) => set({ trialDaysLeft: days }),

  setSearchedWords: (words: string[]) => {
    if (!Array.isArray(words)) return;
    AppStorage.setSearchedWords(words);
    set({ searchedWords: words });
  },

  addSearchedWord: (word: string) => {
    const current = AppStorage.getSearchedWords().filter(w => w !== word);
    const next = [word, ...current].slice(0, 50);
    AppStorage.setSearchedWords(next);
    set({ searchedWords: next });
  },

  logout: () => {
    AppStorage.clearSession();
    set({
      currentScreen: 'Auth',
      authStep: 'Email',
      activeTab: 'Home',
      email: '',
      planName: 'free',
      plan: null,
      trChars: 500,
      favourites: {},
      mastered: {},
      language: 'hi',
      trialDaysLeft: null,
    });
  },
}));
