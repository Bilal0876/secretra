import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, Modal, Pressable, Switch, Platform, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Circle } from 'react-native-svg';
import { trpc } from '../../utils/trpc';
import { removeStorageItem } from '../../utils/storage';

// ─── Icons ───────────────────────────────────────────────────────────────────

const Icon = {
  User: ({ color = '#e87a6e', size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21a8 8 0 00-16 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.8" />
    </Svg>
  ),
  Users: ({ color = '#06b6d4', size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth="1.8" />
      <Path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Plus: ({ color = '#fff', size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  X: ({ color = '#94a3b8', size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  ChevronRight: ({ color = '#94a3b8', size = 16 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Logout: ({ color = '#ef4444', size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 17l5-5-5-5M21 12H9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Shield: ({ color = '#6366f1', size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Bell: ({ color = '#f59e0b', size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Palette: ({ color = '#ec4899', size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.55 0 1-.45 1-1v-1.08c0-.27-.11-.52-.29-.71-.18-.19-.29-.44-.29-.71 0-.55.45-1 1-1h1.5c2.76 0 5-2.24 5-5C21 6.13 16.97 2 12 2z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="6.5" cy="11.5" r="1" fill={color} />
      <Circle cx="9.5" cy="7.5" r="1" fill={color} />
      <Circle cx="14.5" cy="7.5" r="1" fill={color} />
      <Circle cx="17.5" cy="11.5" r="1" fill={color} />
    </Svg>
  ),
  Cloud: ({ color = '#0ea5e9', size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Help: ({ color = '#10b981', size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" />
      <Path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Camera: ({ color = '#fff', size = 18 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth="1.8" />
    </Svg>
  ),
  Star: ({ color = '#f59e0b', size = 16 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  ),
  Trash: ({ color = '#ef4444', size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
};

// ─── Avatar Picker Modal ──────────────────────────────────────────────────────

const AVATARS = ['🐼', '🦊', '🐬', '🦁', '🐸', '🦄', '🐙', '🦋', '🐺', '🦅', '🐲', '🌙'];

// ─── Avatar Picker Modal ──────────────────────────────────────────────────────

interface AvatarModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  onSelectPhoto: () => void;
}

const AvatarModal = ({ visible, onClose, onSelectEmoji, onSelectPhoto }: AvatarModalProps) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={onClose}>
      <Pressable onPress={() => { }}>
        <View style={{ backgroundColor: '#16161f', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
          <View style={{ width: 40, height: 4, backgroundColor: '#ffffff20', borderRadius: 2, alignSelf: 'center', marginBottom: 24 }} />
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 6 }}>Change Avatar</Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24 }}>Pick an emoji avatar or upload your photo</Text>
          <TouchableOpacity
            onPress={onSelectPhoto}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#e87a6e15', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e87a6e30' }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#e87a6e20', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.Camera color="#e87a6e" size={20} />
            </View>
            <View>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Upload Photo</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>From your camera roll</Text>
            </View>
          </TouchableOpacity>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>Or choose an avatar</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {AVATARS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => { onSelectEmoji(emoji); onClose(); }}
                style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#ffffff0a', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffffff10' }}
              >
                <Text style={{ fontSize: 26 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

// ─── Row Component ────────────────────────────────────────────────────────────

interface RowProps {
  label: string;
  sublabel?: string;
  IconComp: React.ComponentType<{ color: string; size: number }>;
  iconColor: string;
  iconBg: string;
  isFirst?: boolean;
  isLast?: boolean;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}

const Row = ({ label, sublabel, IconComp, iconColor, iconBg, isFirst, isLast, onPress, right, danger }: RowProps) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={{
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13,
      gap: 12,
      borderTopLeftRadius: isFirst ? 20 : 0,
      borderTopRightRadius: isFirst ? 20 : 0,
      borderBottomLeftRadius: isLast ? 20 : 0,
      borderBottomRightRadius: isLast ? 20 : 0,
      backgroundColor: '#fff',
      borderBottomWidth: isLast ? 0 : 0.5,
      borderBottomColor: '#f1f5f9',
    }}
  >
    <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
      <IconComp color={iconColor} size={19} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ color: danger ? '#ef4444' : '#0f172a', fontSize: 14, fontWeight: '600' }}>{label}</Text>
      {sublabel ? <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 1 }}>{sublabel}</Text> : null}
    </View>
    {right ?? <Icon.ChevronRight color={danger ? '#fca5a5' : '#cbd5e1'} />}
  </TouchableOpacity>
);

// ─── Section Label ────────────────────────────────────────────────────────────

const SectionLabel = ({ children }: { children: string }) => (
  <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#94a3b8', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 10, marginLeft: 4, marginTop: 28 }}>
    {children}
  </Text>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const { data: user, isLoading } = trpc.profile.me.useQuery();

  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);

  // ── Core logout logic (shared by both platforms) ──────────────────────────
  const performLogout = async () => {
    try {
      await removeStorageItem('accessToken');
      await removeStorageItem('refreshToken');

      if (Platform.OS === 'web') {
        // router.replace('/') silently fails on web in some Expo Router versions.
        // window.location.href does a hard redirect and clears all React state.
        window.location.href = '/';
      } else {
        router.replace('/');
      }
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  // ── Alert.alert is a no-op on web — use window.confirm instead ───────────
  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) performLogout();
    } else {
      Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: performLogout },
      ]);
    }
  };

  const handleDeleteAccount = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete account? This is permanent and cannot be undone.')) {
        // call your delete API here
      }
    } else {
      Alert.alert('Delete Account', 'This action is permanent and cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { } },
      ]);
    }
  };

  const handleSelectPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
      setAvatarEmoji(null);
      setShowAvatarModal(false);
    }
  };

  if (isLoading && !user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0c0c12' }}>
        <ActivityIndicator size="large" color="#e87a6e" />
      </View>
    );
  }

  const name = user?.name || 'Your Name';
  const email = user?.email || 'user@example.com';
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const renderAvatar = () => {
    if (avatarEmoji) return <Text style={{ fontSize: 42 }}>{avatarEmoji}</Text>;
    return <Text style={{ color: '#e87a6e', fontSize: 30, fontWeight: '900' }}>{initials}</Text>;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0c0c12' }}>
      <AvatarModal
        visible={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onSelectEmoji={setAvatarEmoji}
        onSelectPhoto={handleSelectPhoto}
      />
      
      <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 72, paddingBottom: 36, alignItems: 'center' }}>
          <View style={{ position: 'relative', marginBottom: 18 }}>
            <View style={{
              width: 96, height: 96, borderRadius: 50,
              backgroundColor: '#1a1a24',
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: '#ffffff12',
            }}>
              {renderAvatar()}
            </View>
            <TouchableOpacity
              onPress={() => setShowAvatarModal(true)}
              style={{
                position: 'absolute', bottom: -4, right: -4,
                width: 32, height: 32, borderRadius: 10,
                backgroundColor: '#e87a6e',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: '#0c0c12',
              }}
            >
              <Icon.Camera color="#fff" size={15} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 }}>{name.toUpperCase()}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13 }}>{email}</Text>
        </View>

        {/* ── Body ── */}
        <View style={{
          backgroundColor: '#f4f3f1', borderTopLeftRadius: 32, borderTopRightRadius: 32,
          paddingHorizontal: 18, paddingTop: 28, flex: 1,
        }}>

          <SectionLabel>Account</SectionLabel>
          <View style={{ borderRadius: 20, overflow: 'hidden', gap: 0.5 }}>
            <Row label="Edit Profile" sublabel="Name, bio, username" IconComp={Icon.User} iconColor="#e87a6e" iconBg="#fff0ee" isFirst />
            <Row label="Connected Accounts" sublabel="Google, Apple" IconComp={Icon.Shield} iconColor="#6366f1" iconBg="#eef0ff" isLast />
          </View>

          <SectionLabel>Preferences</SectionLabel>
          <View style={{ borderRadius: 20, overflow: 'hidden', gap: 0.5 }}>
            <Row
              label="Notifications"
              sublabel={notifEnabled ? 'Reminders are on' : 'Reminders are off'}
              IconComp={Icon.Bell}
              iconColor="#f59e0b"
              iconBg="#fffbeb"
              isFirst
              right={
                <Switch
                  value={notifEnabled}
                  onValueChange={setNotifEnabled}
                  trackColor={{ false: '#e2e8f0', true: '#e87a6e' }}
                  thumbColor="#fff"
                />
              }
            />
            <Row label="Appearance" sublabel="Theme, font size" IconComp={Icon.Palette} iconColor="#ec4899" iconBg="#fdf2f8" />
            <Row label="Backup & Sync" sublabel="Last synced just now" IconComp={Icon.Cloud} iconColor="#0ea5e9" iconBg="#f0f9ff" isLast />
          </View>

          <SectionLabel>Support</SectionLabel>
          <View style={{ borderRadius: 20, overflow: 'hidden' }}>
            <Row label="Help & Feedback" sublabel="FAQs, send feedback" IconComp={Icon.Help} iconColor="#10b981" iconBg="#f0fdf4" isFirst isLast />
          </View>

          <SectionLabel>Session</SectionLabel>
          <View style={{ borderRadius: 20, overflow: 'hidden' }}>
            <Row label="Log Out" IconComp={Icon.Logout} iconColor="#ef4444" iconBg="#fef2f2" onPress={handleLogout} danger isFirst isLast />
          </View>

          <SectionLabel>Danger Zone</SectionLabel>
          <View style={{ borderRadius: 20, overflow: 'hidden' }}>
            <Row label="Delete Account" sublabel="Permanently remove all data" IconComp={Icon.Trash} iconColor="#ef4444" iconBg="#fef2f2" onPress={handleDeleteAccount} danger isFirst isLast />
          </View>

          <Text style={{ color: '#c4bfb8', fontSize: 11, textAlign: 'center', marginTop: 32 }}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}