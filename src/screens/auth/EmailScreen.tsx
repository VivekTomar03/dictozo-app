import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { sendOTP } from '../../services/api';
import { AppStorage } from '../../services/storage';
import { useStore } from '../../store/useStore';
import { btoa } from '../../utils/base64';
import { rf, rs } from '../../utils/responsive';
import { MailIcon, SendIcon, ShieldIcon, SparkleIcon } from '../../components/Icons';

const theme = {
  primary: '#2EBA72',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textDark: '#1A1A1A',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  error: '#EF4444',
};

export const EmailScreen = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuthStep = useStore(s => s.setAuthStep);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleSendOTP = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      await sendOTP(trimmed, otp);
      AppStorage.setOtp(btoa(otp));
      AppStorage.setTempEmail(trimmed);
      setAuthStep('OTP');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to send OTP. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroContainer}>
            {/* Decorative Sparkles */}
            <View style={[styles.sparkle, { top: rs(10), left: rs(40) }]}>
              <SparkleIcon size={rs(16)} color="#2EBA72" />
            </View>
            <View style={[styles.sparkle, { top: rs(50), right: rs(30) }]}>
              <SparkleIcon size={rs(12)} color="#2EBA72" />
            </View>
            <View style={[styles.sparkle, { bottom: rs(40), left: rs(20) }]}>
              <SparkleIcon size={rs(14)} color="#2EBA72" />
            </View>
            
            <Image 
              source={require('../../assets/images/logins1.png')} 
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.logo}>DICTOZO</Text>
            <Text style={styles.title}>Sign In</Text>
            <Text style={styles.subtitle}>
              We'll send a 4-digit code to your <Text style={styles.highlight}>email</Text>
            </Text>

            <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
              <MailIcon size={rs(20)} color={theme.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={theme.textMuted}
                value={email}
                onChangeText={v => { setEmail(v); setError(''); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={handleSendOTP}
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={theme.surface} />
              ) : (
                <View style={styles.buttonInner}>
                  <SendIcon size={rs(18)} color="#FFF" />
                  <Text style={styles.buttonText}>Send Code</Text>
                </View>
              )}
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
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContent: {
    padding: rs(20),
    paddingBottom: rs(40),
    alignItems: 'center',
  },
  heroContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: rs(30),
    marginBottom: rs(0),
    zIndex: 1,
  },
  heroImage: {
    width: rs(340),
    height: rs(260),
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: rs(32),
    padding: rs(30),
    width: '100%',
    marginTop: rs(-60),
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: rs(20),
    elevation: 8,
  },
  logo: {
    fontSize: rf(32),
    fontWeight: '900',
    color: theme.primary,
    textAlign: 'center',
    marginBottom: rs(10),
  },
  title: {
    fontSize: rf(28),
    fontWeight: '800',
    color: theme.textDark,
    textAlign: 'center',
    marginBottom: rs(10),
  },
  subtitle: {
    fontSize: rf(16),
    color: theme.textMuted,
    textAlign: 'center',
    marginBottom: rs(30),
    lineHeight: rf(24),
  },
  highlight: {
    color: theme.primary,
    fontWeight: 'bold',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: rs(15),
    borderRadius: rs(12),
    marginBottom: rs(8),
  },
  input: {
    flex: 1,
    padding: rs(15),
    fontSize: rf(17),
    color: theme.textDark,
  },
  inputError: {
    borderColor: theme.error,
  },
  errorText: {
    color: theme.error,
    fontSize: rf(14),
    marginBottom: rs(12),
    textAlign: 'center',
  },
  button: {
    backgroundColor: theme.primary,
    padding: rs(16),
    borderRadius: rs(14),
    marginTop: rs(10),
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
  footer: {
    flexDirection: 'row',
    marginTop: rs(40),
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
  sparkle: {
    position: 'absolute',
    opacity: 0.6,
  },
});
