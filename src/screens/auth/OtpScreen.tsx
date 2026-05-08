import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  NativeModules,
  Platform,
} from 'react-native';
import { syncUser, sendOTP, fetchPlans, checkTrialExpiry, trackStartup } from '../../services/api';
import { AppStorage } from '../../services/storage';
import { useStore } from '../../store/useStore';
import { atob, btoa } from '../../utils/base64';
import { rf } from '../../utils/responsive';

const theme = {
  primary: '#2EBA72',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textDark: '#1A1A1A',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  error: '#EF4444',
};

const APP_VERSION = '1.0.0';

export const OtpScreen = () => {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(30);
  const refs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  const setAuthStep = useStore(s => s.setAuthStep);
  const login = useStore(s => s.login);
  const navigateTo = useStore(s => s.navigateTo);
  const setPlan = useStore(s => s.setPlan);
  const setTrialDaysLeft = useStore(s => s.setTrialDaysLeft);

  const email = AppStorage.getTempEmail();

  // Resend countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleChange = (val: string, idx: number) => {
    if (val.length > 1) return; // single digit only
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    setError('');
    if (val && idx < 3) refs[idx + 1].current?.focus();
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      refs[idx - 1].current?.focus();
    }
  };

  const handleVerify = async () => {
    const entered = otp.join('');
    if (entered.length < 4) {
      setError('Enter all 4 digits');
      return;
    }

    // Client-side OTP verification per spec §3
    const stored = AppStorage.getOtp();
    let decoded = '';
    try {
      decoded = atob(stored);
    } catch {
      setError('Session expired. Please request a new code.');
      return;
    }

    if (entered !== decoded) {
      setError('Invalid code. Please check and try again.');
      return;
    }

    setLoading(true);
    try {
      // Sync user data with server per spec §3 step 6
      const syncRes = await syncUser(email, {
        language: AppStorage.getLang(),
        open_count: 1,
      });

      if (!syncRes.status) {
        throw new Error('Sync failed');
      }

      const { plan_name, tr_chars, favourites, language } = syncRes.data;

      // Parse server favourites
      let parsedFavourites: Record<string, string> = {};
      let parsedMastered: Record<string, string> = {};
      try {
        parsedFavourites = JSON.parse(favourites ?? '{}');
      } catch { /* keep empty */ }
      try {
        parsedMastered = JSON.parse(mastered ?? '{}');
      } catch { /* keep empty */ }

      // Persist session
      login({
        email,
        planName: plan_name,
        trChars: tr_chars,
        favourites: parsedFavourites,
        mastered: parsedMastered,
        language: language ?? AppStorage.getLang(),
        searchedWords: AppStorage.getSearchedWords(),
      });

      // Clean up temp auth storage
      AppStorage.clearOtp();
      AppStorage.clearTempEmail();

      // Fetch plans and trial expiry in background
      fetchPlans()
        .then(plans => { AppStorage.setPlans(plans); setPlan(plans.find((p: any) => p.name === plan_name) ?? plans[0]); })
        .catch(() => {});

      checkTrialExpiry(email)
        .then(res => setTrialDaysLeft(res.days))
        .catch(() => {});

      trackStartup(email);

      // First install tracking
      if (!AppStorage.getInstallDate()) {
        AppStorage.setInstallDate(new Date().toISOString());
        AppStorage.setInstallVersion(APP_VERSION);
      }

      navigateTo('Main');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Verification failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
      await sendOTP(email, newOtp);
      AppStorage.setOtp(btoa(newOtp));
      setOtp(['', '', '', '']);
      setError('');
      setResendCooldown(30);
      refs[0].current?.focus();
    } catch {
      Alert.alert('Error', 'Could not resend. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.card}>
          <Text style={styles.logo}>DICTOZO</Text>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a 4-digit code to{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>

          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={refs[i]}
                style={[styles.otpBox, error ? styles.otpBoxError : null, digit ? styles.otpBoxFilled : null]}
                value={digit}
                onChangeText={v => handleChange(v, i)}
                onKeyPress={e => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                autoFocus={i === 0}
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color={theme.surface} />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive it? </Text>
            <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0}>
              <Text style={[styles.resendLink, resendCooldown > 0 && styles.resendLinkDisabled]}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => setAuthStep('Email')} style={styles.backButton}>
            <Text style={styles.backText}>← Change email</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  logo: {
    fontSize: rf(30),
    fontWeight: '900',
    color: theme.primary,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: rf(26),
    fontWeight: '800',
    color: theme.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: rf(16),
    color: theme.textMuted,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: rf(24),
  },
  emailText: {
    color: theme.textDark,
    fontWeight: '600',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: theme.border,
    borderRadius: 12,
    fontSize: rf(28),
    fontWeight: '800',
    textAlign: 'center',
    color: theme.textDark,
    backgroundColor: theme.background,
  },
  otpBoxFilled: {
    borderColor: theme.primary,
    backgroundColor: '#E8F7F0',
  },
  otpBoxError: {
    borderColor: theme.error,
  },
  errorText: {
    color: theme.error,
    fontSize: rf(15),
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: theme.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: theme.surface,
    fontSize: rf(19),
    fontWeight: '700',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  resendLabel: {
    fontSize: rf(16),
    color: theme.textMuted,
  },
  resendLink: {
    fontSize: rf(16),
    color: theme.primary,
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: theme.textMuted,
  },
  backButton: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  backText: {
    fontSize: rf(16),
    color: theme.textMuted,
  },
});
