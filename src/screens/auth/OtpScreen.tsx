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
  Platform,
  Image,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { syncUser, sendOTP, fetchPlans, checkTrialExpiry, trackStartup } from '../../services/api';
import { AppStorage } from '../../services/storage';
import { useStore } from '../../store/useStore';
import { atob, btoa } from '../../utils/base64';
import { rf, rs } from '../../utils/responsive';
import { ClockIcon, ShieldIcon, SendIcon, ArrowLeftIcon, SparkleIcon } from '../../components/Icons';

const theme = {
  primary: '#2EBA72',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textDark: '#1A1A1A',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  error: '#EF4444',
  lightGreen: '#E8F7F0',
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

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleChange = (val: string, idx: number) => {
    if (val.length > 1) {
      // Handle paste if needed, but for now just single digit
      val = val[0];
    }
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
      const syncRes = await syncUser(email, {
        language: AppStorage.getLang(),
        open_count: 1,
      });

      if (!syncRes.status) throw new Error('Sync failed');

      const { plan_name, tr_chars, favourites, language, mastered } = syncRes.data;

      let parsedFavourites: Record<string, string> = {};
      let parsedMastered: Record<string, string> = {};
      try { parsedFavourites = JSON.parse(favourites ?? '{}'); } catch { }
      try { parsedMastered = JSON.parse(mastered ?? '{}'); } catch { }

      login({
        email,
        planName: plan_name,
        trChars: tr_chars,
        favourites: parsedFavourites,
        mastered: parsedMastered,
        language: language ?? AppStorage.getLang(),
        searchedWords: AppStorage.getSearchedWords(),
      });

      AppStorage.clearOtp();
      AppStorage.clearTempEmail();

      fetchPlans().then(plans => {
        AppStorage.setPlans(plans);
        setPlan(plans.find((p: any) => p.name === plan_name) ?? plans[0]);
      }).catch(() => {});

      checkTrialExpiry(email).then(res => setTrialDaysLeft(res.days)).catch(() => {});
      trackStartup(email);

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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroContainer}>
            {/* Decorative Sparkles */}
            <View style={[styles.sparkle, { top: rs(30), left: rs(40) }]}>
              <SparkleIcon size={rs(16)} color="#2EBA72" />
            </View>
            <View style={[styles.sparkle, { top: rs(70), right: rs(30) }]}>
              <SparkleIcon size={rs(12)} color="#2EBA72" />
            </View>
            
            <Image 
              source={require('../../assets/images/logins1.png')} 
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>

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
                  style={[
                    styles.otpBox, 
                    error ? styles.otpBoxError : null, 
                    digit ? styles.otpBoxFilled : null
                  ]}
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

            <View style={styles.timerRow}>
              <ClockIcon size={rs(16)} color={theme.textMuted} />
              <Text style={styles.timerText}>
                Code expires in <Text style={styles.timerHighlight}>{resendCooldown}s</Text>
              </Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={theme.surface} />
              ) : (
                <View style={styles.buttonInner}>
                  <ShieldIcon size={rs(18)} color="#FFF" />
                  <Text style={styles.buttonText}>Verify</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>Didn't receive it?</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity 
              style={[styles.resendBtn, resendCooldown > 0 && styles.resendBtnDisabled]} 
              onPress={handleResend}
              disabled={resendCooldown > 0}
            >
              <SendIcon size={rs(18)} color={resendCooldown > 0 ? theme.textMuted : theme.primary} />
              <Text style={[styles.resendBtnText, resendCooldown > 0 && styles.resendBtnTextDisabled]}>
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code now'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setAuthStep('Email')} style={styles.backButton}>
              <ArrowLeftIcon size={rs(18)} color={theme.primary} />
              <Text style={styles.backText}>Change email</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <ShieldIcon size={rs(20)} color={theme.primary} />
            <Text style={styles.footerText}>
              We keep your data safe and never share it with anyone.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: {
    padding: rs(20),
    paddingBottom: rs(40),
    alignItems: 'center',
  },
  heroContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: rs(20),
    zIndex: 1,
  },
  heroImage: {
    width: rs(300),
    height: rs(220),
  },
  sparkle: {
    position: 'absolute',
    opacity: 0.6,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: rs(32),
    padding: rs(30),
    width: '100%',
    marginTop: rs(-50),
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: rs(20),
    elevation: 8,
  },
  logo: {
    fontSize: rf(28),
    fontWeight: '900',
    color: theme.primary,
    textAlign: 'center',
    marginBottom: rs(10),
  },
  title: {
    fontSize: rf(26),
    fontWeight: '800',
    color: theme.textDark,
    textAlign: 'center',
    marginBottom: rs(10),
  },
  subtitle: {
    fontSize: rf(15),
    color: theme.textMuted,
    textAlign: 'center',
    marginBottom: rs(24),
    lineHeight: rf(22),
  },
  emailText: {
    color: theme.textDark,
    fontWeight: '700',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: rs(10),
    marginBottom: rs(20),
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: rs(12),
    fontSize: rf(24),
    fontWeight: '800',
    textAlign: 'center',
    color: theme.textDark,
    backgroundColor: theme.background,
  },
  otpBoxFilled: {
    borderColor: theme.primary,
    backgroundColor: theme.lightGreen,
  },
  otpBoxError: {
    borderColor: theme.error,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(6),
    marginBottom: rs(24),
  },
  timerText: {
    fontSize: rf(15),
    color: theme.textMuted,
  },
  timerHighlight: {
    color: theme.primary,
    fontWeight: 'bold',
  },
  errorText: {
    color: theme.error,
    fontSize: rf(14),
    textAlign: 'center',
    marginBottom: rs(16),
  },
  button: {
    backgroundColor: theme.primary,
    padding: rs(16),
    borderRadius: rs(14),
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: rs(8),
    elevation: 4,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(10),
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: theme.surface,
    fontSize: rf(18),
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: rs(24),
    marginBottom: rs(16),
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: theme.border,
  },
  dividerText: {
    paddingHorizontal: rs(10),
    fontSize: rf(14),
    color: theme.textMuted,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(10),
    backgroundColor: theme.background,
    paddingVertical: rs(14),
    borderRadius: rs(12),
    borderWidth: 1,
    borderColor: theme.border,
  },
  resendBtnDisabled: {
    backgroundColor: '#F3F4F6',
  },
  resendBtnText: {
    fontSize: rf(15),
    color: theme.primary,
    fontWeight: '700',
  },
  resendBtnTextDisabled: {
    color: theme.textMuted,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
    marginTop: rs(24),
    padding: rs(8),
  },
  backText: {
    fontSize: rf(16),
    color: theme.primary,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    marginTop: rs(30),
    paddingHorizontal: rs(40),
    alignItems: 'center',
    gap: rs(10),
  },
  footerText: {
    fontSize: rf(14),
    color: theme.textMuted,
    lineHeight: rf(20),
    flex: 1,
  },
});
