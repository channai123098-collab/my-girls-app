import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, Alert,
  ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HF_KEY_STORAGE = 'hf_api_key';

export default function FaceSwapScreen() {
  const [hfKey, setHfKey] = useState('');
  const [keyVisible, setKeyVisible] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [targetUri, setTargetUri] = useState<string | null>(null);
  const [resultUri, setResultUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem(HF_KEY_STORAGE).then(k => {
      if (k) { setHfKey(k); setKeySaved(true); }
    });
  }, []);

  const saveKey = async () => {
    if (!hfKey.trim()) return;
    await AsyncStorage.setItem(HF_KEY_STORAGE, hfKey.trim());
    setKeySaved(true);
    Alert.alert('Saved', 'HuggingFace Key சேமிக்கப்பட்டது!');
  };

  const pickImage = async (type: 'source' | 'target') => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission வேணும்', 'Gallery access allow பண்ணுங்க'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      if (type === 'source') setSourceUri(result.assets[0].uri);
      else setTargetUri(result.assets[0].uri);
      setResultUri(null);
    }
  };

  const doFaceSwap = async () => {
    if (!hfKey.trim()) { Alert.alert('Key வேணும்', 'HuggingFace API key save பண்ணுங்க'); return; }
    if (!sourceUri || !targetUri) { Alert.alert('Photo வேணும்', 'Source + Target photo தேர்வு பண்ணுங்க'); return; }
    setLoading(true);
    setResultUri(null);
    try {
      const srcB64 = await FileSystem.readAsStringAsync(sourceUri, { encoding: FileSystem.EncodingType.Base64 });
      const tgtB64 = await FileSystem.readAsStringAsync(targetUri, { encoding: FileSystem.EncodingType.Base64 });

      const response = await fetch(
        'https://api-inference.huggingface.co/models/minchul/cvlface_adaface_ir101_webface4m',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${hfKey.trim()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: { source_image: srcB64, target_image: tgtB64 } }),
        }
      );
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText.slice(0, 200));
      }
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      setResultUri(`data:image/jpeg;base64,${b64}`);
    } catch (err: any) {
      Alert.alert('Face Swap பிழை', err?.message || 'மீண்டும் முயல்க. Model load ஆக நேரம் ஆகலாம்.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{
        title: 'Face Swap',
        headerStyle: { backgroundColor: '#075E54' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={[styles.card, !keySaved && styles.cardHighlight]}>
          <Text style={styles.cardTitle}>HuggingFace API Key</Text>
          {keySaved && <Text style={styles.keySavedBadge}>Saved</Text>}
          <TextInput
            style={styles.keyInput}
            value={hfKey}
            onChangeText={v => { setHfKey(v); setKeySaved(false); }}
            placeholder="hf_xxxxxxxxxxxxxxxxxxxx"
            placeholderTextColor="#aaa"
            secureTextEntry={!keyVisible}
            autoCapitalize="none"
          />
          <View style={styles.keyActions}>
            <TouchableOpacity style={styles.keyToggle} onPress={() => setKeyVisible(v => !v)}>
              <Text style={styles.keyToggleTxt}>{keyVisible ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.keySaveBtn, !hfKey.trim() && styles.btnDisabled]} onPress={saveKey} disabled={!hfKey.trim()}>
              <Text style={styles.keySaveTxt}>Save Key</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.keyHint}>huggingface.co → Profile → Access Tokens → free token</Text>
        </View>

        <View style={styles.photosRow}>
          <TouchableOpacity style={styles.photoBox} onPress={() => pickImage('source')}>
            {sourceUri
              ? <Image source={{ uri: sourceUri }} style={styles.photoPreview} resizeMode="cover" />
              : <View style={styles.photoEmpty}>
                  <Text style={styles.photoEmptyIcon}>👤</Text>
                  <Text style={styles.photoEmptyTxt}>Source Face</Text>
                  <Text style={styles.photoEmptyHint}>மாற்ற வேண்டிய முகம்</Text>
                </View>
            }
          </TouchableOpacity>
          <View style={styles.arrowWrap}><Text style={styles.arrow}>→</Text></View>
          <TouchableOpacity style={styles.photoBox} onPress={() => pickImage('target')}>
            {targetUri
              ? <Image source={{ uri: targetUri }} style={styles.photoPreview} resizeMode="cover" />
              : <View style={styles.photoEmpty}>
                  <Text style={styles.photoEmptyIcon}>🖼️</Text>
                  <Text style={styles.photoEmptyTxt}>Target Photo</Text>
                  <Text style={styles.photoEmptyHint}>வேண்டிய பின்னணி</Text>
                </View>
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.swapBtn, (loading || !sourceUri || !targetUri || !keySaved) && styles.btnDisabled]}
          onPress={doFaceSwap}
          disabled={loading || !sourceUri || !targetUri || !keySaved}
        >
          {loading
            ? <><ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} /><Text style={styles.swapBtnTxt}>Face Swap பண்றோம்...</Text></>
            : <Text style={styles.swapBtnTxt}>Face Swap செய்</Text>
          }
        </TouchableOpacity>

        {resultUri && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Result</Text>
            <Image source={{ uri: resultUri }} style={styles.resultImg} resizeMode="contain" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f2f5' },
  scroll: { padding: 16, gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 2 },
  cardHighlight: { borderWidth: 2, borderColor: '#E53935' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#111', marginBottom: 12 },
  keySavedBadge: { color: '#2E7D32', fontWeight: '700', fontSize: 12, marginBottom: 8 },
  keyInput: { backgroundColor: '#f8f9fa', borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', padding: 12, fontSize: 14, color: '#111', marginBottom: 10 },
  keyActions: { flexDirection: 'row', gap: 10 },
  keyToggle: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  keyToggleTxt: { color: '#555', fontWeight: '600' },
  keySaveBtn: { flex: 2, backgroundColor: '#075E54', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  keySaveTxt: { color: '#fff', fontWeight: 'bold' },
  keyHint: { fontSize: 11, color: '#aaa', marginTop: 8 },
  photosRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  photoBox: { flex: 1, height: 160, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff', elevation: 2 },
  photoPreview: { width: '100%', height: '100%' },
  photoEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4, padding: 8 },
  photoEmptyIcon: { fontSize: 36 },
  photoEmptyTxt: { fontSize: 13, fontWeight: '700', color: '#333' },
  photoEmptyHint: { fontSize: 10, color: '#999', textAlign: 'center' },
  arrowWrap: { alignItems: 'center' },
  arrow: { fontSize: 28, color: '#075E54', fontWeight: 'bold' },
  swapBtn: { backgroundColor: '#E53935', borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  swapBtnTxt: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnDisabled: { opacity: 0.5 },
  resultCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, elevation: 2, alignItems: 'center' },
  resultTitle: { fontSize: 16, fontWeight: 'bold', color: '#111', marginBottom: 10 },
  resultImg: { width: '100%', height: 280, borderRadius: 10 },
});
