import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert, Modal,
  Image, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { sendMessage, Message, generateImage } from '../services/api';
import { saveGeneratedImageToCloud } from './cloud-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { ALL_PERSONAS, Persona } from '../constants/personas';
import { ParamsStore } from '../context/params-store';

const { width, height } = Dimensions.get('window');

const PHOTO_STYLES = [
  { id: 'normal',    label: 'Normal Photo',          prompt: 'normal photo, fully clothed, casual' },
  { id: 'nude',      label: 'Nude 🔞',               prompt: 'nude, fully naked, explicit' },
  { id: 'seminude',  label: 'Semi-nude',             prompt: 'semi nude, partially undressed' },
  { id: 'breast',    label: 'Breast show',           prompt: 'topless, showing breasts, bare chest' },
  { id: 'seductive', label: 'Seductive pose',        prompt: 'seductive pose, alluring, provocative look' },
  { id: 'wet',       label: 'Wet clothes',           prompt: 'wet clothes, drenched, see through wet fabric' },
  { id: 'legs',      label: 'Legs spread',           prompt: 'legs spread wide, revealing pose' },
  { id: 'saree',     label: 'சேலை தூக்கி காட்டு',  prompt: 'lifting saree up, revealing thighs, traditional saree' },
  { id: 'sleeping',  label: 'Sleeping exposed',      prompt: 'sleeping pose, exposed, lying down' },
  { id: 'halfbreast',label: 'Half breast visible',   prompt: 'half breast visible, deep cleavage, low cut top' },
];

