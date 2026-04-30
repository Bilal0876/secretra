// @ts-nocheck
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  StatusBar,
  Image,
  Alert,
  Platform,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Circle } from 'react-native-svg';
import { AlertCircle } from 'lucide-react-native';
import { trpc } from '../../utils/trpc';
import { AddEventModal } from '../../components/AddEventModal';

const NAVY = '#111827';
const CORAL = '#e87a6e';
const SURFACE = '#f6f5f3';
const MUTED = '#9ca3af';
const BORDER = '#f0eeec';

// ── Icons ──

const IconBack = ({ color = '#111827', size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconPlus = ({ color = '#fff', size = 15 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </Svg>
);

const IconRemoveUser = ({ color = '#ef4444', size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="10" cy="7" r="3.5" stroke={color} strokeWidth="1.8" />
    <Path d="M3 20c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M19 11h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconUsersGroup = ({ size = 28, color = '#16a34a' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="7" r="3" stroke={color} strokeWidth="1.6" />
    <Path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    <Circle cx="17" cy="7" r="2.5" stroke={color} strokeWidth="1.6" />
    <Path d="M21 19c0-2.8-1.8-5.1-4-5.8" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </Svg>
);

const IconCalendar = ({ color = '#06b6d4', size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" stroke={color} strokeWidth="1.8" />
    <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconEdit = ({ color = '#6b7280', size = 17 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconLogOut = ({ color = '#ef4444', size = 17 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconCamera = ({ color = '#fff', size = 14 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth="2" />
  </Svg>
);

// ── Avatar ──

const AVATAR_COLORS = [
  { bg: '#ede9fe', text: '#7c3aed' },
  { bg: '#dbeafe', text: '#2563eb' },
  { bg: '#dcfce7', text: '#16a34a' },
  { bg: '#fce7f3', text: '#db2777' },
  { bg: '#ffedd5', text: '#ea580c' },
  { bg: '#e0f2fe', text: '#0284c7' },
];

const AvatarInitials = ({ email, size = 40 }: { email: string; size?: number }) => {
  const initials = email.slice(0, 2).toUpperCase();
  const color = AVATAR_COLORS[email.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: color.text, fontWeight: '700', fontSize: size * 0.32 }}>{initials}</Text>
    </View>
  );
};

// ── Shared sheet helpers ──

const renderBackdrop = (props) => (
  <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.45} />
);

const SheetLabel = ({ children }) => (
  <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 8 }}>
    {children}
  </Text>
);

const SheetInput = ({ style, ...props }) => (
  <BottomSheetTextInput
    style={[{
      backgroundColor: SURFACE,
      padding: 14,
      borderRadius: 14,
      fontSize: 15,
      color: NAVY,
      borderWidth: 1,
      borderColor: BORDER,
      marginBottom: 16,
    }, style]}
    placeholderTextColor={MUTED}
    {...props}
  />
);

const PrimaryButton = ({ onPress, disabled, loading, label, style }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    style={[{
      backgroundColor: NAVY,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
    }, (disabled || loading) && { opacity: 0.4 }, style]}
    activeOpacity={0.85}
  >
    {loading
      ? <ActivityIndicator color="white" size="small" />
      : <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>{label}</Text>}
  </TouchableOpacity>
);

const GhostButton = ({ onPress, label }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{ borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: SURFACE }}
    activeOpacity={0.7}
  >
    <Text style={{ color: '#64748b', fontWeight: '600', fontSize: 15 }}>{label}</Text>
  </TouchableOpacity>
);

// ── Sheet header ──
const SheetHeader = ({ title, subtitle }) => (
  <View style={{ marginBottom: 28 }}>
    <Text style={{ fontSize: 20, fontWeight: '800', color: NAVY, letterSpacing: -0.4 }}>{title}</Text>
    {subtitle && <Text style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>{subtitle}</Text>}
  </View>
);

// ── Danger icon wrapper ──
const DangerIcon = ({ icon: Icon, iconColor = '#ef4444', size = 20 }) => (
  <View style={{
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#fef2f2',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, alignSelf: 'center',
  }}>
    <Icon size={size} color={iconColor} />
  </View>
);

// ── Modals ──

const ConfirmRemoveModal = ({ visible, member, onClose, onConfirm, loading }) => {
  const ref = useRef(null);
  useEffect(() => { if (visible) ref.current?.present(); else ref.current?.dismiss(); }, [visible]);
  return (
    <BottomSheetModal
      ref={ref} index={0} snapPoints={['40%']}
      enablePanDownToClose backdropComponent={renderBackdrop}
      onChange={(idx) => { if (idx === -1) onClose(); }}
      backgroundStyle={{ backgroundColor: 'white', borderRadius: 28 }}
      handleIndicatorStyle={{ backgroundColor: '#e2e8f0', width: 36 }}
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: 28, paddingTop: 8, paddingBottom: 32 }}>
        <DangerIcon icon={IconRemoveUser} />
        <Text style={{ fontSize: 17, fontWeight: '800', color: NAVY, textAlign: 'center', marginBottom: 6 }}>Remove member?</Text>
        <Text style={{ color: MUTED, textAlign: 'center', fontSize: 13, lineHeight: 20, marginBottom: 28 }}>
          <Text style={{ fontWeight: '700', color: NAVY }}>{member?.email}</Text> will lose access to this department.
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <GhostButton onPress={onClose} label="Cancel" />
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              onPress={onConfirm} disabled={loading}
              style={{ backgroundColor: '#ef4444', borderRadius: 14, paddingVertical: 15, alignItems: 'center', opacity: loading ? 0.6 : 1 }}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="white" size="small" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Remove</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const ConfirmLeaveModal = ({ visible, groupName, onClose, onConfirm, loading }) => {
  const ref = useRef(null);
  useEffect(() => { if (visible) ref.current?.present(); else ref.current?.dismiss(); }, [visible]);
  return (
    <BottomSheetModal
      ref={ref} index={0} snapPoints={['40%']}
      enablePanDownToClose backdropComponent={renderBackdrop}
      onChange={(idx) => { if (idx === -1) onClose(); }}
      backgroundStyle={{ backgroundColor: 'white', borderRadius: 28 }}
      handleIndicatorStyle={{ backgroundColor: '#e2e8f0', width: 36 }}
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: 28, paddingTop: 8, paddingBottom: 32 }}>
        <DangerIcon icon={IconLogOut} />
        <Text style={{ fontSize: 17, fontWeight: '800', color: NAVY, textAlign: 'center', marginBottom: 6 }}>Leave department?</Text>
        <Text style={{ color: MUTED, textAlign: 'center', fontSize: 13, lineHeight: 20, marginBottom: 28 }}>
          You'll be removed from <Text style={{ fontWeight: '700', color: NAVY }}>{groupName}</Text>.
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <GhostButton onPress={onClose} label="Cancel" />
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              onPress={onConfirm} disabled={loading}
              style={{ backgroundColor: '#ef4444', borderRadius: 14, paddingVertical: 15, alignItems: 'center', opacity: loading ? 0.6 : 1 }}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="white" size="small" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Leave</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const EditGroupModal = ({ visible, onClose, name, setName, description, setDescription, imageUrl, onPickImage, onSave, loading }) => {
  const ref = useRef(null);
  useEffect(() => { if (visible) ref.current?.present(); else ref.current?.dismiss(); }, [visible]);
  return (
    <BottomSheetModal
      ref={ref} index={0} snapPoints={['85%']}
      enablePanDownToClose keyboardBehavior="interactive"
      backdropComponent={renderBackdrop}
      onChange={(idx) => { if (idx === -1) onClose(); }}
      backgroundStyle={{ backgroundColor: 'white', borderRadius: 28 }}
      handleIndicatorStyle={{ backgroundColor: '#e2e8f0', width: 36 }}
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: 28, paddingTop: 8, paddingBottom: 36 }}>
        <SheetHeader title="Edit department" subtitle="Update name, photo, and description." />

        {/* Photo picker */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={{ position: 'relative' }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: '#f1f5f9',
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 2, borderColor: BORDER,
            }}>
              {imageUrl
                ? <Image source={{ uri: imageUrl }} style={{ width: 68, height: 68, borderRadius: 34 }} />
                : <IconUsersGroup size={26} color="#94a3b8" />}
            </View>
            <TouchableOpacity
              onPress={onPickImage}
              style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 26, height: 26, borderRadius: 13,
                backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: 'white',
              }}
            >
              <IconCamera size={12} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <SheetLabel>Name</SheetLabel>
        <SheetInput value={name} onChangeText={setName} placeholder="Department name" style={{ fontWeight: '700' }} />

        <SheetLabel>Description</SheetLabel>
        <SheetInput
          value={description} onChangeText={setDescription}
          placeholder="Brief description (optional)"
          multiline style={{ minHeight: 90, textAlignVertical: 'top', marginBottom: 28 }}
        />

        <PrimaryButton onPress={onSave} disabled={!name.trim()} loading={loading} label="Save changes" />
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const GroupMemberModal = ({ visible, onClose, email, setEmail, onAdd, loading }) => {
  const ref = useRef(null);
  useEffect(() => { if (visible) ref.current?.present(); else ref.current?.dismiss(); }, [visible]);
  return (
    <BottomSheetModal
      ref={ref} index={0} snapPoints={['50%']}
      enablePanDownToClose keyboardBehavior="interactive"
      backdropComponent={renderBackdrop}
      onChange={(idx) => { if (idx === -1) onClose(); }}
      backgroundStyle={{ backgroundColor: 'white', borderRadius: 28 }}
      handleIndicatorStyle={{ backgroundColor: '#e2e8f0', width: 36 }}
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: 28, paddingTop: 8, paddingBottom: 36 }}>
        <SheetHeader title="Add member" subtitle="Invite someone by their email address." />
        <SheetLabel>Email address</SheetLabel>
        <SheetInput
          value={email} onChangeText={setEmail}
          placeholder="member@example.com"
          keyboardType="email-address" autoCapitalize="none"
          style={{ fontWeight: '600', marginBottom: 28 }}
        />
        <PrimaryButton onPress={onAdd} disabled={!email.trim()} loading={loading} label="Add to department" />
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const MemberCalendarModal = ({ visible, member, onClose, events, loading }) => {
  const ref = useRef(null);
  useEffect(() => { if (visible) ref.current?.present(); else ref.current?.dismiss(); }, [visible]);

  const fmt = (date: string, type: 'time' | 'date') => {
    if (!date) return '';
    const d = new Date(date);
    return type === 'time'
      ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <BottomSheetModal
      ref={ref} index={0} snapPoints={['70%']}
      enablePanDownToClose backdropComponent={renderBackdrop}
      onChange={(idx) => { if (idx === -1) onClose(); }}
      backgroundStyle={{ backgroundColor: 'white', borderRadius: 28 }}
      handleIndicatorStyle={{ backgroundColor: '#e2e8f0', width: 36 }}
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8 }}>
        {/* Member header */}
        {member && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <AvatarInitials email={member.email} size={46} />
            <View>
              <Text style={{ color: NAVY, fontSize: 15, fontWeight: '800' }}>{member?.email?.split('@')[0]}'s Plans</Text>
              <Text style={{ color: MUTED, fontSize: 12, marginTop: 1 }}>Recent and upcoming schedule</Text>
            </View>
          </View>
        )}

        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator color={NAVY} size="small" />
          </View>
        ) : events.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <IconCalendar size={22} color="#cbd5e1" />
            </View>
            <Text style={{ color: MUTED, fontWeight: '600', fontSize: 14 }}>No plans scheduled</Text>
          </View>
        ) : (
          <BottomSheetScrollView showsVerticalScrollIndicator={false}>
            {events.map((ev, i) => (
              <View key={i} style={{
                backgroundColor: SURFACE,
                padding: 14, borderRadius: 14, marginBottom: 10,
                flexDirection: 'row', alignItems: 'center', gap: 12,
              }}>
                <View style={{
                  width: 3, height: '100%',
                  backgroundColor: ev.type === 'task' ? '#6366f1' : NAVY,
                  borderRadius: 2, alignSelf: 'stretch'
                }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontWeight: '700', color: NAVY, fontSize: 14 }}>{ev.title}</Text>
                    {ev.type === 'task' && (
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#6366f1' }}>TASK</Text>
                    )}
                  </View>
                  <Text style={{ color: MUTED, fontSize: 12, marginTop: 3 }}>
                    {fmt(ev.start, 'time')} – {fmt(ev.end, 'time')}
                  </Text>
                </View>
              </View>
            ))}
          </BottomSheetScrollView>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
};

