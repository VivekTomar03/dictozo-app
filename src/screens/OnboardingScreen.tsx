import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, ScrollView } from 'react-native';
import { AppStorage } from '../services/storage';
import { useStore } from '../store/useStore';
import { rf, rs } from '../utils/responsive';
import { RobotIcon, CalendarIcon, QuizIcon, RocketIcon } from '../components/Icons';

const theme = {
  primary: '#2EBA72',
  primaryLight: '#E8F7F0',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  textDark: '#1A1A1A',
  textMuted: '#6B7280',
  border: '#F3F4F6',
};

export const OnboardingScreen = () => {
  const navigateTo = useStore(s => s.navigateTo);

  const handleFinish = () => {
    AppStorage.setOnboardingDone();
    navigateTo('Auth');
  };

  const handleSkip = () => {
    AppStorage.setOnboardingDone();
    navigateTo('Auth');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroContainer}>
          <Image 
            source={require('../assets/images/welcomeS1.png')} 
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={styles.brandText}>Dictozo</Text>
          <Text style={styles.subtitle}>
            Build your vocabulary, boost your confidence, and express yourself better every day.
          </Text>
        </View>

        <View style={styles.featuresRow}>
          <View style={styles.featureCard}>
            <View style={styles.iconCircle}>
              <RobotIcon size={rs(22)} color={theme.primary} />
            </View>
            <Text style={styles.featureTitle}>AI Powered</Text>
            <Text style={styles.featureSub}>Smart learning just for you</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.iconCircle}>
              <CalendarIcon size={rs(22)} color={theme.primary} />
            </View>
            <Text style={styles.featureTitle}>Daily Words</Text>
            <Text style={styles.featureSub}>Learn new words every day</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.iconCircle}>
              <QuizIcon size={rs(22)} color={theme.primary} />
            </View>
            <Text style={styles.featureTitle}>Quick Quiz</Text>
            <Text style={styles.featureSub}>Test and improve your knowledge</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.getStartedBtn} onPress={handleFinish}>
            <RocketIcon size={rs(20)} color="#FFF" style={styles.rocketIcon} />
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.accountText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleSkip}>
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: {
    paddingBottom: rs(40),
  },
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs(10),
  },
  heroImage: {
    width: rs(260),
    height: rs(260),
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: rs(32),
    marginTop: rs(5),
  },
  welcomeText: {
    fontSize: rf(32),
    fontWeight: '800',
    color: '#1F2937',
  },
  brandText: {
    fontSize: rf(48),
    fontWeight: '900',
    color: theme.primary,
    marginTop: -rs(5),
  },
  subtitle: {
    fontSize: rf(16),
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: rs(10),
    lineHeight: rf(22),
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: rs(20),
    marginTop: rs(20),
    gap: rs(8),
  },
  featureCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: rs(12),
    padding: rs(10),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  iconCircle: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(18),
    backgroundColor: theme.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rs(8),
  },
  featureTitle: {
    fontSize: rf(12),
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
  },
  featureSub: {
    fontSize: rf(9),
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: rs(2),
  },
  footer: {
    paddingHorizontal: rs(24),
    marginTop: rs(30),
    alignItems: 'center',
  },
  getStartedBtn: {
    backgroundColor: theme.primary,
    flexDirection: 'row',
    width: '100%',
    paddingVertical: rs(15),
    borderRadius: rs(16),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  rocketIcon: {
    marginRight: rs(10),
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: rf(20),
    fontWeight: 'bold',
  },
  loginRow: {
    flexDirection: 'row',
    marginTop: rs(15),
    alignItems: 'center',
  },
  accountText: {
    fontSize: rf(16),
    color: theme.textMuted,
  },
  signInText: {
    fontSize: rf(16),
    color: theme.primary,
    fontWeight: 'bold',
  },
});
