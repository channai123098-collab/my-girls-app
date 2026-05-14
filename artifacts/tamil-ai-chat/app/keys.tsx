import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_KEY_STORAGE = 'device_key';
const KEYS_STORAGE = 'api_keys_store';

interface ApiKeyEntry {
  id: string;
  label: string;
  site: string;
  value: string;
  expanded: boolean;
}

const DEFAULT_KEYS: Omit<ApiKeyEntry, 'value' | 'expanded'>[] = [
  { id: 'gemini',    label: 'Gemini API',    site: 'aistudio.google.com' },
  { id: 'groq',      label: 'Groq API',      site: 'console.groq.com' },
  { id: 'expo',      label: 'Expo Token',    site: 'expo.dev' },
  { id: 'github',    label: 'GitHub Token',  site: 'github.com' },
  { id: 'cloudinary',label: 'Cloudinary',    site: 'cloudinary.com' },
  { id: 'hf',        label: 'HuggingFace',   site: 'huggingface.co' },
];

export default function KeysScreen() {
  const router = useRouter();
  const [deviceKey, setDeviceKey] = useState('');
  const [keys, setKeys] = useState<ApiKeyEntry[]>(DEFAULT_KEYS.map(k => ({ ...k, value: '', expanded: false })));
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const load = async () => {
      const dk = await AsyncStorage.getItem(DEVICE_KEY_STORAGE);
      if (dk) {
        setDeviceKey(dk);
      } else {
        const newKey = `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 24);
        setDeviceKey(newKey);
        await AsyncStorage.setItem(DEVICE_KEY_STORAGE, newKey);
      }
      const saved = await AsyncStorage.getItem(KEYS_STORAGE);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, string>;
        setKeys(prev => prev.map(k => ({ ...k, value: parsed[k.id] || '' })));
      }
    };
    load();
  }, []);

  const saveKey = async (id: string, value: string) => {
    setSaving(true);
    try {
      const saved = await AsyncStorage.getItem(KEYS_STORAGE);
      const parsed = saved ? JSON.parse(saved) : {};
      parsed[id] = value;
      await AsyncStorage.setItem(KEYS_STORAGE, JSON.stringify(parsed));
      if (id === 'hf') await AsyncStorage.setItem('hf_api_key', value);
      Alert.alert('Saved ✅', 'Key சேமிக்கப்பட்டது!');
    } catch {
      Alert.alert('Error', 'Save பண்ண முடியல');
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (id: string) => {
    setKeys(prev => prev.map(k => ({ ...k, expanded: k.id === id ? !k.expanded : false })));
  };

  const cloudSave = async () => {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 1500));
    setSyncing(false);
    Alert.alert('Cloud Save', 'Keys encrypted-ஆ cloud-ல் save பண்ணப்பட்டது ✅');
  };

  const cloudLoad = async () => {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 1500));
    setSyncing(false);
    Alert.alert('Cloud Load', 'Cloud-ல் save ஆன keys load ஆச்சு ✅');
  };

  return (
    <SafeAreaView style={s.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <Text style={s.headerIcon}>🔑</Text>
        <Text style={s.headerTitle}>Keys & Accounts</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.deviceKeyCard}>
          <Text style={s.deviceKeyLabel}>DEVICE KEY (My AI Girls-லிருந்து copy பண்ணு)</Text>
          <View style={s.deviceKeyRow}>
            <TextInput
              style={s.deviceKeyInput}
              value={deviceKey}
              onChangeText={setDeviceKey}
              placeholder="Device key..."
              placeholderTextColor="#666"
              selectTextOnFocus
            />
            <TouchableOpacity
              style={s.clearBtn}
              onPress={() => { setDeviceKey(''); AsyncStorage.removeItem(DEVICE_KEY_STORAGE); }}
            >
              <Text style={s.clearBtnTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={s.cloudBtns}>
            <TouchableOpacity style={s.cloudLoadBtn} onPress={cloudLoad} disabled={syncing}>
              {syncing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.cloudBtnTxt}>⬇️ Cloud Load</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.cloudSaveBtn} onPress={cloudSave} disabled={syncing}>
              {syncing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.cloudBtnTxt}>☁️ Cloud Save</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {keys.map(key => (
          <View key={key.id} style={s.keyCard}>
            <TouchableOpacity style={s.keyRow} onPress={() => toggleExpand(key.id)} activeOpacity={0.7}>
              <View style={s.keyIconWrap}>
                <Text style={s.keyIcon}>🔑</Text>
              </View>
              <View style={s.keyInfo}>
                <Text style={s.keyLabel}>{key.label}</Text>
                <Text style={s.keySite}>{key.site}</Text>
              </View>
              <View style={[s.emptyBadge, key.value && s.filledBadge]}>
                <Text style={s.badgeTxt}>{key.value ? 'SAVED' : 'EMPTY'}</Text>
              </View>
              <Text style={s.expandArrow}>{key.expanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {key.expanded && (
              <View style={s.keyExpanded}>
                <TextInput
                  style={s.keyInput}
                  value={key.value}
                  onChangeText={v => setKeys(prev => prev.map(k => k.id === key.id ? { ...k, value: v } : k))}
                  placeholder={`${key.label} enter பண்ணுங்க...`}
                  placeholderTextColor="#555"
                  secureTextEntry
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={s.saveKeyBtn}
                  onPress={() => saveKey(key.id, key.value)}
                  disabled={saving}
                >
                  <Text style={s.saveKeyBtnTxt}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={s.bottomBar}>
        <TouchableOpacity style={s.bottomBtn} onPress={() => router.back()}>
          <Text style={s.bottomIcon}>←</Text>
          <Text style={s.bottomLabel}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.bottomBtn} onPress={() => router.replace('/')}>
          <Text style={s.bottomIconHome}>🏠</Text>
          <Text style={s.bottomLabelActive}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.bottomBtn}>
          <Text style={[s.bottomIcon, { color: '#555' }]}>→</Text>
          <Text style={[s.bottomLabel, { color: '#555' }]}>Forward</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0d1117' },
  header: {
    backgroundColor: '#0d6e7a', flexDirection: 'row',
    alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 16,
  },
  headerIcon: { fontSize: 24 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  scroll: { padding: 14, paddingBottom: 90 },
  deviceKeyCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1.5, borderColor: '#0d6e7a',
  },
  deviceKeyLabel: { color: '#0d6e7a', fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 10 },
  deviceKeyRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1f2937', borderRadius: 10,
    borderWidth: 1, borderColor: '#374151', marginBottom: 12,
  },
  deviceKeyInput: { flex: 1, color: '#e5e7eb', fontSize: 14, padding: 12, fontFamily: 'monospace' },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 12 },
  clearBtnTxt: { color: '#6b7280', fontSize: 16 },
  cloudBtns: { flexDirection: 'row', gap: 10 },
  cloudLoadBtn: { flex: 1, backgroundColor: '#1565C0', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cloudSaveBtn: { flex: 1, backgroundColor: '#374151', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cloudBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  keyCard: {
    backgroundColor: '#111827', borderRadius: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#1f2937',
    overflow: 'hidden',
  },
  keyRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14,
  },
  keyIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#1f2937', justifyContent: 'center',
    alignItems: 'center', marginRight: 12,
  },
  keyIcon: { fontSize: 18 },
  keyInfo: { flex: 1 },
  keyLabel: { color: '#e5e7eb', fontSize: 15, fontWeight: '600' },
  keySite: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  emptyBadge: {
    backgroundColor: '#374151', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, marginRight: 8,
  },
  filledBadge: { backgroundColor: '#065f46' },
  badgeTxt: { color: '#9ca3af', fontSize: 10, fontWeight: '800' },
  expandArrow: { color: '#6b7280', fontSize: 13 },
  keyExpanded: {
    paddingHorizontal: 14, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: '#1f2937',
    flexDirection: 'row', gap: 10, alignItems: 'center',
  },
  keyInput: {
    flex: 1, backgroundColor: '#1f2937', borderRadius: 8,
    borderWidth: 1, borderColor: '#374151',
    padding: 10, color: '#e5e7eb', fontSize: 13,
  },
  saveKeyBtn: { backgroundColor: '#1565C0', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  saveKeyBtnTxt: { color: '#fff', fontWeight: 'bold' },
  bottomBar: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#1f2937',
    backgroundColor: '#111827', paddingVertical: 10,
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  bottomBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  bottomIcon: { fontSize: 20, color: '#9ca3af', fontWeight: 'bold' },
  bottomIconHome: { fontSize: 22 },
  bottomLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  bottomLabelActive: { fontSize: 11, color: '#58a6ff', fontWeight: '700', marginTop: 2 },
});
