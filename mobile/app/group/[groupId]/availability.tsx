// @ts-nocheck
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Plus } from 'lucide-react-native';
import { trpc } from '../../../utils/trpc';
import { AddEventModal } from '../../../components/AddEventModal';

const NAVY = '#111827';
const SURFACE = '#f6f5f3';
const BORDER = '#f0eeec';
const MUTED = '#9ca3af';
const CORAL = '#e87a6e';
const ACCENT = '#3b82f6';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Layout constants — tight
const TIME_COL = 44;       // width of the time label column
const HOUR_HEIGHT = 56;    // height per hour row (was 80)
const MIN_COL = 64;        // minimum member column width
const MAX_COL = 100;       // cap so wide screens don't look sparse

// Compute column width so all members fill the visible width if possible
function colWidth(memberCount: number): number {
  if (memberCount === 0) return MIN_COL;
  const available = SCREEN_WIDTH - TIME_COL;
  const natural = Math.floor(available / memberCount);
  return Math.min(Math.max(natural, MIN_COL), MAX_COL);
}

// 8 AM → 9 PM — the useful working window
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8);

function hourLabel(h: number) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

// ── Avatar initials ──
const AVATAR_COLORS = [
  { bg: '#ede9fe', text: '#7c3aed' },
  { bg: '#dbeafe', text: '#2563eb' },
  { bg: '#dcfce7', text: '#16a34a' },
  { bg: '#fce7f3', text: '#db2777' },
  { bg: '#ffedd5', text: '#ea580c' },
  { bg: '#e0f2fe', text: '#0284c7' },
];

