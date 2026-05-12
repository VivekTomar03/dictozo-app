import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  NativeModules,
  useColorScheme,
  Alert,
} from 'react-native';
import { EmailScreen } from './src/screens/auth/EmailScreen';
import { OtpScreen } from './src/screens/auth/OtpScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SavedWordsScreen } from './src/screens/SavedWordsScreen';
import { MasteredScreen } from './src/screens/MasteredScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { Skeleton } from './src/components/Skeleton';
import { getCachedDefinition, cacheDefinition, saveWord, initDB } from './src/services/db';
import { getWordDefinitions } from './src/services/api';
import { AppStorage } from './src/services/storage';
import { rf, rs } from './src/utils/responsive';
import { runStartupSync } from './src/services/startup';
import { useStore, Tab } from './src/store/useStore';
import { SearchIcon, BookIcon, CheckIcon, UserIcon } from './src/components/Icons';

const { DictozoModule } = NativeModules;

const theme = {
  primary: '#2EBA72',
  primaryLight: '#E8F7F0',
  textDark: '#1A1A1A',
  textMuted: '#6B7280',
  surface: '#FFFFFF',
  background: '#F9FAFB',
  border: '#E5E7EB',
};

type AppProps = {
  processText?: string;
};

// ─── Auth Navigator ────────────────────────────────────────────────────────────

const AuthNavigator = () => {
  const authStep = useStore(s => s.authStep);
  return authStep === 'OTP' ? <OtpScreen /> : <EmailScreen />;
};

// ─── Main Tab Navigator ────────────────────────────────────────────────────────

const MainNavigator = () => {
  const activeTab = useStore(s => s.activeTab);
  const setActiveTab = useStore(s => s.setActiveTab);

  const renderContent = () => {
    switch (activeTab) {
      case 'Home': return <HomeScreen />;
      case 'Saved': return <SavedWordsScreen />;
      case 'Mastered': return <MasteredScreen />;
      case 'Profile': return <ProfileScreen />;
      default: return <HomeScreen />;
    }
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'Home', label: 'Home', icon: SearchIcon },
    { key: 'Saved', label: 'Saved', icon: BookIcon },
    { key: 'Mastered', label: 'Done', icon: CheckIcon },
    { key: 'Profile', label: 'User', icon: UserIcon },
  ];

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>{renderContent()}</View>
      <View style={styles.tabBar}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}>
              <View style={styles.iconContainer}>
                <Icon
                  size={26}
                  color={isActive ? theme.primary : theme.textMuted}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ─── Root Navigator ────────────────────────────────────────────────────────────

const RootNavigator = () => {
  const currentScreen = useStore(s => s.currentScreen);

  if (currentScreen === 'Splash') {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashLogo}>DICTOZO</Text>
        <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (currentScreen === 'Onboarding') return <OnboardingScreen />;
  if (currentScreen === 'Auth') return <AuthNavigator />;
  return <MainNavigator />;
};

// ─── Popup (PROCESS_TEXT mode) ────────────────────────────────────────────────

