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
} from 'react-native';
import { sendOTP } from '../../services/api';
import { AppStorage } from '../../services/storage';
import { useStore } from '../../store/useStore';
import { btoa } from '../../utils/base64';
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
      // Generate 4-digit OTP client-side per spec §3
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      // Send to server to be emailed
      await sendOTP(trimmed, otp);
      // Store encoded OTP and temp email for verification step
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}>
        <View style={styles.card}>
          <Text style={styles.logo}>DICTOZO</Text>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>
            We'll send a 4-digit code to your email
          </Text>

          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
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
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSendOTP}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color={theme.surface} />
            ) : (
              <Text style={styles.buttonText}>Send Code</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    fontSize: rf(18),
    color: theme.textMuted,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: rf(24),
  },
  input: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    borderRadius: 10,
    fontSize: rf(18),
    color: theme.textDark,
    marginBottom: 8,
  },
  inputError: {
    borderColor: theme.error,
  },
  errorText: {
    color: theme.error,
    fontSize: rf(15),
    marginBottom: 12,
    marginLeft: 4,
  },
  button: {
    backgroundColor: theme.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
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
});
