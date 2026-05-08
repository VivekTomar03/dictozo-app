import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useStore } from '../store/useStore';
import { rf } from '../utils/responsive';

const theme = {
  primary: '#2EBA72',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textDark: '#1A1A1A',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  error: '#EF4444',
};

export const ProfileScreen = () => {
  const email = useStore(s => s.email);
  const planName = useStore(s => s.planName);
  const trChars = useStore(s => s.trChars);
  const language = useStore(s => s.language);
  const logout = useStore(s => s.logout);
  const navigateTo = useStore(s => s.navigateTo);

  const handleLanguageChange = async () => {
    const nextLang = language === 'hi' ? 'es' : 'hi'; // Toggle for demo
    const { syncUser } = await import('../services/api');
    await syncUser(email, { language: nextLang });
    useStore.getState().setLanguage(nextLang);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.userCard}>
          <Text style={styles.email}>{email}</Text>
          <View style={styles.planBadge}>
            <Text style={styles.planText}>{planName.toUpperCase()}</Text>
          </View>
          <Text style={styles.usageText}>
            Remaining Translation Chars: {trChars}
          </Text>
        </View>

        <TouchableOpacity style={styles.menuItem} onPress={handleLanguageChange}>
          <View>
            <Text style={styles.menuText}>Translation Language</Text>
            <Text style={styles.menuSubText}>Current: {language.toUpperCase()}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('https://dictozo.com/dashboard')}>
          <Text style={styles.menuText}>Flashcards (Dashboard)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('https://dictozo.com/dashboard/settings')}>
          <Text style={styles.menuText}>Account Settings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('https://www.youtube.com/watch?v=Bfk0KudbrI0')}>
          <Text style={styles.menuText}>How to Use (Video)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('https://dictozo.com/faq/')}>
          <Text style={styles.menuText}>FAQs</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={logout}>
          <Text style={[styles.menuText, { color: theme.error }]}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { padding: 20, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  title: { fontSize: rf(28), fontWeight: 'bold', color: theme.textDark },
  content: { padding: 20 },
  userCard: { 
    backgroundColor: theme.surface, 
    padding: 24, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: theme.border,
    alignItems: 'center',
    marginBottom: 24
  },
  email: { fontSize: rf(22), fontWeight: 'bold', color: theme.textDark, marginBottom: 8 },
  planBadge: { backgroundColor: theme.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  planText: { color: theme.surface, fontSize: rf(14), fontWeight: 'bold' },
  usageText: { color: theme.textMuted, fontSize: rf(16), fontWeight: '500' },
  menuItem: { 
    backgroundColor: theme.surface, 
    padding: 16, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: theme.border,
    marginBottom: 12
  },
  menuText: { fontSize: rf(18), color: theme.textDark, fontWeight: '500' },
  menuSubText: { fontSize: rf(15), color: theme.textMuted, marginTop: 4 }
});
