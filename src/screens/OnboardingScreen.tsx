import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { AppStorage } from '../services/storage';
import { useStore } from '../store/useStore';
import { rf } from '../utils/responsive';

const theme = {
  primary: '#2EBA72',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textDark: '#1A1A1A',
  textMuted: '#6B7280',
  border: '#E5E7EB',
};

export const OnboardingScreen = () => {
  const navigateTo = useStore(s => s.navigateTo);

  const handleFinish = () => {
    AppStorage.setOnboardingDone();
    navigateTo('Auth');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Dictozo</Text>
        <Text style={styles.subtitle}>Your personal vocabulary building assistant.</Text>
        
        <View style={styles.placeholder} />
        
        <TouchableOpacity style={styles.button} onPress={handleFinish}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { flex: 1, padding: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: rf(32), fontWeight: 'bold', color: theme.textDark, textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: rf(18), color: theme.textMuted, textAlign: 'center', marginBottom: 40 },
  placeholder: { width: 200, height: 200, backgroundColor: '#E8F7F0', borderRadius: 100, marginBottom: 40 },
  button: { 
    backgroundColor: theme.primary, 
    width: '100%', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  buttonText: { color: theme.surface, fontSize: rf(22), fontWeight: 'bold' }
});