function memberColor(name: string) {
  const idx = (name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

// ── Compact day scroller ──
function DayScroller({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
  const today = new Date();
  const days: Date[] = [];
  const start = new Date(today);
  start.setDate(today.getDate() - 3);
  for (let i = 0; i < 21; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }

  return (
    <ScrollView
      horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}
    >
      {days.map((d, i) => {
        const active = d.toDateString() === selected.toDateString();
        const todayDot = d.toDateString() === today.toDateString() && !active;
        return (
          <TouchableOpacity
            key={i} onPress={() => onSelect(d)} activeOpacity={0.7}
            style={{ alignItems: 'center', width: 40 }}
          >
            <Text style={{
              fontSize: 10, fontWeight: '600', color: active ? NAVY : MUTED,
              textTransform: 'uppercase', marginBottom: 4,
            }}>
              {d.toLocaleDateString('en-US', { weekday: 'short' })}
            </Text>
            <View style={{
              width: 36, height: 42, borderRadius: 10,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: active ? NAVY : 'white',
              borderWidth: 1, borderColor: active ? NAVY : BORDER,
            }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: active ? 'white' : NAVY }}>
                {d.getDate()}
              </Text>
            </View>
            <View style={{
              width: 4, height: 4, borderRadius: 2, marginTop: 3,
              backgroundColor: todayDot ? CORAL : 'transparent',
            }} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Main screen ──
export default function AvailabilityScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [prefilledTime, setPrefilledTime] = useState<any>(null);
  const timeScrollRef = useRef<ScrollView>(null);

  const groupQuery = trpc.group.getGroup.useQuery({ id: groupId });
  const availabilityQuery = trpc.calendar.getTeamAvailability.useQuery({
    groupId,
    startDate: new Date(new Date(selectedDate).setHours(0, 0, 0, 0)).toISOString(),
    endDate: new Date(new Date(selectedDate).setHours(23, 59, 59, 999)).toISOString(),
  }, { enabled: !!groupId });

  const isLoading = groupQuery.isLoading || availabilityQuery.isLoading;
  const members = availabilityQuery.data || [];
  const COL = colWidth(members.length);

  // No scroll needed — 8 AM is already the first row

  const handleSlotPress = (hour: number) => {
    const start = new Date(selectedDate);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 1);
    setPrefilledTime({ start, end });
    setShowAddEvent(true);
  };

  if (isLoading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: SURFACE }}>
      <ActivityIndicator size="small" color={NAVY} />
    </View>
  );

  // Total grid width — if wider than screen, horizontal scroll kicks in
  const gridWidth = TIME_COL + COL * members.length;
  const needsHScroll = gridWidth > SCREEN_WIDTH;

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>

      {/* ── Header ── */}
      <View style={{
        paddingTop: insets.top + 10,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
      }}>
        {/* Nav row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14, gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={18} color={NAVY} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: NAVY }}>Team sync</Text>
            {groupQuery.data?.name && (
              <Text style={{ fontSize: 12, color: MUTED, fontWeight: '600', marginTop: 1 }}>
                {groupQuery.data.name}
              </Text>
            )}
          </View>
          {/* Member count badge */}
          <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: NAVY }}>{members.length} members</Text>
          </View>
        </View>

        {/* Day scroller */}
        <View style={{ paddingBottom: 14 }}>
          <DayScroller selected={selectedDate} onSelect={setSelectedDate} />
        </View>
      </View>

      {/* ── Grid ── */}
      <ScrollView
        horizontal={needsHScroll}
        showsHorizontalScrollIndicator={false}
        directionalLockEnabled={false}
        bounces={false}
      >
        <View style={{ width: Math.max(gridWidth, SCREEN_WIDTH) }}>

          {/* Member header row */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: 'white',
            borderBottomWidth: 1,
            borderBottomColor: BORDER,
          }}>
            {/* Time col spacer */}
            <View style={{ width: TIME_COL }} />

            {members.map((m: any, i: number) => {
              const label = (m.name || m.userId || '?').charAt(0).toUpperCase();
              const colors = memberColor(m.name || m.userId || '');
              return (
                <View
                  key={i}
                  style={{
                    width: COL,
                    paddingVertical: 10,
                    alignItems: 'center',
                    borderLeftWidth: 1,
                    borderLeftColor: BORDER,
                  }}
                >
                  <View style={{
                    width: 28, height: 28, borderRadius: 9,
                    backgroundColor: colors.bg,
                    alignItems: 'center', justifyContent: 'center',
                    marginBottom: 3,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>{label}</Text>
                  </View>
                  <Text
                    style={{ fontSize: 10, fontWeight: '600', color: NAVY, textAlign: 'center' }}
                    numberOfLines={1}
                  >
                    {(m.name || 'User').split(' ')[0]}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Time + event grid */}
          <ScrollView
            ref={timeScrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 80 }}
            nestedScrollEnabled
          >
            <View style={{ flexDirection: 'row' }}>

              {/* Hour labels */}
              <View style={{ width: TIME_COL, backgroundColor: 'white' }}>
                {HOURS.map((h, idx) => (
                  <View key={h} style={{
                    height: HOUR_HEIGHT,
                    justifyContent: 'flex-start', paddingTop: 6,
                    paddingRight: 8, alignItems: 'flex-end',
                    borderBottomWidth: 1,
                    borderBottomColor: idx % 2 === 1 ? '#e9e7e4' : BORDER,
                    backgroundColor: idx % 2 === 1 ? '#fafaf9' : 'white',
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: idx % 2 === 0 ? '#64748b' : MUTED }}>
                      {hourLabel(h)}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Member columns */}
              {members.map((m: any, colIdx: number) => (
                <View
                  key={colIdx}
                  style={{ width: COL, borderLeftWidth: 1, borderLeftColor: BORDER, position: 'relative' }}
                >
                  {/* Hour slots */}
                  {HOURS.map((h, idx) => (
                    <TouchableOpacity
                      key={h}
                      onPress={() => handleSlotPress(h)}
                      activeOpacity={0.4}
                      style={{
                        height: HOUR_HEIGHT,
                        borderBottomWidth: 1,
                        borderBottomColor: idx % 2 === 1 ? '#e9e7e4' : BORDER,
                        backgroundColor: idx % 2 === 1 ? '#fafaf9' : 'white',
                      }}
                    />
                  ))}

                  {/* Conflict blocks */}
                  {(m.conflictingEvents || []).map((ev: any, blockIdx: number) => {
                    const start = new Date(ev.start);
                    const end = new Date(ev.end);
                    const startMin = start.getHours() * 60 + start.getMinutes();
                    const endMin = end.getHours() * 60 + end.getMinutes();

                    // Skip if event ends before grid starts (8 AM) or starts after grid ends (10 PM)
                    if (endMin <= 480 || startMin >= 1320) return null;
                    if (start.toDateString() !== selectedDate.toDateString()) return null;

                    // Grid starts at 8 AM (8 * 60 = 480 mins)
                    const top = Math.max(0, ((startMin - 480) / 60) * HOUR_HEIGHT);
                    const height = Math.max(((endMin - Math.max(480, startMin)) / 60) * HOUR_HEIGHT, 18);
                    const isTask = ev.type === 'task';
                    return (
                      <View
                        key={blockIdx}
                        style={{
                          position: 'absolute',
                          top, left: 3, right: 3,
                          height,
                          backgroundColor: isTask ? '#eff6ff' : '#fff0ee',
                          borderRadius: 6,
                          borderLeftWidth: 2.5,
                          borderLeftColor: isTask ? ACCENT : CORAL,
                          paddingHorizontal: 5,
                          paddingTop: 3,
                          zIndex: 10,
                          overflow: 'hidden',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 9, fontWeight: '700',
                            color: isTask ? ACCENT : CORAL,
                          }}
                          numberOfLines={1}
                        >
                          {ev.title || 'Busy'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        onPress={() => { setPrefilledTime(null); setShowAddEvent(true); }}
        activeOpacity={0.85}
        style={{
          position: 'absolute', bottom: 32, right: 20,
          width: 48, height: 48, borderRadius: 15,
          backgroundColor: NAVY,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Plus size={20} color="white" />
      </TouchableOpacity>

      <AddEventModal
        visible={showAddEvent}
        onClose={() => setShowAddEvent(false)}
        initialGroupId={groupId}
        prefilledStartTime={prefilledTime?.start}
        prefilledEndTime={prefilledTime?.end}
      />
    </View>
  );
}