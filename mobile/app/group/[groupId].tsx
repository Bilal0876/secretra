import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Circle } from 'react-native-svg';
import { trpc } from '../../utils/trpc';

const IconBack = ({ color = '#111827', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconPlus = ({ color = '#fff', size = 16 }) => (
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

const IconUser = ({ color = '#6b7280', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
    <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconUsersGroup = ({ size = 40, color = '#16a34a' }) => (
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

const IconEdit = ({ color = '#6b7280', size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconCamera = ({ color = '#6b7280', size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth="2" />
  </Svg>
);

const AvatarInitials = ({ email }: { email: string }) => {
  const initials = email.slice(0, 2).toUpperCase();
  const colors = [
    { bg: '#ede9fe', text: '#7c3aed' },
    { bg: '#dbeafe', text: '#2563eb' },
    { bg: '#dcfce7', text: '#16a34a' },
    { bg: '#fce7f3', text: '#db2777' },
    { bg: '#ffedd5', text: '#ea580c' },
    { bg: '#e0f2fe', text: '#0284c7' },
  ];
  const color = colors[email.charCodeAt(0) % colors.length];
  return (
    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: color.text, fontWeight: '700', fontSize: 15 }}>{initials}</Text>
    </View>
  );
};

type GroupMember = {
  id: string;
  email: string;
  userId?: string | null;
  status?: 'pending' | 'accepted';
  user?: { id: string } | null;
};

type GroupWithMembers = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  members: GroupMember[];
};

const ConfirmRemoveModal = ({
  visible,
  member,
  onClose,
  onConfirm,
  loading,
}: {
  visible: boolean;
  member: GroupMember | null;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable
      style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
      onPress={onClose}
    >
      <Pressable style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360 }}>
        <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <IconRemoveUser size={22} color="#ef4444" />
        </View>
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 8 }}>Remove member?</Text>
        <Text style={{ color: '#6b7280', fontSize: 14, lineHeight: 20, marginBottom: 24 }}>
          <Text style={{ fontWeight: '600', color: '#374151' }}>{member?.email}</Text> will be removed from this department.
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={onClose}
            style={{ flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center' }}
          >
            <Text style={{ color: '#374151', fontWeight: '600', fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onConfirm}
            disabled={loading}
            style={{ flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: '#ef4444', alignItems: 'center', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Remove</Text>}
          </TouchableOpacity>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

const ConfirmLeaveModal = ({
  visible,
  groupName,
  onClose,
  onConfirm,
  loading,
}: {
  visible: boolean;
  groupName: string;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable
      style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
      onPress={onClose}
    >
      <Pressable style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360 }}>
        <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <IconRemoveUser size={22} color="#ef4444" />
        </View>
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 8 }}>Leave department?</Text>
        <Text style={{ color: '#6b7280', fontSize: 14, lineHeight: 20, marginBottom: 24 }}>
          You will be removed from <Text style={{ fontWeight: '600', color: '#374151' }}>{groupName}</Text>. If you're the last member, the department will be deleted.
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={onClose}
            style={{ flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center' }}
          >
            <Text style={{ color: '#374151', fontWeight: '600', fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onConfirm}
            disabled={loading}
            style={{ flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: '#ef4444', alignItems: 'center', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Leave</Text>}
          </TouchableOpacity>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

const EditGroupModal = ({
  visible,
  onClose,
  name,
  setName,
  description,
  setDescription,
  imageUrl,
  onPickImage,
  onTakePhoto,
  onSave,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  imageUrl: string | null;
  onPickImage: () => void;
  onTakePhoto: () => void;
  onSave: () => void;
  loading: boolean;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={onClose}>
      <Pressable style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }} onPress={(e) => e.stopPropagation()}>
        <View style={{ width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 24 }} />
        <Text style={{ color: '#111827', fontSize: 20, fontWeight: '800', marginBottom: 6 }}>Edit Department</Text>
        <Text style={{ color: '#9ca3af', fontSize: 13, marginBottom: 24 }}>Update department details and photo.</Text>

        {/* Image Section */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={{ position: 'relative' }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#e5e7eb' }}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={{ width: 76, height: 76, borderRadius: 38 }} />
              ) : (
                <IconUsersGroup size={32} color="#9ca3af" />
              )}
            </View>
            <View style={{ position: 'absolute', bottom: 0, right: 0, flexDirection: 'row', gap: 4 }}>
              <TouchableOpacity onPress={onPickImage} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' }}>
                <IconCamera size={14} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onTakePhoto} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' }}>
                <IconCamera size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: '#374151', fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Department Name</Text>
          <TextInput
            placeholder="Department name"
            placeholderTextColor="#9ca3af"
            style={{ backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, fontSize: 15, color: '#111827' }}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: '#374151', fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Description</Text>
          <TextInput
            placeholder="Brief description (optional)"
            placeholderTextColor="#9ca3af"
            multiline
            style={{ backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, fontSize: 15, color: '#111827', minHeight: 80, textAlignVertical: 'top' }}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <TouchableOpacity
          onPress={onSave}
          disabled={loading || !name.trim()}
          style={{
            backgroundColor: '#111827',
            borderRadius: 16,
            paddingVertical: 15,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            opacity: loading || !name.trim() ? 0.4 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <IconEdit color="#fff" size={16} />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  </Modal>
);

const GroupMemberModal = ({
  visible,
  onClose,
  email,
  setEmail,
  onAdd,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  email: string;
  setEmail: (value: string) => void;
  onAdd: () => void;
  loading: boolean;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={onClose}>
      <Pressable style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
        <View style={{ width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 24 }} />
        <Text style={{ color: '#111827', fontSize: 20, fontWeight: '800', marginBottom: 6 }}>Add member</Text>
        <Text style={{ color: '#9ca3af', fontSize: 13, marginBottom: 24 }}>Invite someone to this department via their email.</Text>

        <Text style={{ color: '#374151', fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Email address</Text>
        <View style={{ marginBottom: 24, borderRadius: 14, backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#e5e7eb', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="member@example.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ color: '#111827', minHeight: 48, flex: 1, fontSize: 15 }}
          />
        </View>

        <TouchableOpacity
          onPress={onAdd}
          disabled={loading || !email.trim()}
          style={{
            backgroundColor: '#111827',
            borderRadius: 16,
            paddingVertical: 15,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            opacity: loading || !email.trim() ? 0.4 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <IconPlus color="#fff" size={16} />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Add member</Text>
            </>
          )}
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  </Modal>
);

const MemberCalendarModal = ({
  visible,
  member,
  onClose,
  events,
  loading,
}: {
  visible: boolean;
  member: GroupMember | null;
  onClose: () => void;
  events: any[];
  loading: boolean;
}) => {
  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '85%' }}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={{ width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 }}>
            {member && <AvatarInitials email={member.email} />}
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#111827', fontSize: 18, fontWeight: '800' }}>{member?.email}</Text>
              <Text style={{ color: '#9ca3af', fontSize: 13 }}>Availability</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20, color: '#6b7280' }}>×</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#111827" size="large" style={{ marginVertical: 32 }} />
          ) : events.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <IconCalendar color="#10b981" size={32} />
              </View>
              <Text style={{ color: '#111827', fontSize: 14, fontWeight: '700', marginBottom: 4 }}>No events scheduled</Text>
              <Text style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center' }}>This member is free and available</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={true}>
              <View style={{ gap: 10 }}>
                {events.map((event: any, idx: number) => (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: '#f9fafb',
                      borderRadius: 14,
                      padding: 14,

                    }}
                  >
                    <Text style={{ color: '#111827', fontSize: 13, fontWeight: '700', marginBottom: 4 }} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <IconCalendar color="#6b7280" size={14} />
                      <Text style={{ color: '#6b7280', fontSize: 12 }}>
                        {formatDate(event.startAt)} • {formatTime(event.startAt)} - {formatTime(event.endAt)}
                      </Text>
                    </View>
                    {event.location && (
                      <Text style={{ color: '#9ca3af', fontSize: 11, marginTop: 6 }}>📍 {event.location}</Text>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const EmptyMembers = ({ onAdd }: { onAdd: () => void }) => (
  <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 36, alignItems: 'center', borderWidth: 1.5, borderColor: '#f3f4f6', borderStyle: 'dashed' }}>
    <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
      <IconUsersGroup size={36} color="#d1d5db" />
    </View>
    <Text style={{ color: '#111827', fontSize: 16, fontWeight: '800', marginBottom: 6 }}>No members yet</Text>
    <Text style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24, maxWidth: 220 }}>
      This department is empty. Add members using their account email.
    </Text>
    <TouchableOpacity
      onPress={onAdd}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111827', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 }}
    >
      <IconPlus color="#fff" size={14} />
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Add first member</Text>
    </TouchableOpacity>
  </View>
);

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId?: string }>();
  const groupId = typeof params.groupId === 'string' ? params.groupId : '';
  const utils = trpc.useUtils();

  const groupQuery = trpc.group.getGroup.useQuery({ id: groupId }, { enabled: !!groupId });
  const group = groupQuery.data as GroupWithMembers | undefined;
  const { isLoading, isError } = groupQuery;

  const { data: currentUser } = trpc.profile.me.useQuery();
  const isAdmin = group?.userId === currentUser?.id;

  const [showAddModal, setShowAddModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [memberCalendarEvents, setMemberCalendarEvents] = useState<any[]>([]);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editGroupImageUrl, setEditGroupImageUrl] = useState<string | null>(null);

  const selectedMemberId = selectedMember?.user?.id ?? selectedMember?.userId;

  const teamCalendarRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 30);
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, []);

  const getTeamMemberCalendar = trpc.calendar.getTeamMemberCalendar.useQuery(
    {
      memberId: selectedMemberId || '',
      groupId,
      startDate: selectedMemberId ? teamCalendarRange.startDate : undefined,
      endDate: selectedMemberId ? teamCalendarRange.endDate : undefined,
    },
    { enabled: !!selectedMemberId && !!groupId }
  );

  const addGroupMember = trpc.group.addGroupMember.useMutation({
    onSuccess: async () => {
      setMemberEmail('');
      setShowAddModal(false);
      await utils.group.getGroup.invalidate({ id: groupId });
      await utils.group.getGroups.invalidate();
    },
  });

  const removeGroupMember = trpc.group.removeGroupMember.useMutation({
    onSuccess: async () => {
      setMemberToRemove(null);
      await utils.group.getGroup.invalidate({ id: groupId });
      await utils.group.getGroups.invalidate();
    },
  });

  const leaveGroup = trpc.group.leaveGroup.useMutation({
    onSuccess: async (result) => {
      setShowLeaveConfirm(false);
      await utils.group.getGroups.invalidate();
      if (result.groupDeleted) {
        router.replace('/(tabs)/dashboard');
      } else {
        router.back();
      }
    },
  });

  const updateGroup = trpc.group.updateGroup.useMutation({
    onSuccess: async () => {
      setShowEditGroupModal(false);
      await utils.group.getGroup.invalidate({ id: groupId });
      await utils.group.getGroups.invalidate();
    },
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setEditGroupImageUrl(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setEditGroupImageUrl(result.assets[0].uri);
    }
  };

  const handleAddMember = () => {
    if (!memberEmail.trim() || !groupId) return;
    addGroupMember.mutate({ groupId, email: memberEmail.trim().toLowerCase() });
  };

  const handleConfirmRemove = () => {
    if (!memberToRemove || !groupId) return;
    removeGroupMember.mutate({ groupId, memberId: memberToRemove.id });
  };

  const handleOpenEditGroup = () => {
    if (!group) return;
    setEditGroupName(group.name);
    setEditGroupDescription(group.description || '');
    setEditGroupImageUrl(group.imageUrl);
    setShowEditGroupModal(true);
  };

  const handleSaveGroup = () => {
    if (!groupId || !editGroupName.trim()) return;
    updateGroup.mutate({
      id: groupId,
      name: editGroupName.trim(),
      description: editGroupDescription.trim() || undefined,
      imageUrl: editGroupImageUrl || undefined,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f6f5f3' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0fdf4" />

      <GroupMemberModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        email={memberEmail}
        setEmail={setMemberEmail}
        onAdd={handleAddMember}
        loading={addGroupMember.isPending}
      />

      <ConfirmRemoveModal
        visible={!!memberToRemove}
        member={memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleConfirmRemove}
        loading={removeGroupMember.isPending}
      />

      <ConfirmLeaveModal
        visible={showLeaveConfirm}
        groupName={group?.name || 'this department'}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={() => leaveGroup.mutate({ groupId })}
        loading={leaveGroup.isPending}
      />

      <MemberCalendarModal
        visible={!!selectedMember}
        member={selectedMember}
        onClose={() => {
          setSelectedMember(null);
          setMemberCalendarEvents([]);
        }}
        events={getTeamMemberCalendar.data || []}
        loading={getTeamMemberCalendar.isLoading}
      />

      <EditGroupModal
        visible={showEditGroupModal}
        onClose={() => setShowEditGroupModal(false)}
        name={editGroupName}
        setName={setEditGroupName}
        description={editGroupDescription}
        setDescription={setEditGroupDescription}
        imageUrl={editGroupImageUrl}
        onPickImage={pickImage}
        onTakePhoto={takePhoto}
        onSave={handleSaveGroup}
        loading={updateGroup.isPending}
      />

      {isLoading ? (
        <>
          <View style={{ backgroundColor: '#fff', paddingTop: 52, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
            >
              <IconBack size={16} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#111827" />
          </View>
        </>
      ) : isError || !group ? (
        <>
          <View style={{ backgroundColor: '#fff', paddingTop: 52, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
            >
              <IconBack size={16} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <IconUser color="#ef4444" size={28} />
            </View>
            <Text style={{ color: '#111827', fontSize: 16, fontWeight: '800', textAlign: 'center' }}>Failed to load department</Text>
            <Text style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>Something went wrong. Go back and try again.</Text>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#111827', borderRadius: 14 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Go back</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>

          {/* ── Hero: back button + avatar on same row ── */}
          <View
            style={{
              backgroundColor: '#f0fdf4',
              paddingTop: 52,
              paddingBottom: 32,
              paddingHorizontal: 24,
              alignItems: 'center',
              borderBottomWidth: 1,
              borderBottomColor: '#d1fae5',
            }}
          >
            {/* Top row: back button | edit button (if admin) | centered avatar | spacer */}
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: 'rgba(255,255,255,0.75)',
                  borderWidth: 1,
                  borderColor: 'rgba(0,0,0,0.06)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconBack size={16} color="#111827" />
              </TouchableOpacity>

              {isAdmin && (
                <TouchableOpacity
                  onPress={handleOpenEditGroup}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: 'rgba(255,255,255,0.75)',
                    borderWidth: 1,
                    borderColor: 'rgba(0,0,0,0.06)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 8,
                  }}
                >
                  <IconEdit size={16} color="#111827" />
                </TouchableOpacity>
              )}

              {/* Avatar — centered between back button and spacer */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 42,
                    backgroundColor: '#dcfce7',
                    borderWidth: 3,
                    borderColor: '#fff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  {group?.imageUrl ? (
                    <Image
                      source={{ uri: group.imageUrl }}
                      style={{ width: 64, height: 64, borderRadius: 32 }}
                    />
                  ) : (
                    <IconUsersGroup size={40} color="#16a34a" />
                  )}
                </View>
              </View>

              {/* Right spacer — same width as back button to keep avatar truly centered */}
              <View style={{ width: 34 }} />
            </View>

            {/* Group name */}
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.5, marginBottom: 4, textAlign: 'center' }}>
              {group.name}
            </Text>

            {/* Subtitle: type + member count */}
            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: group.description ? 14 : 0 }}>
              Department · {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
            </Text>

            {/* Description pill */}
            {group.description ? (
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.75)',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: '#bbf7d0',
                  maxWidth: 300,
                }}
              >
                <Text style={{ color: '#374151', fontSize: 13, lineHeight: 20, textAlign: 'center' }}>
                  {group.description}
                </Text>
              </View>
            ) : null}
          </View>

          {/* ── Members section ── */}
          <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
            {/* Members header row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase' }}>
                Members · {group.members.length}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                {isAdmin && (
                  <TouchableOpacity
                    onPress={() => setShowAddModal(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#111827', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 }}
                  >
                    <IconPlus color="#fff" size={13} />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Add member</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setShowLeaveConfirm(true)}
                  style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#ef4444', backgroundColor: '#fff5f5' }}
                >
                  <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 12 }}>Leave</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Members list or empty state */}
            {group.members.length === 0 ? (
              isAdmin ? (
                <EmptyMembers onAdd={() => setShowAddModal(true)} />
              ) : (
                <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 26, alignItems: 'center', borderWidth: 1.5, borderColor: '#f3f4f6' }}>
                  <Text style={{ color: '#111827', fontSize: 16, fontWeight: '800', marginBottom: 8 }}>No members yet</Text>
                  <Text style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                    This department has no members. Only the group creator can invite new members.
                  </Text>
                </View>
              )
            ) : (
              <View style={{ gap: 10 }}>
                {group.members.map((member: GroupMember) => {
                  const memberIsActive =
                    member.status === 'accepted' ||
                    member.status == null ||
                    !!member.user?.id ||
                    !!member.userId ||
                    member.email.toLowerCase() === currentUser?.email?.toLowerCase();

                  const memberStatusLabel = member.status === 'pending' ? 'Pending invite' : 'Active user';

                  return (
                    <TouchableOpacity
                      key={member.id}
                      onPress={() => memberIsActive && setSelectedMember(member)}
                      activeOpacity={memberIsActive ? 0.7 : 1}
                      style={{
                        backgroundColor: '#fff',
                        borderRadius: 18,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: memberIsActive ? '#e0f2fe' : '#f3f4f6',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <AvatarInitials email={member.email} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#111827', fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{member.email}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5 }}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: memberIsActive ? '#22c55e' : '#e5e7eb' }} />
                          <Text style={{ color: '#9ca3af', fontSize: 11 }}>{memberStatusLabel}</Text>
                        </View>
                      </View>
                      {isAdmin && member.email !== currentUser?.email && (
                        <TouchableOpacity
                          onPress={() => setMemberToRemove(member)}
                          style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center', justifyContent: 'center' }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <IconRemoveUser size={15} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                      {memberIsActive && !isAdmin && (
                        <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' }}>
                          <IconCalendar color="#10b981" size={16} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}