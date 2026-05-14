import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ALL_PERSONAS } from '../constants/personas';
import { ParamsStore } from '../context/params-store';

export default function OfflineChatScreen() {
  const router = useRouter();
  const personaId = ParamsStore.getOfflineChatPersonaId();
  const persona = personaId ? ALL_PERSONAS.find(p => p.id === personaId) : undefined;

  return (
    <SafeAreaView style={s.container}>
      <Stack.Screen options={{
        title: persona ? `${persona.name} (Offline)` : 'Offline AI Chat',
        headerStyle: { backgroundColor: '#FF6F00' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }} />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.iconWrap}>
          <Text style={s.icon}>📡</Text>
        </View>
        <Text style={s.title}>Offline Mode</Text>
        <Text style={s.subtitle}>
          இணையம் இல்லாம AI chat பண்ண on-device model வேணும்.
        </Text>

        <View style={s.card}>
          <Text style={s.cardTitle}>Internet இல்லை</Text>
          <Text style={s.cardText}>
            நீங்க offline-ல் இருக்கீங்க. WiFi அல்லது Mobile Data connect பண்ணா{' '}
            {persona?.name ?? 'AI'}-கிட்ட chat பண்ணலாம்.
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Coming Soon</Text>
          <Text style={s.cardText}>
            Offline AI (on-device) feature விரைவில் வரும்!{'\n'}
            அதுவரை internet connection வச்சு chat பண்ணுங்க.
          </Text>
        </View>

        <TouchableOpacity style={s.btn} onPress={() => router.back()}>
          <Text style={s.btnTxt}>திரும்பு</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECE5DD' },
  content: { alignItems: 'center', padding: 24, paddingTop: 40 },
  iconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 4 },
  icon: { fontSize: 48 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#075E54', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, width: '100%', marginBottom: 16, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8 },
  cardText: { fontSize: 14, color: '#555', lineHeight: 22 },
  btn: { backgroundColor: '#075E54', borderRadius: 24, paddingVertical: 14, paddingHorizontal: 40, marginTop: 12, elevation: 2 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
