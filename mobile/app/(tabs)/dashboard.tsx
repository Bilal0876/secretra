import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar,
  Modal, Pressable, TextInput,
} from 'react-native';
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

const IconBolt = ({ color = 'white', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

const LOG_ITEMS = [
  { id: 1, text: 'Scheduled email to HR',      time: '2 hours ago',          Icon: IconMail,     iconColor: '#e87a6e', bg: '#fff0ee' },
  { id: 2, text: 'Meeting added: Design Sync',  time: 'Yesterday · 4:12 PM',  Icon: IconCalendar, iconColor: '#6366f1', bg: '#eef0ff' },
  { id: 3, text: 'Secretarial review finished', time: 'Yesterday · 1:45 PM',  Icon: IconCheck,    iconColor: '#10b981', bg: '#ecfdf5' },
];

const THEME_BLUE = '#111827'; 

const CreateGroupModal = ({
  visible,
  onClose,
  groupName,
  setGroupName,
  groupDesc,
  setGroupDesc,
  onCreate,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  groupName: string;
  setGroupName: (value: string) => void;
  groupDesc: string;
  setGroupDesc: (value: string) => void;
  onCreate: () => void;
  loading: boolean;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} onPress={onClose}>
      <Pressable style={{ backgroundColor: '#16161f', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
        <View style={{ width: 40, height: 4, backgroundColor: '#ffffff20', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 6 }}>Create Department</Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 24 }}>Add a new group and invite members by email.</Text>

        <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>Department name</Text>
        <View style={{ marginBottom: 16, borderRadius: 14, backgroundColor: '#0d1117', borderWidth: 1, borderColor: '#2b2f3a', paddingHorizontal: 14 }}>
          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Engineering, Sales, HR"
            placeholderTextColor="rgba(255,255,255,0.3)"
            style={{ color: '#fff', minHeight: 44 }}
          />
        </View>

        <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>Description</Text>
        <View style={{ marginBottom: 24, borderRadius: 14, backgroundColor: '#0d1117', borderWidth: 1, borderColor: '#2b2f3a', paddingHorizontal: 14, paddingVertical: 12 }}>
          <TextInput
            value={groupDesc}
            onChangeText={setGroupDesc}
            placeholder="Optional department purpose"
            placeholderTextColor="rgba(255,255,255,0.3)"
            multiline
            style={{ color: '#fff', minHeight: 70 }}
          />
        </View>

        <TouchableOpacity
          onPress={onCreate}
          disabled={loading}
          style={{ backgroundColor: '#06b6d4', borderRadius: 16, paddingVertical: 14, alignItems: 'center', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Create Department</Text>}
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  </Modal>
);

export default function DashboardScreen() {
  const router = useRouter();
  const { data: user, isLoading: isUserLoading } = trpc.profile.me.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: tasks, isLoading: isTasksLoading } = trpc.task.getTasks.useQuery();
  const { data: groups = [], refetch: refetchGroups } = trpc.group.getGroups.useQuery();
  const createGroupMutation = trpc.group.createGroup.useMutation({
    onSuccess: () => {
      setShowCreateGroupModal(false);
      setGroupName('');
      setGroupDesc('');
      refetchGroups();
    },
  });

  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');

  const isLoading = isUserLoading || isTasksLoading;

  const handleCreateGroup = () => {
    if (!groupName.trim()) return;
    createGroupMutation.mutate({
      name: groupName.trim(),
      description: groupDesc.trim() || undefined,
    });
  };

  if (isLoading && !user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME_BLUE }}>
        <ActivityIndicator size="large" color="#e87a6e" />
      </View>
    );
  }

  const activeTasksCount = tasks?.filter((t: any) => t.status !== 'done').length || 0;
  const initials = (user?.name || 'Sarah Johnson')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: '#f6f5f3' }}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_BLUE} />
      <CreateGroupModal
        visible={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        groupName={groupName}
        setGroupName={setGroupName}
        groupDesc={groupDesc}
        setGroupDesc={setGroupDesc}
        onCreate={handleCreateGroup}
        loading={createGroupMutation.isPending}
      />
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        bounces={false}
        contentContainerStyle={{ flexGrow: 1, backgroundColor: '#f6f5f3' }}
        style={{ backgroundColor: THEME_BLUE }}
      >
        <View style={{ flex: 1, backgroundColor: '#f6f5f3' }}>
          
          {/* ── Hero (Special Blue section) ── */}
          <View style={{ backgroundColor: THEME_BLUE, paddingLeft: 20, paddingRight: 20, paddingTop: 60, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <View>
                <Text className="text-white/40 text-[13px] font-semibold mb-1">Good morning</Text>
                <Text className="text-white text-[28px] font-black tracking-tighter" style={{ letterSpacing: -0.6 }}>
                  {user?.name || 'xyz'}
                </Text>
              </View>
              <View style={{ position: 'relative' }}>
                <View className="w-[52px] h-[52px] rounded-[18px] bg-[#e87a6e] items-center justify-center border border-white/10">
                  <Text className="text-white text-[16px] font-black">{initials}</Text>
                </View>
                <View style={{
                  position: 'absolute', top: -5, right: -5,
                  width: 20, height: 20, borderRadius: 10,
                  backgroundColor: '#ff3b30', borderWidth: 3, borderColor: THEME_BLUE,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text className="text-white text-[9px] font-black">3</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row' }}>
              {[today, `${activeTasksCount} tasks pending`].map((label, i, arr) => (
                <View key={label} className="flex-row items-center bg-white/5 border border-white/10" style={{
                  paddingHorizontal: 16, paddingVertical: 8,
                  borderRadius: 14, marginRight: i < arr.length - 1 ? 10 : 0
                }}>
                  {i === 0 && <View className="w-1.5 h-1.5 rounded-full bg-[#e87a6e] mr-1.5" />}
                  <Text className="text-white/60 text-[12px] font-semibold">{label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Light body ── */}
          <View style={{ 
            backgroundColor: '#f6f5f3', 
            borderTopLeftRadius: 36, 
            borderTopRightRadius: 36, 
            paddingLeft: 20, 
            paddingRight: 20, 
            paddingTop: 32, 
            paddingBottom: 110,
            marginTop: -30,
            flex: 1,
            width: '100%',
          }}>

            {/* Section label */}
            <Text className="text-[11px] font-extrabold text-[#9ca3af] uppercase mb-4 ml-1" style={{ letterSpacing: 1.4 }}>
              Overview
            </Text>

            {/* Stats Grid - Optimization for Mobile Height */}
            <View style={{ flexDirection: 'row', marginBottom: 20, width: '100%' }}>
              {[
                { num: String(activeTasksCount),  label: 'Tasks',  Icon: IconCheck,    color: '#e87a6e', bg: '#fff0ee', badge: activeTasksCount > 0 ? `+${activeTasksCount}` : null },
                { num: '0',  label: 'Events', Icon: IconCalendar, color: '#6366f1', bg: '#eef0ff', badge: null },
                { num: '0',  label: 'Drafts', Icon: IconMail,     color: '#10b981', bg: '#ecfdf5', badge: null },
              ].map((s, i, arr) => (
                <View key={s.label} className="bg-white rounded-[22px]" style={{
                  flex: 1,
                  padding: 12, // Reduced from 16
                  marginRight: i < arr.length - 1 ? 10 : 0, // Reduced from 12
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View className="w-[30px] h-[30px] rounded-[9px] items-center justify-center" style={{ backgroundColor: s.bg }}>
                      <s.Icon color={s.color} size={14} />
                    </View>
                    {s.badge && (
                      <View style={{ backgroundColor: s.bg }} className="px-[6px] py-[1.5px] rounded-[6px]">
                        <Text style={{ color: s.color }} className="text-[9px] font-extrabold">{s.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-[24px] font-black text-[#0f172a] tracking-tight" style={{ lineHeight: 28 }}>{s.num}</Text>
                  <Text className="text-[10px] text-[#9ca3af] font-bold mt-1">{s.label}</Text>
                </View>
              ))}
            </View>

            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Text className="text-[13px] font-extrabold text-[#0f172a]">Departments</Text>
                <TouchableOpacity onPress={() => setShowCreateGroupModal(true)} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#e0f2fe' }}>
                  <Text style={{ color: '#0c4a6e', fontSize: 12, fontWeight: '700' }}>New</Text>
                </TouchableOpacity>
              </View>

              {groups.length ? (
                <View style={{ gap: 12 }}>
                  {groups.map((group: any) => (
                    <TouchableOpacity
                      key={group.id}
                      activeOpacity={0.85}
                      onPress={() => router.push({ pathname: '/group/[groupId]', params: { groupId: group.id } })}
                      style={{ backgroundColor: '#fff', borderRadius: 22, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800', marginBottom: 4 }}>{group.name}</Text>
                          {group.description ? <Text style={{ color: '#6b7280', fontSize: 12 }}>{group.description}</Text> : <Text style={{ color: '#9ca3af', fontSize: 12 }}>No description added</Text>}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: '#06b6d4', fontSize: 12, fontWeight: '700' }}>{group.members?.length ?? 0} members</Text>
                          <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 6 }}>Tap to manage</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={{ backgroundColor: '#fff', borderRadius: 22, padding: 18, alignItems: 'center' }}>
                  <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '700', marginBottom: 6 }}>No departments yet</Text>
                  <Text style={{ color: '#6b7280', fontSize: 12, textAlign: 'center' }}>Create a department to group events and invite members by email.</Text>
                </View>
              )}
            </View>

            {/* Meeting card */}
            <TouchableOpacity
              activeOpacity={0.9}
              className="bg-[#e87a6e] rounded-[24px]"
              style={{ 
                padding: 18, 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginBottom: 12,
                shadowColor: '#e87a6e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10,
              }}
            >
              <View style={{ flex: 1, paddingRight: 10 }}>
                <View className="self-start bg-white/25 rounded-[10px] px-2.5 py-1 mb-2.5">
                  <Text className="text-white text-[10px] font-extrabold uppercase tracking-widest">NEXT MEETING</Text>
                </View>
                <Text className="text-white text-[18px] font-black tracking-tighter leading-5 mb-1.5">
                  Project Strategy Review
                </Text>
                <Text className="text-white/70 text-[12px] font-semibold">Today · 2:30 – 3:30 PM</Text>
              </View>
              <View className="w-[52px] h-[52px] rounded-[18px] bg-white/20 items-center justify-center">
                <IconUsers color="white" size={22} />
              </View>
            </TouchableOpacity>
            {/* AI banner */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={{ padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 24, backgroundColor: THEME_BLUE, borderRadius: 24 }}
            >
              <View className="w-11 h-11 rounded-[15px] bg-[#e87a6e] items-center justify-center mr-4">
                <IconBolt color="white" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text className="text-white text-[14px] font-extrabold mb-0.5">3 follow-ups due this week</Text>
                <Text className="text-white/40 text-[11px] font-semibold">Tap to review & auto-draft replies</Text>
              </View>
              <Text className="text-white/20 text-[22px] ml-2">›</Text>
            </TouchableOpacity>

            {/* Log */}
            <Text className="text-[11px] font-extrabold text-[#9ca3af] uppercase mb-4 ml-1" style={{ letterSpacing: 1.4 }}>
              Secretarial log
            </Text>
            <View className="bg-white rounded-[24px] overflow-hidden mb-5">
              {LOG_ITEMS.map((item, i) => (
                <View key={item.id} style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 20, paddingVertical: 14, // Reduced from 16
                  borderBottomWidth: i < LOG_ITEMS.length - 1 ? 1 : 0,
                  borderBottomColor: '#f8fafc',
                }}>
                  <View className="w-10 h-10 rounded-[13px] items-center justify-center mr-3.5" style={{ backgroundColor: item.bg }}>
                    <item.Icon color={item.iconColor} size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="text-[#0f172a] text-[14px] font-bold">{item.text}</Text>
                    <Text className="text-[#9ca3af] text-[11px] font-semibold mt-1">{item.time}</Text>
                  </View>
                  <Text className="text-[#d1d5db] text-[20px] ml-2">›</Text>
                </View>
              ))}
            </View>

          </View>
        </View>
      </ScrollView>
    </View>
  );
}
