// @ts-nocheck
import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  Bell,
  Users,
  CheckSquare,
  Phone,
  UtensilsCrossed,
  Plane,
  MoreHorizontal,
  Trash2,
  Edit3,
} from 'lucide-react-native';
import { trpc } from '../../utils/trpc';
import { AddEventModal } from '../../components/AddEventModal';

const NAVY = '#111827';
const SURFACE = '#f6f5f3';
const BORDER = '#f0eeec';
const MUTED = '#9ca3af';
const CORAL = '#e87a6e';

const EVENT_TYPES = [
  { key: 'meeting', label: 'Meeting', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'event', label: 'Event', color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'reminder', label: 'Reminder', color: '#f59e0b', bg: '#fffbeb' },
  { key: 'task', label: 'Task', color: '#10b981', bg: '#ecfdf5' },
  { key: 'call', label: 'Call', color: '#ef4444', bg: '#fef2f2' },
  { key: 'lunch', label: 'Lunch', color: '#f97316', bg: '#fff7ed' },
  { key: 'travel', label: 'Travel', color: '#06b6d4', bg: '#ecfeff' },
  { key: 'other', label: 'Other', color: '#64748b', bg: '#f1f5f9' },
] as const;

function getTypeMeta(key: string) {
  return EVENT_TYPES.find(t => t.key === key) ?? EVENT_TYPES[EVENT_TYPES.length - 1];
}

function isToday(date: Date) {
  return date.toDateString() === new Date().toDateString();
}

