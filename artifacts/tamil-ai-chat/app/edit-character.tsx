import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { ALL_PERSONAS, Persona } from '../constants/personas';
import { ParamsStore } from '../context/params-store';

export default function EditCharacterScreen() {
  const router = useRouter();
  const personaId = ParamsStore.getEditPersonaId() ?? '';
  const base = ALL_PERSONAS.find(p => p.id === personaId);

  const [persona, setPersona] = useState<Persona | null>(null);
  const [name, setName] = useState('');
  const [avatarLetter, setAvatarLetter] = useState('');
  const [greeting, setGreeting] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [faceDesc, setFaceDesc] = useState('');
  const [bodyDesc, setBodyDesc] = useState('');
  const [attireDesc, setAttireDesc] = useState('');
  const [avatarPhotoUri, setAvatarPhotoUri] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!base) return;
      try {
        const saved = await AsyncStorage.getItem(`persona_edit_${base.id}`);
        const data = saved ? JSON.parse(saved) : {};
        setPersona(base);
        setName(data.name ?? base.name);
        setAvatarLetter(data.avatarLetter ?? base.avatarLetter ?? base.emoji);
        setGreeting(data.greeting ?? base.greeting ?? '');
        setSystemPrompt(data.prompt ?? base.prompt);
        setFaceDesc(data.faceDesc ?? base.faceDesc ?? '');
        setBodyDesc(data.bodyDesc ?? base.bodyDesc ?? '');
        setAttireDesc(data.attireDesc ?? base.attireDesc ?? '');
        setAvatarPhotoUri(data.avatarPhotoUri);
      } catch {}
    };
    load();
  }, [personaId]);

  const handleSave = async () => {
    if (!persona) return;
    setSaving(true);
    try {
      const data = {
        name, avatarLetter, greeting, prompt: systemPrompt,
        faceDesc, bodyDesc, attireDesc, avatarPhotoUri,
      };
      await AsyncStorage.setItem(`persona_edit_${persona.id}`, JSON.stringify(data));
      Alert.alert('Saved', `${name} character update ஆச்சு!`);
      router.back();
    } catch {
      Alert.alert('Error', 'Save பண்ண முடியல, retry பண்ணுங்க');
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission', 'Gallery permission வேணும்'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85, allowsEditing: true, aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarPhotoUri(result.assets[0].uri);
    }
  };

  const Field = ({ label, hint, value, onChange, minH = 60 }: {
    label: string; hint?: string; value: string;
    onChange: (v: string) => void; minH?: number;
  }) => (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { minHeight: minH }]}
        value={value}
        onChangeText={onChange}
        multiline
        textAlignVertical="top"
        placeholderTextColor="#bbb"
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );

  if (!persona) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#075E54" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{
        title: 'Edit Character',
        headerStyle: { backgroundColor: '#075E54' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => (
          <TouchableOpacity onPress={handleSave} disabled={saving} style={{ marginRight: 16 }}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Save</Text>
            }
          </TouchableOpacity>
        ),
      }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrap}>
            {avatarPhotoUri
              ? <Image source={{ uri: avatarPhotoUri }} style={styles.avatarImg} />
              : <View style={[styles.avatarCircle, { backgroundColor: persona.avatarColor }]}>
                  <Text style={styles.avatarEmoji}>{avatarLetter || persona.emoji}</Text>
                </View>
            }
            <View style={styles.cameraOverlay}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadBtn} onPress={pickAvatar}>
            <Text style={styles.uploadBtnText}>Upload Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>NAME</Text>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Character பேரு..."
            placeholderTextColor="#bbb"
          />
          <Text style={[styles.sectionLabel, { marginTop: 14 }]}>AVATAR LETTER</Text>
          <TextInput
            style={styles.nameInput}
            value={avatarLetter}
            onChangeText={setAvatarLetter}
            placeholder="ஒரு எழுத்து (e.g. க, ப, த)"
            placeholderTextColor="#bbb"
            maxLength={2}
          />
          <Text style={[styles.sectionLabel, { marginTop: 14 }]}>GREETING (FIRST MESSAGE)</Text>
          <TextInput
            style={[styles.fieldInput, { minHeight: 80 }]}
            value={greeting}
            onChangeText={setGreeting}
            multiline
            textAlignVertical="top"
            placeholder="Character-ஓட first message..."
            placeholderTextColor="#bbb"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>SYSTEM PROMPT (CHARACTER BEHAVIOR)</Text>
          <TextInput
            style={[styles.fieldInput, { minHeight: 200 }]}
            value={systemPrompt}
            onChangeText={setSystemPrompt}
            multiline
            textAlignVertical="top"
            placeholder="Character behavior prompt..."
            placeholderTextColor="#bbb"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>IMAGE GENERATION DETAILS</Text>
          <Field label="A. முக அமைப்பு (FACE)" value={faceDesc} onChange={setFaceDesc} hint="e.g. beautiful Tamil woman, 24 years old, long wavy black hair..." minH={80} />
          <View style={styles.divider} />
          <Field label="B. உடல் அமைப்பு (BODY)" value={bodyDesc} onChange={setBodyDesc} hint="e.g. slim curvy figure, natural proportioned..." minH={60} />
          <View style={styles.divider} />
          <Field label="C. உடை (ATTIRE)" value={attireDesc} onChange={setAttireDesc} hint="e.g. casual salwar or jeans and top..." minH={80} />
        </View>

        <Text style={styles.footerNote}>
          This is a built-in character. Your edits are saved locally.
        </Text>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save Character</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f2f5' },
  scroll: { flex: 1 },
  content: { padding: 12, paddingBottom: 50 },
  avatarSection: { alignItems: 'center', paddingVertical: 20 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatarCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  avatarImg: { width: 100, height: 100, borderRadius: 50 },
  avatarEmoji: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  cameraOverlay: {
    position: 'absolute', bottom: 2, right: 2,
    backgroundColor: '#333', borderRadius: 14,
    width: 28, height: 28, justifyContent: 'center', alignItems: 'center',
  },
  cameraIcon: { fontSize: 14 },
  uploadBtn: { borderWidth: 1, borderColor: '#075E54', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  uploadBtnText: { color: '#075E54', fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, elevation: 2 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#888', letterSpacing: 0.8, marginBottom: 8 },
  nameInput: { backgroundColor: '#f8f9fa', borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', padding: 10, fontSize: 15, color: '#111' },
  fieldWrap: { marginBottom: 4 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 4 },
  fieldInput: { backgroundColor: '#f8f9fa', borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', padding: 10, fontSize: 14, color: '#222', lineHeight: 20 },
  fieldHint: { fontSize: 11, color: '#aaa', marginTop: 4, marginBottom: 4, lineHeight: 16 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 14 },
  footerNote: { fontSize: 12, color: '#888', textAlign: 'center', paddingHorizontal: 20, marginBottom: 16, lineHeight: 18 },
  saveBtn: { backgroundColor: '#075E54', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