const PopupApp = ({ processText }: { processText: string }) => {
  const [definition, setDefinition] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const email = AppStorage.getEmail();

  useEffect(() => {
    const load = async () => {
      try {
        // Start DB and check saved status in parallel
        initDB().then(() => {
          const wordKey = processText.toUpperCase();
          if (AppStorage.getFavourites()[wordKey]) {
            setSaved(true);
          }
        });

        // 1. Check SQLite offline cache first
        const cached = await getCachedDefinition(processText);
        if (cached) {
          setDefinition(cached);
          setLoading(false);
          return;
        }
        // 2. Call dictozo.com/getwords — no third-party dictionary APIs
        const results = await getWordDefinitions(processText);
        const meaning = results?.[0]?.definition ?? 'No definition found.';
        setDefinition(meaning);
        await cacheDefinition(processText, meaning);
      } catch {
        setDefinition('Could not fetch definition. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [processText]);

  const handleClose = () => {
    // Use finishActivity() instead of exitApp() — returns to the previous app
    if (DictozoModule?.finishActivity) {
      DictozoModule.finishActivity();
    } else {
      BackHandler.exitApp();
    }
  };

  const handleSave = async () => {
    if (!processText || !definition || saved || saving) return;

    // Check login
    if (!email) {
      Alert.alert(
        'Login Required',
        'Please open the Dictozo app and login to save words and sync them across your devices.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSaving(true);
    try {
      // Save to local SQLite (for accessibility service)
      await saveWord(processText, definition);
      // Save to server if logged in
      if (email) {
        const entry = JSON.stringify({
          data: [{ partOfSpeech: 'word', definition, examples: [] }],
          url: 'mobile',
          savedAt: new Date().toISOString(),
        });
        const { saveWordToServer } = await import('./src/services/api');
        await saveWordToServer(email, entry, processText);

        // Update local favourites in storage immediately
        const favs = AppStorage.getFavourites();
        favs[processText.toUpperCase()] = entry;
        AppStorage.setFavourites(favs);
      }
      setSaved(true);
      setTimeout(handleClose, 800);
    } catch {
      // Don't close immediately on error, just let user try again or close manually
      Alert.alert('Error', 'Failed to save word');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.popupContainer}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose} />
      <View style={styles.popupContent}>
        <View style={styles.popupHeader}>
          <Text style={styles.popupLogo}>DICTOZO</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.popupWord}>{processText}</Text>

        {loading ? (
          <View style={{ paddingVertical: 16, gap: 10 }}>
            <Skeleton width="100%" height={20} />
            <Skeleton width="90%" height={20} />
            <Skeleton width="40%" height={20} />
            <View style={{ marginTop: 20 }}>
              <Skeleton width="100%" height={50} borderRadius={12} />
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.definitionBox}>
              <Text style={styles.popupDefinition}>{definition}</Text>
            </View>
            <TouchableOpacity
              style={[styles.saveButton, (saved || saving) && styles.saveButtonDone]}
              onPress={handleSave}
              disabled={saved || saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>{saved ? 'Saved ✓' : 'Save Word'}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

// ─── App Root ─────────────────────────────────────────────────────────────────

function App({ processText }: AppProps): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const isPopupMode = !!processText;

  const navigateTo = useStore(s => s.navigateTo);
  const login = useStore(s => s.login);
  const setPlan = useStore(s => s.setPlan);
  const setTrChars = useStore(s => s.setTrChars);
  const setFavourites = useStore(s => s.setFavourites);
  const setLanguage = useStore(s => s.setLanguage);
  const setTrialDaysLeft = useStore(s => s.setTrialDaysLeft);

  // Handle back button in popup mode — return to previous app
  useEffect(() => {
    if (!isPopupMode) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (DictozoModule?.finishActivity) {
        DictozoModule.finishActivity();
      } else {
        BackHandler.exitApp();
      }
      return true;
    });
    return () => handler.remove();
  }, [isPopupMode]);

  // Bootstrap: check session and run startup sync
  useEffect(() => {
    if (isPopupMode) return;

    const bootstrap = async () => {
      console.log('[Bootstrap] Starting...');
      const isVerified = AppStorage.isVerified();
      const email = AppStorage.getEmail();
      console.log('[Bootstrap] User:', email, 'Verified:', isVerified);

      if (!isVerified || !email) {
        console.log('[Bootstrap] Redirecting to Auth');
        if (DictozoModule?.setLoginStatus) {
          DictozoModule.setLoginStatus(false);
        }
        navigateTo('Auth');
        return;
      }

      // Restore native sync
      if (DictozoModule?.setLoginStatus) {
        DictozoModule.setLoginStatus(true);
      }

      // Restore local session immediately (so UI shows fast)
      console.log('[Bootstrap] Restoring local session...');
      login({
        email,
        planName: AppStorage.getPlanName(),
        trChars: AppStorage.getTranslationChars(),
        favourites: AppStorage.getFavourites(),
        mastered: AppStorage.getMastered(),
        language: AppStorage.getLang(),
        searchedWords: AppStorage.getSearchedWords(),
      });

      console.log('[Bootstrap] Navigating to Main');
      navigateTo('Main');

      // Run server sync in background — updates state when done
      try {
        console.log('[Bootstrap] Starting background sync...');
        const result = await runStartupSync(email);
        console.log('[Bootstrap] Sync complete, updating state...');
        login({
          email,
          planName: result.planName,
          trChars: result.trChars,
          favourites: result.favourites,
          mastered: result.mastered,
          language: result.language,
          searchedWords: result.searchedWords,
        });
        if (result.plan) setPlan(result.plan);
        setTrialDaysLeft(result.trialDaysLeft);
      } catch { /* non-critical — local state is already shown */ }
    };

    const isFirstTime = !AppStorage.isOnboardingDone();
    if (isFirstTime) {
      navigateTo('Onboarding');
    } else {
      bootstrap();
    }
  }, []);

  return (
    <>
      <StatusBar
        barStyle={isDarkMode && !isPopupMode ? 'light-content' : 'dark-content'}
        backgroundColor={isPopupMode ? 'transparent' : theme.background}
        translucent={isPopupMode}
      />
      {isPopupMode ? <PopupApp processText={processText!} /> : <RootNavigator />}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  splashLogo: {
    fontSize: rf(36),
    fontWeight: '900',
    color: theme.primary,
    letterSpacing: 2,
  },
  tabBar: {
    flexDirection: 'row',
    height: rs(72),
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingBottom: rs(5),
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: rf(13),
    color: theme.textMuted,
    fontWeight: '700',
    marginTop: rs(2),
  },
  tabLabelActive: {
    color: theme.primary,
  },
  iconContainer: {
    height: rs(30),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rs(4)
  },
  popupContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  popupContent: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: rs(24),
    borderTopRightRadius: rs(24),
    padding: rs(24),
    paddingBottom: rs(40),
    minHeight: rs(300),
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: rs(16),
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rs(20),
  },
  popupLogo: {
    fontSize: rf(18),
    fontWeight: '900',
    color: theme.primary,
    letterSpacing: 1,
  },
  popupWord: {
    fontSize: rf(26),
    fontWeight: 'bold',
    color: theme.textDark,
    marginBottom: rs(16),
    textTransform: 'capitalize',
  },
  closeButton: {
    padding: rs(8),
    backgroundColor: theme.background,
    borderRadius: rs(20),
  },
  closeButtonText: {
    fontSize: rf(20),
    color: theme.textMuted,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: rs(30),
  },
  definitionBox: {
    backgroundColor: theme.primaryLight,
    padding: rs(16),
    borderRadius: rs(12),
    marginBottom: rs(24),
    borderWidth: 1,
    borderColor: `${theme.primary}30`,
  },
  popupDefinition: {
    fontSize: rf(18),
    color: theme.textDark,
    lineHeight: rf(28),
  },
  saveButton: {
    backgroundColor: theme.primary,
    borderRadius: rs(12),
    paddingVertical: rs(16),
    alignItems: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: rs(8),
    elevation: 4,
  },
  saveButtonDone: {
    backgroundColor: '#6B7280',
  },
  saveButtonText: {
    color: theme.surface,
    fontSize: rf(20),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default App;
