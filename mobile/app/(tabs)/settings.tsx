// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, Switch, Platform,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { trpc } from '../../utils/trpc';
import { removeStorageItem } from '../../utils/storage';

const NAVY = '#111827';
const SURFACE = '#f6f5f3';
const BORDER = '#f0eeec';
const MUTED = '#9ca3af';
const CORAL = '#e87a6e';

// ── Icons ──
const Icon = {
  User: ({ color = CORAL, size = 18 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21a8 8 0 00-16 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.8" />
    </Svg>
  ),
  X: ({ color = MUTED, size = 18 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  ChevronRight: ({ color = '#d1d5db', size = 15 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Logout: ({ color = '#ef4444', size = 18 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 17l5-5-5-5M21 12H9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Shield: ({ color = '#6366f1', size = 18 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Bell: ({ color = '#f59e0b', size = 18 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Palette: ({ color = '#ec4899', size = 18 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.55 0 1-.45 1-1v-1.08c0-.27-.11-.52-.29-.71-.18-.19-.29-.44-.29-.71 0-.55.45-1 1-1h1.5c2.76 0 5-2.24 5-5C21 6.13 16.97 2 12 2z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="6.5" cy="11.5" r="1" fill={color} />
      <Circle cx="9.5" cy="7.5" r="1" fill={color} />
      <Circle cx="14.5" cy="7.5" r="1" fill={color} />
      <Circle cx="17.5" cy="11.5" r="1" fill={color} />
    </Svg>
  ),
  Cloud: ({ color = '#0ea5e9', size = 18 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Help: ({ color = '#10b981', size = 18 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" />
      <Path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Camera: ({ color = '#fff', size = 14 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth="1.8" />
    </Svg>
  ),
  Check: ({ color = NAVY, size = 15 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
};

const AVATARS = ['🐼', '🦊', '🐬', '🦁', '🐸', '🦄', '🐙', '🦋', '🐺', '🦅', '🐲', '🌙'];

// ── Shared sheet helpers ──
const renderBackdrop = (props: any) => (
  <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />
);

const SheetLabel = ({ children }: { children: string }) => (
  <Text style={{ fontSize: 11, fontWeight: '600', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
    {children}
  </Text>
);

const SheetInput = ({ style, ...props }: any) => (
  <BottomSheetTextInput
    placeholderTextColor={MUTED}
    style={[{
      backgroundColor: SURFACE,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      fontSize: 15,
      color: NAVY,
      borderWidth: 1,
      borderColor: BORDER,
      marginBottom: 18,
    }, style]}
    {...props}
  />
);

// ── Row component ──
const Row = ({
  label, sub, IconComp, iconColor, iconBg,
  onPress, right, destructive = false, isLast = false,
}: any) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={onPress ? 0.65 : 1}
    style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 13, paddingHorizontal: 14,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: BORDER,
      gap: 12,
    }}
  >
    <View style={{
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: iconBg,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <IconComp color={iconColor} size={17} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: destructive ? '#ef4444' : NAVY }}>{label}</Text>
      {sub && <Text style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{sub}</Text>}
    </View>
    {right !== undefined ? right : (onPress && <Icon.ChevronRight />)}
  </TouchableOpacity>
);

const SectionLabel = ({ children }: { children: string }) => (
  <Text style={{
    fontSize: 11, fontWeight: '600', color: MUTED,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8, marginTop: 24, paddingHorizontal: 4,
  }}>
    {children}
  </Text>
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' }}>
    {children}
  </View>
);

// ── Avatar ──
function AvatarDisplay({ user }: { user: any }) {
  const name = user?.name || 'User';
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  if (user?.avatarUrl && user.avatarUrl.length <= 4) {
    return <Text style={{ fontSize: 36 }}>{user.avatarUrl}</Text>;
  }
  return <Text style={{ color: CORAL, fontSize: 24, fontWeight: '800' }}>{initials}</Text>;
}

// ── Main screen ──
function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();
  const { data: user, isLoading } = trpc.profile.me.useQuery();

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  const avatarModalRef = useRef<BottomSheetModal>(null);
  const editModalRef = useRef<BottomSheetModal>(null);
  const themeModalRef = useRef<BottomSheetModal>(null);

  const [editName, setEditName] = useState('');
  const [editTimezone, setEditTimezone] = useState('');

  const updateProfile = trpc.profile.updateProfile.useMutation({
    onSuccess: () => {
      utils.profile.me.invalidate();
      setShowEditModal(false);
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  useEffect(() => { if (showAvatarModal) avatarModalRef.current?.present(); else avatarModalRef.current?.dismiss(); }, [showAvatarModal]);
  useEffect(() => { if (showEditModal) editModalRef.current?.present(); else editModalRef.current?.dismiss(); }, [showEditModal]);
  useEffect(() => { if (showThemeModal) themeModalRef.current?.present(); else themeModalRef.current?.dismiss(); }, [showThemeModal]);

  const performLogout = async () => {
    try {
      await removeStorageItem('accessToken');
      await removeStorageItem('refreshToken');
      if (Platform.OS === 'web') window.location.href = '/';
      else router.replace('/');
    } catch { Alert.alert('Error', 'Failed to log out.'); }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Log out?')) performLogout();
    } else {
      Alert.alert('Log out', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log out', style: 'destructive', onPress: performLogout },
      ]);
    }
  };

  const handleTestNotification = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: s } = await Notifications.requestPermissionsAsync();
        if (s !== 'granted') { Alert.alert('Permission denied', 'Enable notifications in settings.'); return; }
      }
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Test notification 🔔', body: 'Notifications are working.', sound: true },
        trigger: null,
      });
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleSelectPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow access to your photos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) {
      updateProfile.mutate({ avatarUrl: result.assets[0].uri });
      setShowAvatarModal(false);
    }
  };

  if (isLoading && !user) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: SURFACE }}>
      <ActivityIndicator size="small" color={NAVY} />
    </View>
  );

  const name = user?.name || 'Your name';
  const email = user?.email || '';
  const theme = (user as any)?.theme || 'system';
  const notificationsEnabled = (user as any)?.notificationsEnabled ?? true;

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE }}>

      {/* ══ AVATAR SHEET ══ */}
      <BottomSheetModal
        ref={avatarModalRef}
        snapPoints={['60%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#e2e8f0', width: 36 }}
        backgroundStyle={{ backgroundColor: 'white', borderRadius: 24 }}
        onChange={(i) => { if (i === -1) setShowAvatarModal(false); }}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 6, paddingBottom: 36 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: NAVY }}>Change avatar</Text>
            <TouchableOpacity onPress={() => setShowAvatarModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon.X />
            </TouchableOpacity>
          </View>

          {/* Upload photo */}
          <TouchableOpacity
            onPress={handleSelectPhoto}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: SURFACE, borderRadius: 12,
              padding: 14, marginBottom: 20,
              borderWidth: 1, borderColor: BORDER,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: '#fff0ee', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.Camera color={CORAL} size={16} />
            </View>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: NAVY }}>Upload photo</Text>
              <Text style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>From your gallery</Text>
            </View>
          </TouchableOpacity>

          <SheetLabel>Pick an emoji</SheetLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {AVATARS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => { updateProfile.mutate({ avatarUrl: emoji }); setShowAvatarModal(false); }}
                activeOpacity={0.7}
                style={{
                  width: 56, height: 56, borderRadius: 14,
                  backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 28 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* ══ EDIT PROFILE SHEET ══ */}
      <BottomSheetModal
        ref={editModalRef}
        snapPoints={['50%']}
        enablePanDownToClose
        keyboardBehavior="interactive"
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#e2e8f0', width: 36 }}
        backgroundStyle={{ backgroundColor: 'white', borderRadius: 24 }}
        onChange={(i) => { if (i === -1) setShowEditModal(false); }}
      >
        <BottomSheetView style={{ paddingHorizontal: 24, paddingTop: 6, paddingBottom: 36 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: NAVY }}>Edit profile</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon.X />
            </TouchableOpacity>
          </View>

          <SheetLabel>Display name</SheetLabel>
          <SheetInput value={editName} onChangeText={setEditName} placeholder="Your name" style={{ fontWeight: '600' }} />

          <SheetLabel>Timezone</SheetLabel>
          <SheetInput value={editTimezone} onChangeText={setEditTimezone} placeholder="e.g. Asia/Karachi" style={{ marginBottom: 24 }} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => setShowEditModal(false)}
              style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
              activeOpacity={0.7}
            >
              <Text style={{ fontWeight: '600', color: MUTED }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => updateProfile.mutate({ name: editName, timezone: editTimezone })}
              disabled={updateProfile.isPending}
              style={{ flex: 1, backgroundColor: NAVY, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: updateProfile.isPending ? 0.5 : 1 }}
              activeOpacity={0.85}
            >
              {updateProfile.isPending
                ? <ActivityIndicator color="white" size="small" />
                : <Text style={{ fontWeight: '700', color: 'white', fontSize: 15 }}>Save</Text>}
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      {/* ══ THEME SHEET ══ */}
      <BottomSheetModal
        ref={themeModalRef}
        snapPoints={['36%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#e2e8f0', width: 36 }}
        backgroundStyle={{ backgroundColor: 'white', borderRadius: 24 }}
        onChange={(i) => { if (i === -1) setShowThemeModal(false); }}
      >
        <BottomSheetView style={{ paddingHorizontal: 24, paddingTop: 6, paddingBottom: 32 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: NAVY }}>Appearance</Text>
            <TouchableOpacity onPress={() => setShowThemeModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon.X />
            </TouchableOpacity>
          </View>
          <View style={{ gap: 8 }}>
            {[
              { label: 'Light', val: 'light' },
              { label: 'Dark', val: 'dark' },
              { label: 'System default', val: 'system' },
            ].map(({ label, val }) => {
              const active = theme === val;
              return (
                <TouchableOpacity
                  key={val}
                  onPress={() => { updateProfile.mutate({ theme: val }); setShowThemeModal(false); }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    paddingVertical: 13, paddingHorizontal: 14,
                    borderRadius: 12, borderWidth: 1,
                    backgroundColor: active ? SURFACE : 'white',
                    borderColor: active ? NAVY : BORDER,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: active ? NAVY : MUTED }}>{label}</Text>
                  {active && <Icon.Check />}
                </TouchableOpacity>
              );
            })}
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      {/* ══ MAIN CONTENT ══ */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* ── Profile hero ── */}
        <View style={{
          backgroundColor: 'white',
          paddingTop: insets.top + 16,
          paddingBottom: 24,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: BORDER,
          alignItems: 'center',
        }}>
          {/* Avatar */}
          <View style={{ position: 'relative', marginBottom: 14 }}>
            <View style={{
              width: 80, height: 80, borderRadius: 26,
              backgroundColor: SURFACE,
              borderWidth: 1, borderColor: BORDER,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <AvatarDisplay user={user} />
            </View>
            <TouchableOpacity
              onPress={() => setShowAvatarModal(true)}
              style={{
                position: 'absolute', bottom: -4, right: -4,
                width: 28, height: 28, borderRadius: 9,
                backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: 'white',
              }}
              activeOpacity={0.85}
            >
              <Icon.Camera color="#fff" size={12} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 20, fontWeight: '800', color: NAVY, letterSpacing: -0.3 }}>{name}</Text>
          <Text style={{ fontSize: 13, color: MUTED, marginTop: 3 }}>{email}</Text>
        </View>

        {/* ── Settings list ── */}
        <View style={{ paddingHorizontal: 20 }}>
          <SectionLabel>Account</SectionLabel>
          <Card>
            <Row
              label="Edit profile"
              sub="Name and timezone"
              IconComp={Icon.User} iconColor={CORAL} iconBg="#fff0ee"
              onPress={() => { setEditName(user?.name || ''); setEditTimezone((user as any)?.timezone || ''); setShowEditModal(true); }}
            />
            <Row
              label="Security"
              sub="Password and auth"
              IconComp={Icon.Shield} iconColor="#6366f1" iconBg="#f0f0ff"
              isLast
            />
          </Card>

          <SectionLabel>Preferences</SectionLabel>
          <Card>
            <Row
              label="Notifications"
              IconComp={Icon.Bell} iconColor="#f59e0b" iconBg="#fffbeb"
              right={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={(v) => updateProfile.mutate({ notificationsEnabled: v })}
                  trackColor={{ false: BORDER, true: CORAL }}
                  thumbColor="white"
                />
              }
            />
            <Row
              label="Appearance"
              sub={theme === 'system' ? 'System default' : theme.charAt(0).toUpperCase() + theme.slice(1)}
              IconComp={Icon.Palette} iconColor="#ec4899" iconBg="#fff0f8"
              onPress={() => setShowThemeModal(true)}
            />
            <Row
              label="Sync data"
              IconComp={Icon.Cloud} iconColor="#0ea5e9" iconBg="#f0f9ff"
              isLast
            />
          </Card>

          <SectionLabel>Support</SectionLabel>
          <Card>
            <Row
              label="Test notification"
              IconComp={Icon.Bell} iconColor="#f59e0b" iconBg="#fffbeb"
              onPress={handleTestNotification}
            />
            <Row
              label="Help center"
              IconComp={Icon.Help} iconColor="#10b981" iconBg="#f0fdf4"
              isLast
            />
          </Card>

          {/* Log out */}
          <SectionLabel>Session</SectionLabel>
          <Card>
            <Row
              label="Log out"
              IconComp={Icon.Logout} iconColor="#ef4444" iconBg="#fef2f2"
              onPress={handleLogout}
              destructive
              isLast
              right={null}
            />
          </Card>

          <Text style={{ fontSize: 11, color: '#d1d5db', fontWeight: '600', textAlign: 'center', marginTop: 32, letterSpacing: 0.5 }}>
            SECRETRA v1.0.4
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default ProfileScreen;