// ── Main Page ──

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const groupId = params.groupId;
  const utils = trpc.useUtils();

  const [showAddModal, setShowAddModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);

  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editGroupImageUrl, setEditGroupImageUrl] = useState(null);

  const groupQuery = trpc.group.getGroup.useQuery({ id: groupId }, { enabled: !!groupId });
  const currentUserQuery = trpc.profile.me.useQuery();

  const isLoading = groupQuery.isLoading || currentUserQuery.isLoading;
  const isError = groupQuery.isError;
  const group = groupQuery.data;
  const currentUser = currentUserQuery.data;
  const isAdmin = group?.userId === currentUser?.id;

  const [todayBounds] = useState(() => {
    const s = new Date(); s.setHours(0, 0, 0, 0);
    const e = new Date(); e.setHours(23, 59, 59, 999);
    return { startDate: s.toISOString(), endDate: e.toISOString() };
  });

  const getTeamMemberCalendar = trpc.calendar.getTeamMemberCalendar.useQuery(
    { memberId: selectedMember?.user?.id || selectedMember?.userId || '', groupId, ...todayBounds },
    { enabled: !!selectedMember && !!groupId }
  );

  // Stable 'now' for the query to avoid infinite loops
  const availabilityParams = useMemo(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    d.setMilliseconds(0);
    const start = d.toISOString();
    const end = new Date(d.getTime() + 15 * 60 * 1000).toISOString(); // Fetch 15 mins ahead to be safe
    return { groupId, startDate: start, endDate: end };
  }, [groupId, Math.floor(Date.now() / 60000)]); // Only changes once per minute

  const teamAvailabilityQuery = trpc.calendar.getTeamAvailability.useQuery(
    availabilityParams,
    {
      enabled: !!groupId,
      refetchInterval: 30000 // Poll every 30 seconds
    }
  );
  const teamAvailability = teamAvailabilityQuery.data ?? [];

  const addGroupMember = trpc.group.addGroupMember.useMutation({
    onSuccess: () => { setShowAddModal(false); setMemberEmail(''); utils.group.getGroup.invalidate(); }
  });

  const removeGroupMember = trpc.group.removeGroupMember.useMutation({
    onSuccess: () => { setMemberToRemove(null); utils.group.getGroup.invalidate(); }
  });

  const leaveGroup = trpc.group.leaveGroup.useMutation({
    onSuccess: (res) => { if (res.groupDeleted) router.replace('/dashboard'); else router.back(); }
  });

  const updateGroup = trpc.group.updateGroup.useMutation({
    onSuccess: () => { setShowEditGroupModal(false); utils.group.getGroup.invalidate(); }
  });

  const insets = useSafeAreaInsets();

  // ── Graceful Redirection on Removal ──
  useEffect(() => {
    if (isError) {
      // If we hit an error (e.g. removed from group), redirect after a short delay
      const timer = setTimeout(() => {
        router.replace('/dashboard');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isError]);

  // ── Loading ──
  if (isLoading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: SURFACE }}>
      <ActivityIndicator size="small" color={NAVY} />
      <Text style={{ marginTop: 10, color: MUTED, fontSize: 13 }}>Loading…</Text>
    </View>
  );

  // ── Error ──
  if (isError || !group) {
    return (
      <View style={{ flex: 1, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <AlertCircle color="#ef4444" size={24} />
        </View>
        <Text style={{ color: NAVY, fontSize: 16, fontWeight: '800', textAlign: 'center' }}>Access Revoked</Text>
        <Text style={{ color: MUTED, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
          You no longer have access to this department. Returning to dashboard in 3 seconds...
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/dashboard')}
          style={{ marginTop: 24, paddingVertical: 12, paddingHorizontal: 28, backgroundColor: NAVY, borderRadius: 14 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Return home now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE }}>
      <StatusBar barStyle="dark-content" />

      {/* ── Sheets ── */}
      <GroupMemberModal
        visible={showAddModal} onClose={() => setShowAddModal(false)}
        email={memberEmail} setEmail={setMemberEmail}
        onAdd={() => addGroupMember.mutate({ groupId, email: memberEmail })}
        loading={addGroupMember.isPending}
      />
      <ConfirmRemoveModal
        visible={!!memberToRemove} member={memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={() => removeGroupMember.mutate({ groupId, memberId: memberToRemove.id })}
        loading={removeGroupMember.isPending}
      />
      <ConfirmLeaveModal
        visible={showLeaveConfirm} groupName={group?.name}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={() => leaveGroup.mutate({ groupId })}
        loading={leaveGroup.isPending}
      />
      <EditGroupModal
        visible={showEditGroupModal} onClose={() => setShowEditGroupModal(false)}
        name={editGroupName} setName={setEditGroupName}
        description={editGroupDescription} setDescription={setEditGroupDescription}
        imageUrl={editGroupImageUrl}
        onSave={() => updateGroup.mutate({ id: groupId, name: editGroupName, description: editGroupDescription, imageUrl: editGroupImageUrl })}
        loading={updateGroup.isPending}
      />
      <MemberCalendarModal
        visible={!!selectedMember} member={selectedMember}
        onClose={() => setSelectedMember(null)}
        events={getTeamMemberCalendar.data || []}
        loading={getTeamMemberCalendar.isLoading}
      />
      <AddEventModal
        visible={showAddEventModal} onClose={() => setShowAddEventModal(false)}
        initialGroupId={groupId}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* ── Compact header ── */}
        <View style={{ backgroundColor: '#fff', paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: BORDER }}>

          {/* Top nav row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center' }}
              activeOpacity={0.7}
            >
              <IconBack size={18} />
            </TouchableOpacity>

            {/* Right actions */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => {
                    setEditGroupName(group.name);
                    setEditGroupDescription(group.description || '');
                    setEditGroupImageUrl(group.imageUrl);
                    setShowEditGroupModal(true);
                  }}
                  style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center' }}
                  activeOpacity={0.7}
                >
                  <IconEdit size={16} color="#6b7280" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setShowLeaveConfirm(true)}
                style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' }}
                activeOpacity={0.7}
              >
                <IconLogOut size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Group identity row — horizontal, compact */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 18,
              backgroundColor: '#dcfce7',
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: BORDER,
            }}>
              {group.imageUrl
                ? <Image source={{ uri: group.imageUrl }} style={{ width: 52, height: 52, borderRadius: 16 }} />
                : <IconUsersGroup size={26} color="#16a34a" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: NAVY, letterSpacing: -0.4 }}>{group.name}</Text>
              <Text style={{ color: MUTED, fontSize: 12, fontWeight: '600', marginTop: 2, letterSpacing: 0.5 }}>
                DEPARTMENT · {group.members.length} {group.members.length === 1 ? 'MEMBER' : 'MEMBERS'}
              </Text>
            </View>
          </View>

          {/* Description (if present) */}
          {!!group.description && (
            <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 20, marginTop: 12 }}>
              {group.description}
            </Text>
          )}
        </View>

        {/* ── Members section ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>

          {/* Section header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 1.4 }}>
              Members
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* Schedule button — always visible */}
              <TouchableOpacity
                onPress={() => router.push(`/group/${groupId}/availability`)}
                style={{ backgroundColor: '#06b6d4', paddingVertical: 7, paddingHorizontal: 14, borderRadius: 10, marginRight: 4 }}
                activeOpacity={0.85}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>Calander View</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowAddEventModal(true)}
                style={{ backgroundColor: NAVY, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 10 }}
                activeOpacity={0.85}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>Schedule</Text>
              </TouchableOpacity>

              {/* Add button — admin only */}
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => setShowAddModal(true)}
                  style={{ backgroundColor: 'white', paddingVertical: 7, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  activeOpacity={0.7}
                >
                  <IconPlus color={NAVY} size={12} />
                  <Text style={{ color: NAVY, fontWeight: '700', fontSize: 12 }}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Member list */}
          <View style={{ backgroundColor: 'white', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: BORDER }}>
            {group.members.map((m, i) => {
              const isLastItem = i === group.members.length - 1;
              const isMemberCreator = m.userId === group.userId;
              // Admin can remove others, but cannot remove the group creator (or themselves)
              const canRemove = isAdmin && !isMemberCreator && m.userId !== currentUser?.id;

              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setSelectedMember(m)}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: 14, paddingHorizontal: 16,
                    borderBottomWidth: isLastItem ? 0 : 1,
                    borderBottomColor: BORDER,
                  }}
                  activeOpacity={0.6}
                >
                  <View style={{ position: 'relative' }}>
                    <AvatarInitials email={m.email} size={40} />
                    <View
                      style={{
                        position: 'absolute', bottom: -1, right: -1,
                        width: 14, height: 14, borderRadius: 7,
                        backgroundColor: (function () {
                          const s = teamAvailability.find(a => a.userId === m.userId)?.status;
                          if (s === 'busy' || s === 'ending_soon') return '#ef4444';
                          if (s === 'starting_soon') return '#f59e0b';
                          return '#22c55e';
                        })(),
                        borderWidth: 2, borderColor: 'white',
                        alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      {teamAvailability.find(a => a.userId === m.userId)?.status === 'ending_soon' && (
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'white' }} />
                      )}
                    </View>
                  </View>

                  <View style={{ flex: 1, marginLeft: 13 }}>
                    <Text style={{ fontWeight: '700', color: NAVY, fontSize: 14 }} numberOfLines={1}>
                      {m.email}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      {isMemberCreator && (
                        <View style={{ backgroundColor: '#f0fdf4', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#16a34a', letterSpacing: 0.4 }}>ADMIN</Text>
                        </View>
                      )}
                      {!isMemberCreator && (
                        <Text style={{ fontSize: 12, color: MUTED }}>Member</Text>
                      )}
                      {(function () {
                        const s = teamAvailability.find(a => a.userId === m.userId)?.status;
                        if (s === 'starting_soon') {
                          return (
                            <View style={{ backgroundColor: '#fff7ed', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#ffedd5' }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#f59e0b', letterSpacing: 0.4 }}>STARTING SOON</Text>
                            </View>
                          );
                        }
                        if (s === 'ending_soon') {
                          return (
                            <View style={{ backgroundColor: '#fef2f2', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#fee2e2' }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#ef4444', letterSpacing: 0.4 }}>ENDING SOON</Text>
                            </View>
                          );
                        }
                        return null;
                      })()}
                    </View>
                  </View>

                  {/* Calendar peek indicator */}
                  <View style={{ marginRight: canRemove ? 12 : 0 }}>
                    <IconCalendar size={16} color="#cbd5e1" />
                  </View>

                  {/* Remove — admin-only, not on self or group creator */}
                  {canRemove && (
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); setMemberToRemove(m); }}
                      style={{ padding: 6, marginLeft: 4 }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <IconRemoveUser size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}