export default function ChatScreen() {
  const router = useRouter();
  const params = ParamsStore.getChatParams();
  const personaId = params?.personaId ?? '';
  const provider = params?.provider ?? 'gemini';

  const [persona, setPersona] = useState<Persona | undefined>(undefined);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);

  useEffect(() => {
    const load = async () => {
      const base = ALL_PERSONAS.find(p => p.id === personaId);
      if (!base) return;
      try {
        const saved = await AsyncStorage.getItem(`persona_edit_${base.id}`);
        if (saved) {
          const data = JSON.parse(saved);
          setPersona({ ...base, ...data, prompt: data.prompt ?? base.prompt });
          setAvatarUri(data.avatarPhotoUri);
        } else {
          setPersona(base);
          setAvatarUri(base.avatarPhotoUri);
        }
      } catch {
        setPersona(base);
      }
    };
    load();
  }, [personaId]);

  const welcome = persona
    ? (persona.greeting?.trim() || `வணக்கம்! நான் ${persona.name}. என்ன கதைக்கணும்? 😊`)
    : 'வணக்கம்! நான் Tamil AI. என்ன உதவி செய்யட்டும்? 😊';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [selectedStyleId, setSelectedStyleId] = useState('normal');
  const [generatingPhoto, setGeneratingPhoto] = useState(false);
  const [fullViewImg, setFullViewImg] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (persona) {
      setMessages([{ id: '0', role: 'assistant', content: welcome, timestamp: new Date() }]);
    }
  }, [persona?.id]);

  const clearChat = () => {
    Alert.alert('Chat Clear பண்ணட்டுமா?', 'அனைத்து messages delete ஆகும்', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: () => setMessages([{ id: '0', role: 'assistant', content: welcome, timestamp: new Date() }]),
      },
    ]);
  };

  const pickAvatarPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission', 'Gallery permission வேணும்'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85, allowsEditing: true, aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0] && persona) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      try {
        const saved = await AsyncStorage.getItem(`persona_edit_${persona.id}`);
        const data = saved ? JSON.parse(saved) : {};
        data.avatarPhotoUri = uri;
        await AsyncStorage.setItem(`persona_edit_${persona.id}`, JSON.stringify(data));
      } catch {}
    }
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: text });
      const reply = await sendMessage(history, provider, persona?.prompt);
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: reply, timestamp: new Date() },
      ]);
    } catch (err: any) {
      Alert.alert('பிழை', err?.message || 'பதில் வரவில்லை. மீண்டும் முயல்க.');
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, loading, messages, provider, persona]);

  const handleGeneratePhoto = async () => {
    if (!persona) return;
    setShowGenModal(false);
    setGeneratingPhoto(true);

    const loadingId = Date.now().toString();
    const loadingMsg: Message = {
      id: loadingId, role: 'assistant',
      content: 'Stable Horde-ல் photo generate பண்றேன்... (1-3 நிமிஷம் ஆகலாம்)',
      timestamp: new Date(), imageLoading: true,
    };
    setMessages(prev => [...prev, loadingMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const style = PHOTO_STYLES.find(s => s.id === selectedStyleId);
      const stylePrompt = style ? style.prompt : '';
      const combined = [stylePrompt, genPrompt.trim()].filter(Boolean).join(', ');
      const result = await generateImage({
        imgFace: persona.faceDesc,
        imgBody: persona.bodyDesc,
        imgAttire: persona.attireDesc,
        imagePrompt: combined || undefined,
        personaName: persona.name,
        mode: 'single',
      });

      const dataUri = `data:${result.mimeType};base64,${result.b64_json}`;

      saveGeneratedImageToCloud(result.b64_json, result.mimeType, 'ai').catch(() => {});

      setMessages(prev => prev.map(m =>
        m.id === loadingId
          ? { ...m, content: 'Photo ready! ☁️ Cloud-ல் save ஆச்சு. Tap to view.', imageLoading: false, imageUrl: dataUri }
          : m
      ));
    } catch (err: any) {
      setMessages(prev => prev.map(m =>
        m.id === loadingId
          ? { ...m, content: `Generate பண்ண முடியல:\n${err?.message || 'Try again'}`, imageLoading: false }
          : m
      ));
    } finally {
      setGeneratingPhoto(false);
      setGenPrompt('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.userRow : styles.aiRow]}>
        {!isUser && persona && (
          <View style={styles.avatarWrap}>
            {avatarUri
              ? <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              : <View style={[styles.avatarCircle, { backgroundColor: persona.avatarColor }]}>
                  <Text style={styles.avatarEmoji}>{persona.avatarLetter || persona.emoji}</Text>
                </View>
            }
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          {item.imageLoading ? (
            <View style={styles.imgLoadingWrap}>
              <ActivityIndicator color="#075E54" size="small" />
              <Text style={styles.msgText}>{item.content}</Text>
            </View>
          ) : item.imageUrl ? (
            <TouchableOpacity onPress={() => setFullViewImg(item.imageUrl!)}>
              <Image source={{ uri: item.imageUrl }} style={styles.generatedImg} resizeMode="cover" />
              <Text style={[styles.msgText, { marginTop: 4 }]}>{item.content}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.msgText}>{item.content}</Text>
          )}
          <Text style={styles.timeText}>
            {item.timestamp.toLocaleTimeString('ta-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const headerTitle = () => (
    <TouchableOpacity style={styles.headerTitleWrap} onPress={pickAvatarPhoto}>
      {avatarUri
        ? <Image source={{ uri: avatarUri }} style={styles.headerAvatarImg} />
        : persona
          ? <View style={[styles.headerAvatar, { backgroundColor: persona.avatarColor }]}>
              <Text style={styles.headerAvatarText}>{persona.avatarLetter || persona.emoji}</Text>
            </View>
          : null
      }
      <View>
        <Text style={styles.headerName}>{persona?.name ?? '...'}</Text>
        <Text style={styles.headerOnline}>online</Text>
      </View>
    </TouchableOpacity>
  );

  const headerRight = () => (
    <View style={styles.headerBtns}>
      {persona && (
        <TouchableOpacity style={styles.headerBtn} onPress={() => {
          ParamsStore.setEditPersonaId(persona.id);
          router.push('/edit-character');
        }}>
          <Text style={styles.headerBtnIcon}>✏️</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.headerBtn} onPress={clearChat}>
        <Text style={styles.headerBtnIcon}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{
        headerTitle,
        headerRight,
        headerStyle: { backgroundColor: '#075E54' },
        headerTintColor: '#fff',
      }} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        {loading && (
          <View style={styles.loadingRow}>
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color="#075E54" />
              <Text style={styles.loadingText}>
                {persona ? `${persona.name} பதில் அளிக்கிறார்...` : 'பதில் தயாராகிறது...'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="தமிழில் தட்டச்சு பண்ணுங்க..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
          />
          <View style={styles.btnStack}>
            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={() => setShowGenModal(true)}
              disabled={generatingPhoto}
            >
              {generatingPhoto
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.cameraIcon}>📷</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || loading}
            >
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showGenModal} transparent animationType="slide" onRequestClose={() => setShowGenModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowGenModal(false)}>
          <TouchableOpacity activeOpacity={1} style={{ width: '100%' }}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHandle} />
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Photo Style தேர்வு செய்</Text>
                <TouchableOpacity onPress={() => setShowGenModal(false)}>
                  <Text style={styles.pickerClose}>✕</Text>
                </TouchableOpacity>
              </View>
              {persona && (
                <View style={styles.pickerCharInfo}>
                  <Text style={styles.pickerCharText}>
                    {persona.name} — Stable Horde (Free) மூலம் AI photo உருவாக்கும்
                  </Text>
                </View>
              )}
              <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {PHOTO_STYLES.map((style, idx) => {
                  const isSelected = style.id === selectedStyleId;
                  return (
                    <TouchableOpacity
                      key={style.id}
                      style={[styles.styleRow, isSelected && styles.styleRowSelected, idx === PHOTO_STYLES.length - 1 && { borderBottomWidth: 0 }]}
                      onPress={() => setSelectedStyleId(style.id)}
                    >
                      <View style={[styles.styleRadio, isSelected && styles.styleRadioSelected]}>
                        {isSelected && <View style={styles.styleRadioDot} />}
                      </View>
                      <Text style={[styles.styleLabel, isSelected && styles.styleLabelSelected]}>{style.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
                <Text style={styles.genLabel}>கூடுதல் Scene / Pose (optional)</Text>
                <TextInput
                  style={styles.genInput}
                  value={genPrompt}
                  onChangeText={setGenPrompt}
                  placeholder="e.g. sitting on bed, smiling..."
                  placeholderTextColor="#aaa"
                  multiline
                />
                <TouchableOpacity style={styles.genBtn} onPress={handleGeneratePhoto} disabled={generatingPhoto}>
                  <Text style={styles.genBtnText}>Generate Photo</Text>
                </TouchableOpacity>
                <Text style={styles.genNote}>⏱ 1-3 நிமிஷம் ஆகலாம் — Stable Horde free queue</Text>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!fullViewImg} transparent={false} animationType="fade" onRequestClose={() => setFullViewImg(null)}>
        <View style={styles.viewerBg}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setFullViewImg(null)}>
            <Text style={styles.viewerCloseText}>✕</Text>
          </TouchableOpacity>
          {fullViewImg && <Image source={{ uri: fullViewImg }} style={styles.viewerImg} resizeMode="contain" />}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECE5DD' },
  flex: { flex: 1 },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  headerName: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  headerOnline: { color: '#b2dfdb', fontSize: 11 },
  headerBtns: { flexDirection: 'row', alignItems: 'center', marginRight: 8, gap: 4 },
  headerBtn: { padding: 6 },
  headerBtnIcon: { fontSize: 18 },
  msgList: { padding: 10, paddingBottom: 4 },
  msgRow: { marginVertical: 3, flexDirection: 'row', alignItems: 'flex-end' },
  userRow: { justifyContent: 'flex-end' },
  aiRow: { justifyContent: 'flex-start', gap: 6 },
  avatarWrap: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden', marginBottom: 2 },
  avatarImg: { width: 34, height: 34, borderRadius: 17 },
  avatarCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  avatarEmoji: { fontSize: 16, color: '#fff' },
  imgLoadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  generatedImg: { width: 220, height: 280, borderRadius: 8, marginBottom: 4 },
  bubble: { maxWidth: '75%', borderRadius: 10, padding: 10, paddingBottom: 6, elevation: 1 },
  userBubble: { backgroundColor: '#DCF8C6', borderTopRightRadius: 2 },
  aiBubble: { backgroundColor: '#fff', borderTopLeftRadius: 2 },
  msgText: { fontSize: 15, lineHeight: 22, color: '#111' },
  timeText: { fontSize: 10, color: '#888', alignSelf: 'flex-end', marginTop: 3 },
  loadingRow: { flexDirection: 'row', padding: 8, paddingLeft: 14 },
  loadingBubble: { backgroundColor: '#fff', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { color: '#075E54', fontSize: 13 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 8, backgroundColor: '#F0F0F0', borderTopWidth: 1, borderTopColor: '#ddd', gap: 8 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 120, color: '#111', borderWidth: 1, borderColor: '#ddd' },
  btnStack: { flexDirection: 'column', gap: 6, alignItems: 'center' },
  cameraBtn: { backgroundColor: '#E53935', width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  cameraIcon: { fontSize: 18 },
  sendBtn: { backgroundColor: '#25D366', width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  sendBtnDisabled: { backgroundColor: '#a8d5b5' },
  sendIcon: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingBottom: 10, maxHeight: '85%' },
  pickerHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  pickerTitle: { fontSize: 17, fontWeight: 'bold', color: '#111' },
  pickerClose: { fontSize: 20, color: '#888', padding: 4 },
  pickerCharInfo: { backgroundColor: '#e8f5e9', borderRadius: 8, padding: 10, marginTop: 10 },
  pickerCharText: { color: '#2e7d32', fontSize: 13 },
  styleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  styleRowSelected: { backgroundColor: '#f0f4ff' },
  styleRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#bbb', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  styleRadioSelected: { borderColor: '#6C63FF' },
  styleRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6C63FF' },
  styleLabel: { fontSize: 14.5, color: '#333', flex: 1 },
  styleLabelSelected: { color: '#6C63FF', fontWeight: '600' },
  genLabel: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 8 },
  genInput: { backgroundColor: '#f8f8f8', borderRadius: 10, borderWidth: 1, borderColor: '#ddd', padding: 12, fontSize: 14, color: '#222', minHeight: 70, textAlignVertical: 'top', marginBottom: 6 },
  genBtn: { backgroundColor: '#075E54', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  genBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  genNote: { fontSize: 12, color: '#888', textAlign: 'center' },
  viewerBg: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  viewerClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  viewerCloseText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  viewerImg: { width, height: height * 0.72 },
});
