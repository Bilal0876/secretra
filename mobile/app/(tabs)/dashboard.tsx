import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar,
} from 'react-native';
import {
  BottomSheetModal, BottomSheetView, BottomSheetScrollView,
  BottomSheetTextInput, BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import Svg, { Path, Rect, Line, Circle, Polyline, Polygon } from 'react-native-svg';
import { trpc } from '../../utils/trpc';

// ── Icons ──────────────────────────────────────────────────────────────────────

const IconCheck = ({ color = '#e87a6e', size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 11l3 3L22 4" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconCalendar = ({ color = '#6366f1', size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="4" width="18" height="18" rx="3" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);

const IconMail = ({ color = '#10b981', size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="22,6 12,13 2,6" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconUsers = ({ color = 'white', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth="2" />
    <Path d="M23 21v-2a4 4 0 00-3-3.87" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 3.13a4 4 0 010 7.75" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconBell = ({ color = 'white', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconChevron = ({ color = '#9ca3af', size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconPlus = ({ color = '#fff', size = 14 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);

const LOG_ITEMS = [
  { id: 1, text: 'Scheduled email to HR', time: '2 hours ago', Icon: IconMail, iconColor: '#e87a6e', bg: '#fff0ee' },
  { id: 2, text: 'Meeting added: Design Sync', time: 'Yesterday · 4:12 PM', Icon: IconCalendar, iconColor: '#6366f1', bg: '#eef0ff' },
  { id: 3, text: 'Secretarial review finished', time: 'Yesterday · 1:45 PM', Icon: IconCheck, iconColor: '#10b981', bg: '#ecfdf5' },
];

const DARK = '#111827';

// ── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();

  const { data: user, isLoading: isUserLoading } = trpc.profile.me.useQuery(undefined, {
    refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000,
  });
  const { data: tasks, isLoading: isTasksLoading } = trpc.task.getTasks.useQuery();
  const { data: groups = [], refetch: refetchGroups } = trpc.group.getGroups.useQuery();
  const { data: invites = [], refetch: refetchInvites, isLoading: isInvitesLoading } = trpc.group.getInvites.useQuery();
  const { data: overview, isLoading: isOverviewLoading } = trpc.calendar.getDashboardOverview.useQuery();

  const invitesModalRef = useRef<BottomSheetModal>(null);
  const createGroupModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['100%'], []);

  const acceptInviteMutation = trpc.group.acceptInvite.useMutation({
    onSuccess: () => { refetchInvites(); refetchGroups(); },
  });
  const rejectInviteMutation = trpc.group.rejectInvite.useMutation({
    onSuccess: () => refetchInvites(),
  });
  const createGroupMutation = trpc.group.createGroup.useMutation({
    onSuccess: () => {
      createGroupModalRef.current?.dismiss();
      setGroupName(''); setGroupDesc('');
      refetchGroups();
    },
  });

  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');

  const isLoading = isUserLoading || isTasksLoading || isOverviewLoading;
  const inviteCount = invites?.length ?? 0;
  const activeTasksCount = tasks?.filter((t: any) => t.status !== 'done').length || 0;

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />
  );

  if (isLoading && !user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: DARK }}>
        <ActivityIndicator size="large" color="#e87a6e" />
      </View>
    );
  }

  const STATS = [
    { num: String(activeTasksCount), label: 'Tasks', Icon: IconCheck, color: '#e87a6e', bg: '#fff0ee' },
    { num: String(overview?.todayCount || 0), label: 'Events', Icon: IconCalendar, color: '#6366f1', bg: '#eef0ff' },
    { num: '3', label: 'Drafts', Icon: IconMail, color: '#10b981', bg: '#ecfdf5' },
  ];

  const mappedInvites = invites.map((inv: any) => ({
    groupId: inv.groupId, groupName: inv.group?.name || 'Unknown',
    groupDescription: inv.group?.description,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: '#f6f5f3' }}>
      <StatusBar barStyle="light-content" backgroundColor={DARK} />

      {/* ── Invites Bottom Sheet ─────────────────────────────────────────────── */}
      <BottomSheetModal
        ref={invitesModalRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableDynamicSizing={false}   // ← add this
        topInset={0}                  // ← add this
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 40, height: 4 }}
        backgroundStyle={{ backgroundColor: '#16161f' }}
      >
        <BottomSheetView style={{ flex: 1, padding: 24, paddingBottom: 44 }}>
          <Text style={M.sheetTitle}>Department Invites</Text>
          <Text style={M.sheetSub}>
            {mappedInvites.length === 0
              ? 'No pending invites'
              : `${mappedInvites.length} pending invite${mappedInvites.length > 1 ? 's' : ''}`}
          </Text>

          {isInvitesLoading ? (
            <View style={{ height: 160, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color="#e87a6e" size="large" />
            </View>
          ) : mappedInvites.length === 0 ? (
            <View style={{ height: 120, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center' }}>Nothing here yet</Text>
            </View>
          ) : (
            <BottomSheetScrollView style={{ flex: 1, marginBottom: 16 }} showsVerticalScrollIndicator={false}>
              {mappedInvites.map((invite) => {
                const isAccepting = acceptInviteMutation.isPending && acceptInviteMutation.variables?.groupId === invite.groupId;
                const isRejecting = rejectInviteMutation.isPending && rejectInviteMutation.variables?.groupId === invite.groupId;

                return (
                  <View key={invite.groupId} style={M.inviteCard}>
                    <Text style={M.inviteName}>{invite.groupName}</Text>
                    {invite.groupDescription && (
                      <Text style={M.inviteDesc}>{invite.groupDescription}</Text>
                    )}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                      <TouchableOpacity
                        onPress={() => rejectInviteMutation.mutate({ groupId: invite.groupId })}
                        disabled={isRejecting || isAccepting}
                        style={[M.inviteBtnReject, (isRejecting || isAccepting) && { opacity: 0.5 }]}
                      >
                        {isRejecting
                          ? <ActivityIndicator color="#ff6b6b" size="small" />
                          : <Text style={{ color: '#ff6b6b', fontWeight: '600', fontSize: 13 }}>Decline</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => acceptInviteMutation.mutate({ groupId: invite.groupId })}
                        disabled={isAccepting || isRejecting}
                        style={[M.inviteBtnAccept, (isAccepting || isRejecting) && { opacity: 0.6 }]}
                      >
                        {isAccepting
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Accept</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </BottomSheetScrollView>
          )}

          <TouchableOpacity onPress={() => invitesModalRef.current?.dismiss()} style={M.closeBtnDark}>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Close</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>

      {/* ── Create Department Bottom Sheet ────────────────────────────────────── */}
      <BottomSheetModal
        ref={createGroupModalRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        keyboardBehavior="interactive"
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 40, height: 4 }}
        backgroundStyle={{ backgroundColor: '#16161f' }}
      >
        <BottomSheetView style={{ flex: 1, padding: 24, paddingBottom: 44 }}>
          <Text style={M.sheetTitle}>Create Department</Text>
          <Text style={M.sheetSub}>Group events and invite members by email.</Text>

          <Text style={M.fieldLabel}>Name</Text>
          <View style={M.inputWrap}>
            <BottomSheetTextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Engineering, Sales, HR…"
              placeholderTextColor="rgba(255,255,255,0.25)"
              style={M.textInput}
            />
          </View>

          <Text style={[M.fieldLabel, { marginTop: 14 }]}>Description</Text>
          <View style={[M.inputWrap, { paddingVertical: 12, marginBottom: 24 }]}>
            <BottomSheetTextInput
              value={groupDesc}
              onChangeText={setGroupDesc}
              placeholder="Optional department purpose"
              placeholderTextColor="rgba(255,255,255,0.25)"
              multiline
              style={[M.textInput, { minHeight: 60 }]}
            />
          </View>

          <TouchableOpacity
            onPress={() => { if (groupName.trim()) createGroupMutation.mutate({ name: groupName.trim(), description: groupDesc.trim() || undefined }); }}
            disabled={createGroupMutation.isPending || !groupName.trim()}
            style={[M.createBtn, (createGroupMutation.isPending || !groupName.trim()) && { opacity: 0.5 }]}
          >
            {createGroupMutation.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Create Department</Text>}
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>

      {/* ── Scrollable body ────────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        style={{ backgroundColor: DARK }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* ── Hero ── */}
        <View style={S.hero}>
          {/* Greeting row */}
          <View style={S.heroRow}>
            <View>
              <Text style={S.greeting}>{getGreeting()}</Text>
              <Text style={S.heroName}>{user?.name || 'there'}</Text>
            </View>
            <TouchableOpacity onPress={() => invitesModalRef.current?.present()} style={{ position: 'relative' }}>
              <View style={S.bellBtn}>
                <IconBell color="rgba(255,255,255,0.85)" size={18} />
              </View>
              {inviteCount > 0 && (
                <View style={S.badge}>
                  <Text style={S.badgeText}>{inviteCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Date + tasks pill row */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <View style={S.pill}>
              <View style={S.pillDot} />
              <Text style={S.pillText}>{today}</Text>
            </View>
            <View style={S.pill}>
              <Text style={S.pillText}>{activeTasksCount} tasks pending</Text>
            </View>
          </View>

          {/* ── Stat row — inline, compact ── */}
          <View style={S.statsRow}>
            {STATS.map((s, i) => (
              <React.Fragment key={s.label}>
                <View style={S.statItem}>
                  <View style={[S.statIcon, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                    <s.Icon color={s.color} size={14} />
                  </View>
                  <View>
                    <Text style={S.statNum}>{s.num}</Text>
                    <Text style={S.statLabel}>{s.label}</Text>
                  </View>
                </View>
                {i < STATS.length - 1 && <View style={S.statDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── Body ── */}
        <View style={S.body}>

          {/* ── Next Meeting card — slim ── */}
          {overview?.nextEvent ? (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => router.push('/(tabs)/calendar')}
              style={S.meetingCard}
            >
              <View style={{ flex: 1 }}>
                <Text style={S.meetingTag}>NEXT MEETING</Text>
                <Text style={S.meetingTitle} numberOfLines={1}>{overview.nextEvent.title}</Text>
                <Text style={S.meetingMeta}>
                  {overview.nextEvent.group?.name ? `${overview.nextEvent.group.name} · ` : ''}
                  {formatTime(overview.nextEvent.startAt)} – {formatTime(overview.nextEvent.endAt)}
                </Text>
              </View>
              <View style={S.meetingIcon}>
                <IconUsers color="white" size={18} />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={S.meetingEmpty}>
              <View style={S.meetingEmptyIcon}>
                <IconCalendar color="#94a3b8" size={18} />
              </View>
              <View>
                <Text style={S.meetingEmptyTitle}>No upcoming meetings</Text>
                <Text style={S.meetingEmptyMeta}>You're free — or schedule something new.</Text>
              </View>
            </View>
          )}

          {/* ── Departments ── */}
          <View style={S.sectionHeader}>
            <Text style={S.sectionLabel}>DEPARTMENTS</Text>
            <TouchableOpacity onPress={() => createGroupModalRef.current?.present()} style={S.newBtn}>
              <IconPlus color="#0c4a6e" size={11} />
              <Text style={S.newBtnText}>New</Text>
            </TouchableOpacity>
          </View>

          {groups.length > 0 ? (
            <View style={S.card}>
              {(groups as any[]).map((group: any, i: number) => (
                <TouchableOpacity
                  key={group.id}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/group/[groupId]', params: { groupId: group.id } })}
                  style={[S.groupRow, i < groups.length - 1 && S.groupRowDivider]}
                >
                  <View style={S.groupInitial}>
                    <Text style={S.groupInitialText}>{group.name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.groupName}>{group.name}</Text>
                    <Text style={S.groupDesc} numberOfLines={1}>{group.description || 'No description'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={S.groupMembers}>{group.members?.length ?? 0} members</Text>
                    <IconChevron size={14} color="#d1d5db" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={[S.card, { padding: 20, alignItems: 'center' }]}>
              <Text style={{ color: '#374151', fontSize: 13, fontWeight: '600', marginBottom: 4 }}>No departments yet</Text>
              <Text style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
                Create a department to group events and invite members.
              </Text>
              <TouchableOpacity
                onPress={() => createGroupModalRef.current?.present()}
                style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: DARK, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 }}
              >
                <IconPlus color="#fff" size={12} />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Create department</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Secretarial Log ── */}
          <View style={[S.sectionHeader, { marginTop: 24 }]}>
            <Text style={S.sectionLabel}>SECRETARIAL LOG</Text>
          </View>

          <View style={S.card}>
            {LOG_ITEMS.map((item, i) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                style={[S.logRow, i < LOG_ITEMS.length - 1 && S.logRowDivider]}
              >
                <View style={[S.logIcon, { backgroundColor: item.bg }]}>
                  <item.Icon color={item.iconColor} size={15} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.logText}>{item.text}</Text>
                  <Text style={S.logMeta}>{item.time}</Text>
                </View>
                <IconChevron size={14} color="#d1d5db" />
              </TouchableOpacity>
            ))}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

// ── Style helpers ──────────────────────────────────────────────────────────────

const M = {
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: '700' as const, marginBottom: 4 },
  sheetSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 22 },
  fieldLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.6, marginBottom: 8 },
  inputWrap: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 13, paddingHorizontal: 14, marginBottom: 4,
  },
  textInput: { color: '#fff', minHeight: 44, fontSize: 14 },
  inviteCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 14, marginBottom: 10,
  },
  inviteName: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  inviteDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 3 },
  inviteBtnReject: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(255,107,107,0.5)',
    borderRadius: 10, paddingVertical: 9, alignItems: 'center' as const,
  },
  inviteBtnAccept: {
    flex: 1, backgroundColor: '#06b6d4',
    borderRadius: 10, paddingVertical: 9, alignItems: 'center' as const,
  },
  closeBtnDark: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center' as const, marginTop: 4,
  },
  createBtn: {
    backgroundColor: '#06b6d4', borderRadius: 14, paddingVertical: 14, alignItems: 'center' as const,
  },
};

const S = {
  hero: { backgroundColor: DARK, paddingTop: 58, paddingHorizontal: 20, paddingBottom: 32 },
  heroRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const },
  greeting: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '500' as const, marginBottom: 3 },
  heroName: { color: '#fff', fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.5 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  badge: {
    position: 'absolute' as const, top: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#ff3b30', borderWidth: 2, borderColor: DARK,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' as const },
  pill: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#e87a6e', marginRight: 6 },
  pillText: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '500' as const },
  statsRow: {
    flexDirection: 'row' as const, marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8,
  },
  statItem: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 9 },
  statIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center' as const, justifyContent: 'center' as const },
  statNum: { color: '#fff', fontSize: 18, fontWeight: '800' as const, lineHeight: 22 },
  statLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 4 },
  body: {
    backgroundColor: '#f6f5f3', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 110, marginTop: -20,
  },
  meetingCard: {
    backgroundColor: '#e87a6e', borderRadius: 18, padding: 16,
    flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 20, gap: 12,
  },
  meetingTag: { color: 'rgba(255,255,255,0.65)', fontSize: 9, fontWeight: '800' as const, letterSpacing: 1.2, marginBottom: 5 },
  meetingTitle: { color: '#fff', fontSize: 16, fontWeight: '800' as const, marginBottom: 4, letterSpacing: -0.3 },
  meetingMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' as const },
  meetingIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center' as const, justifyContent: 'center' as const },
  meetingEmpty: {
    backgroundColor: '#fff', borderRadius: 18, padding: 14,
    flexDirection: 'row' as const, alignItems: 'center' as const,
    gap: 12, marginBottom: 20, borderWidth: 1, borderColor: '#f0f0f0',
  },
  meetingEmptyIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#f8fafc', alignItems: 'center' as const, justifyContent: 'center' as const },
  meetingEmptyTitle: { color: '#374151', fontSize: 13, fontWeight: '700' as const },
  meetingEmptyMeta: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  sectionHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '700' as const, color: '#9ca3af', letterSpacing: 1 },
  newBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: '#e0f2fe', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8 },
  newBtnText: { color: '#0c4a6e', fontSize: 11, fontWeight: '700' as const },
  card: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#f0f0f0', overflow: 'hidden' as const },
  groupRow: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 12, paddingHorizontal: 14, gap: 11 },
  groupRowDivider: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  groupInitial: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#f0fdf4', alignItems: 'center' as const, justifyContent: 'center' as const },
  groupInitialText: { color: '#16a34a', fontSize: 14, fontWeight: '800' as const },
  groupName: { color: '#111827', fontSize: 14, fontWeight: '700' as const },
  groupDesc: { color: '#9ca3af', fontSize: 12, marginTop: 1 },
  groupMembers: { color: '#06b6d4', fontSize: 11, fontWeight: '700' as const },
  logRow: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 12, paddingHorizontal: 14, gap: 12 },
  logRowDivider: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  logIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center' as const, justifyContent: 'center' as const },
  logText: { color: '#111827', fontSize: 13, fontWeight: '600' as const },
  logMeta: { color: '#9ca3af', fontSize: 11, marginTop: 2 },
};