import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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

const IconUsersEmpty = ({ size = 48, color = '#d1d5db' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="7" r="3" stroke={color} strokeWidth="1.5" />
    <Path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <Circle cx="17" cy="7" r="2.5" stroke={color} strokeWidth="1.5" />
    <Path d="M21 19c0-2.8-1.8-5.1-4-5.8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
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
  user?: { id: string } | null;
};

type GroupWithMembers = {
  id: string;
  name: string;
  description: string | null;
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

const EmptyMembers = ({ onAdd }: { onAdd: () => void }) => (
  <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 36, alignItems: 'center', borderWidth: 1.5, borderColor: '#f3f4f6', borderStyle: 'dashed' }}>
    <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
      <IconUsersEmpty size={36} color="#d1d5db" />
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

  const handleAddMember = () => {
    if (!memberEmail.trim() || !groupId) return;
    addGroupMember.mutate({ groupId, email: memberEmail.trim().toLowerCase() });
  };

  const handleConfirmRemove = () => {
    if (!memberToRemove || !groupId) return;
    removeGroupMember.mutate({ groupId, memberId: memberToRemove.id });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f6f5f3' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f5f3" />

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

      {/* Header */}
      <View style={{ backgroundColor: '#fff', paddingTop: 52, paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
        >
          <IconBack size={16} />
        </TouchableOpacity>
        <Text style={{ color: '#111827', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>Department details</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : isError || !group ? (
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
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
          {/* Group info card */}
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#f3f4f6' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' }}>
                <IconUser color="#16a34a" size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', letterSpacing: -0.3 }}>{group.name}</Text>
                <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{group.members.length} {group.members.length === 1 ? 'member' : 'members'}</Text>
              </View>
            </View>
            {group.description ? (
              <Text style={{ color: '#6b7280', fontSize: 14, lineHeight: 21, backgroundColor: '#f9fafb', borderRadius: 12, padding: 12 }}>
                {group.description}
              </Text>
            ) : (
              <Text style={{ color: '#d1d5db', fontSize: 13, fontStyle: 'italic' }}>No description added.</Text>
            )}
          </View>

          {/* Members header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase' }}>
              Members · {group.members.length}
            </Text>
            {isAdmin && (
              <TouchableOpacity
                onPress={() => setShowAddModal(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#111827', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 }}
              >
                <IconPlus color="#fff" size={13} />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Add member</Text>
              </TouchableOpacity>
            )}
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
              {group.members.map((member: GroupMember) => (
                <View
                  key={member.id}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 18,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#f3f4f6',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <AvatarInitials email={member.email} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#111827', fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{member.email}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: member.user ? '#22c55e' : '#e5e7eb' }} />
                      <Text style={{ color: '#9ca3af', fontSize: 11 }}>{member.user ? 'Active user' : 'Pending invite'}</Text>
                    </View>
                  </View>
                  {isAdmin && (
                    <TouchableOpacity
                      onPress={() => setMemberToRemove(member)}
                      style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center', justifyContent: 'center' }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <IconRemoveUser size={15} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}