// ── Day scroller ──
function DayScroller({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
  const scrollRef = useRef<ScrollView>(null);
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
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}
    >
      {days.map((d, i) => {
        const active = d.toDateString() === selected.toDateString();
        const todayDot = isToday(d) && !active;
        return (
          <TouchableOpacity
            key={i}
            onPress={() => onSelect(d)}
            activeOpacity={0.7}
            style={{ alignItems: 'center', width: 44 }}
          >
            <Text style={{
              fontSize: 10, fontWeight: '600', color: active ? NAVY : MUTED,
              textTransform: 'uppercase', marginBottom: 4,
            }}>
              {d.toLocaleDateString('en-US', { weekday: 'short' })}
            </Text>
            <View style={{
              width: 38, height: 44, borderRadius: 11,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: active ? NAVY : 'white',
              borderWidth: 1,
              borderColor: active ? NAVY : BORDER,
            }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: active ? 'white' : NAVY }}>
                {d.getDate()}
              </Text>
            </View>
            <View style={{
              width: 5, height: 5, borderRadius: 3, marginTop: 4,
              backgroundColor: todayDot ? CORAL : active ? NAVY : 'transparent',
            }} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Event type icon ──
function EventTypeIcon({ typeKey, color, size = 14 }: { typeKey: string; color: string; size?: number }) {
  const icons: Record<string, React.ReactNode> = {
    meeting: <Users size={size} color={color} />,
    event: <CalendarIcon size={size} color={color} />,
    reminder: <Bell size={size} color={color} />,
    task: <CheckSquare size={size} color={color} />,
    call: <Phone size={size} color={color} />,
    lunch: <UtensilsCrossed size={size} color={color} />,
    travel: <Plane size={size} color={color} />,
    other: <MoreHorizontal size={size} color={color} />,
  };
  return <>{icons[typeKey] ?? icons.other}</>;
}

// ── Event card ──
function EventItem({
  event, canEdit, onEdit, onDelete, onPress,
}: {
  event: any; canEdit: boolean;
  onEdit: () => void; onDelete: () => void; onPress: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const startTime = new Date(event.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(event.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const meta = getTypeMeta(event.eventType);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.65}
      style={{
        backgroundColor: 'white',
        borderRadius: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: BORDER,
        overflow: 'hidden',
        flexDirection: 'row',
      }}
    >
      {/* Left accent bar */}
      <View style={{ width: 3 }} />

      <View style={{ flex: 1, padding: 13 }}>
        {/* Top row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: NAVY }} numberOfLines={1}>
              {event.title}
            </Text>
            {event.group && (
              <Text style={{ fontSize: 11, color: '#06b6d4', fontWeight: '600', marginTop: 2 }}>
                {event.group.name}
              </Text>
            )}
          </View>

          {/* Type badge */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
            backgroundColor: meta.bg,
          }}>
            <EventTypeIcon typeKey={meta.key} color={meta.color} size={11} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: meta.color }}>{meta.label}</Text>
          </View>
        </View>

        {/* Meta row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Clock size={12} color={MUTED} />
            <Text style={{ fontSize: 12, color: MUTED, fontWeight: '500' }}>{startTime} – {endTime}</Text>
          </View>
          {event.location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
              <MapPin size={12} color={MUTED} />
              <Text style={{ fontSize: 12, color: MUTED, fontWeight: '500' }} numberOfLines={1}>{event.location}</Text>
            </View>
          )}
        </View>

        {event.description && (
          <Text style={{ fontSize: 12, color: MUTED, marginTop: 6, lineHeight: 18 }} numberOfLines={2}>
            {event.description}
          </Text>
        )}
      </View>

      {/* Edit/delete actions — only for owner */}
      {canEdit && (
        <View style={{ justifyContent: 'center', paddingRight: 12, gap: 10 }}>
          <TouchableOpacity onPress={onEdit} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Edit3 size={14} color={MUTED} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Trash2 size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Main screen ──
export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data: currentUser } = trpc.profile.me.useQuery();
  const { data: groups = [] } = trpc.group.getGroups.useQuery();
  const { data: events, isLoading, refetch, isRefetching } = trpc.calendar.getEvents.useQuery(
    selectedGroupId ? { groupId: selectedGroupId } : undefined
  );

  const deleteEventMutation = trpc.calendar.deleteEvent.useMutation({
    onSuccess: () => utils.calendar.getEvents.invalidate(),
  });

  const dayEvents = useMemo(() =>
    (events || []).filter(e => new Date(e.startAt).toDateString() === selectedDate.toDateString())
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [events, selectedDate]
  );

  // Day label
  const dayLabel = isToday(selectedDate)
    ? 'Today'
    : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  if (isLoading && !isRefetching) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: SURFACE }}>
      <ActivityIndicator size="small" color={NAVY} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE }}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={{
        backgroundColor: 'white',
        paddingTop: insets.top + 10,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
      }}>
        {/* Title row */}
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
          paddingHorizontal: 20, marginBottom: 14,
        }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: MUTED, letterSpacing: 0.8, marginBottom: 2 }}>SCHEDULE</Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: NAVY, letterSpacing: -0.5 }}>Calendar</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* Add event */}
            <TouchableOpacity
              onPress={() => setShowAddEvent(true)}
              style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' }}
              activeOpacity={0.85}
            >
              <Plus size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Group filter pills */}
        {groups.length > 0 && (
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 6, paddingBottom: 12 }}
          >
            <TouchableOpacity
              onPress={() => setSelectedGroupId(null)}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                backgroundColor: !selectedGroupId ? NAVY : 'white',
                borderWidth: 1, borderColor: !selectedGroupId ? NAVY : BORDER,
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: !selectedGroupId ? 'white' : MUTED }}>My Calendar</Text>
            </TouchableOpacity>
            {groups.map((g: any) => (
              <TouchableOpacity
                key={g.id}
                onPress={() => setSelectedGroupId(g.id)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                  backgroundColor: selectedGroupId === g.id ? NAVY : 'white',
                  borderWidth: 1, borderColor: selectedGroupId === g.id ? NAVY : BORDER,
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: selectedGroupId === g.id ? 'white' : MUTED }}>{g.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Day scroller */}
        <View style={{ paddingBottom: 14 }}>
          <DayScroller selected={selectedDate} onSelect={setSelectedDate} />
        </View>
      </View>

      {/* ── Agenda ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={NAVY} />}
      >
        {/* Day heading */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: NAVY }}>{dayLabel}</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: BORDER }} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: MUTED }}>
            {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
          </Text>
        </View>

        {dayEvents.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <View style={{
              width: 52, height: 52, borderRadius: 16,
              backgroundColor: 'white', borderWidth: 1, borderColor: BORDER,
              alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}>
              <CalendarIcon size={22} color="#cbd5e1" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#cbd5e1' }}>Nothing scheduled</Text>
            <Text style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>Tap + to add an event.</Text>
          </View>
        ) : (
          dayEvents.map((event: any) => (
            <EventItem
              key={event.id}
              event={event}
              canEdit={event.userId === currentUser?.id}
              onPress={() => setEditingEvent(event)}
              onEdit={() => setEditingEvent(event)}
              onDelete={() => deleteEventMutation.mutate({ id: event.id })}
            />
          ))
        )}
      </ScrollView>

      {/* Add event modal */}
      <AddEventModal
        visible={showAddEvent}
        onClose={() => setShowAddEvent(false)}
      />

      {/* Edit event modal */}
      {editingEvent && (
        <AddEventModal
          visible={!!editingEvent}
          eventToEdit={editingEvent}
          readOnly={editingEvent.userId !== currentUser?.id}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </View>
  );
}