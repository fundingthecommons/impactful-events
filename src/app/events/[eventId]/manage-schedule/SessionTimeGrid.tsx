"use client";

import { useMemo, useState } from "react";
import { Text, Tooltip, ActionIcon, Group, Loader, Center } from "@mantine/core";
import { IconMessageCircle } from "@tabler/icons-react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { getDisplayName } from "~/utils/userDisplay";
import { useSessionDragDrop } from "./useSessionDragDrop";
import { type FloorSession } from "./ManageScheduleClient";

interface SessionTimeGridProps {
  sessions: FloorSession[];
  rooms: Array<{ id: string; name: string }>;
  eventId: string;
  venueId: string;
  venueName: string;
  onOpenComments: (sessionId: string, sessionTitle: string) => void;
  isPending?: boolean;
}

const FIFTEEN_MIN_MS = 15 * 60 * 1000;
const ROW_HEIGHT_PX = 40;

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

function formatTimeShort(date: Date): string {
  const d = new Date(date);
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  if (minutes === 0) return `${String(hours)}:00`;
  return `${String(hours)}:${String(minutes).padStart(2, "0")}`;
}

// Droppable cell for a time-slot/room intersection
function DroppableCell({
  slotTime,
  roomId,
  row,
  col,
  headerRows,
}: {
  slotTime: Date;
  roomId: string | null;
  row: number;
  col: number;
  headerRows: number;
}) {
  const dropId = `cell-${slotTime.getTime()}-${roomId ?? "main"}`;
  const { isOver, setNodeRef } = useDroppable({ id: dropId, data: { slotTime, roomId } });

  return (
    <div
      ref={setNodeRef}
      className={`ms-grid-cell ${isOver ? "ms-droppable-active" : ""}`}
      style={{
        gridRow: row + headerRows,
        gridColumn: col + 2,
      }}
    />
  );
}

// Draggable session block
function DraggableSessionBlock({
  session,
  startRow,
  endRow,
  colIndex,
  color,
  isDragging,
  onOpenComments,
}: {
  session: FloorSession;
  startRow: number;
  endRow: number;
  colIndex: number;
  color: string;
  isDragging: boolean;
  onOpenComments: (sessionId: string, sessionTitle: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: session.id,
    data: { session },
  });

  const style: React.CSSProperties = {
    gridRow: `${String(startRow)} / ${String(endRow)}`,
    gridColumn: colIndex + 2,
    backgroundColor: `${color}30`,
    borderLeft: `3px solid ${color}`,
    opacity: isDragging ? 0.4 : 1,
    transform: transform
      ? `translate(${String(transform.x)}px, ${String(transform.y)}px)`
      : undefined,
    zIndex: isDragging ? 10 : 1,
  };

  const speakerNames = [
    ...session.sessionSpeakers.map((s) => getDisplayName(s.user, "Unknown")),
    ...session.speakers,
  ];

  const commentCount = session._count?.comments ?? 0;

  return (
    <div
      ref={setNodeRef}
      className="ms-grid-session"
      style={style}
      {...listeners}
      {...attributes}
    >
      <Text fw={600} size="xs" lineClamp={2} style={{ lineHeight: 1.3 }}>
        {session.title}
      </Text>
      <Text size="xs" c="dimmed" style={{ fontSize: 10, lineHeight: 1.2 }}>
        {formatTime(session.startTime)} - {formatTime(session.endTime)}
      </Text>
      {speakerNames.length > 0 && (
        <Text size="xs" c="dimmed" lineClamp={1} style={{ fontSize: 10 }}>
          {speakerNames.join(", ")}
        </Text>
      )}
      {commentCount > 0 && (
        <Tooltip label={`${String(commentCount)} comment${commentCount !== 1 ? "s" : ""}`}>
          <ActionIcon
            variant="subtle"
            size="xs"
            color="blue"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onOpenComments(session.id, session.title);
            }}
            style={{ position: "absolute", top: 2, right: 2 }}
          >
            <Group gap={1} wrap="nowrap">
              <IconMessageCircle size={10} />
              <Text size="xs" style={{ fontSize: 9 }}>
                {commentCount}
              </Text>
            </Group>
          </ActionIcon>
        </Tooltip>
      )}
    </div>
  );
}

// Session overlay during drag
function SessionDragOverlay({ session }: { session: FloorSession }) {
  const color = session.sessionType?.color ?? session.track?.color ?? "#94a3b8";
  return (
    <div
      className="ms-grid-session ms-drag-overlay"
      style={{
        backgroundColor: `${color}40`,
        borderLeft: `3px solid ${color}`,
        padding: "4px 6px",
        borderRadius: 4,
        minWidth: 140,
        maxWidth: 250,
      }}
    >
      <Text fw={600} size="xs" lineClamp={2} style={{ lineHeight: 1.3 }}>
        {session.title}
      </Text>
      <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
        {formatTime(session.startTime)} - {formatTime(session.endTime)}
      </Text>
    </div>
  );
}

type Column = { roomId: string | null; label: string };

export function SessionTimeGrid({
  sessions,
  rooms,
  eventId,
  venueId,
  venueName,
  onOpenComments,
  isPending,
}: SessionTimeGridProps) {
  const [activeDragSession, setActiveDragSession] =
    useState<FloorSession | null>(null);

  const { handleDrop, isPending: isRescheduling } = useSessionDragDrop(
    eventId,
    venueId,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Compute columns from rooms
  const columns = useMemo<Column[]>(() => {
    if (rooms.length > 0) {
      return rooms.map((r) => ({ roomId: r.id, label: r.name }));
    }
    return [{ roomId: null, label: venueName }];
  }, [rooms, venueName]);

  const hasRoomHeaders = rooms.length > 1;
  const headerRows = hasRoomHeaders ? 2 : 1;

  // Compute time slots and session grid positions
  const { timeSlots, sessionsGrid, slotCount } = useMemo(() => {
    if (sessions.length === 0) {
      return { timeSlots: [], sessionsGrid: [], slotCount: 0 };
    }

    let earliest = Infinity;
    let latest = -Infinity;
    for (const s of sessions) {
      const start = new Date(s.startTime).getTime();
      const end = new Date(s.endTime).getTime();
      if (start < earliest) earliest = start;
      if (end > latest) latest = end;
    }

    // Pad to reasonable day bounds
    const referenceDate = new Date(earliest);
    const dayStart = new Date(referenceDate);
    dayStart.setUTCHours(8, 0, 0, 0);
    const dayEnd = new Date(referenceDate);
    dayEnd.setUTCHours(20, 0, 0, 0);

    const paddedEarliest = Math.min(earliest, dayStart.getTime());
    const paddedLatest = Math.max(latest, dayEnd.getTime());

    const roundedEarliest =
      Math.floor(paddedEarliest / FIFTEEN_MIN_MS) * FIFTEEN_MIN_MS;
    const roundedLatest =
      Math.ceil(paddedLatest / FIFTEEN_MIN_MS) * FIFTEEN_MIN_MS;

    const slots: Array<{ time: Date; row: number }> = [];
    let current = roundedEarliest;
    let row = 1;
    while (current < roundedLatest) {
      slots.push({ time: new Date(current), row });
      current += FIFTEEN_MIN_MS;
      row++;
    }

    const grid = sessions.map((session) => {
      const startMs = new Date(session.startTime).getTime();
      const endMs = new Date(session.endTime).getTime();
      const startRow =
        Math.floor((startMs - roundedEarliest) / FIFTEEN_MIN_MS) +
        headerRows +
        1;
      const endRow = Math.max(
        startRow + 1,
        Math.ceil((endMs - roundedEarliest) / FIFTEEN_MIN_MS) +
          headerRows +
          1,
      );
      return { session, startRow, endRow };
    });

    return { timeSlots: slots, sessionsGrid: grid, slotCount: row - 1 };
  }, [sessions, headerRows]);

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { session: FloorSession } | undefined;
    if (data?.session) {
      setActiveDragSession(data.session);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragSession(null);
    const { active, over } = event;
    if (!over) return;

    const overData = over.data.current as
      | { slotTime: Date; roomId: string | null }
      | undefined;
    if (!overData?.slotTime) return;

    const sessionId = active.id as string;
    handleDrop(sessionId, overData.slotTime, overData.roomId);
  };

  if (sessions.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No sessions to display in grid view.
      </Text>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {(isPending ?? isRescheduling) && (
        <Center py="xs">
          <Loader size="xs" />
        </Center>
      )}
      <div className="ms-grid-wrapper">
        <div
          className="ms-grid"
          style={{
            gridTemplateColumns: `60px repeat(${String(columns.length)}, minmax(140px, 1fr))`,
            gridTemplateRows: `${hasRoomHeaders ? "auto auto" : "auto"} repeat(${String(slotCount)}, ${String(ROW_HEIGHT_PX)}px)`,
          }}
        >
          {/* Corner cell */}
          <div
            className="ms-grid-corner"
            style={{
              gridRow: `1 / ${String(headerRows + 1)}`,
              gridColumn: 1,
            }}
          />

          {/* Venue header (row 1) — spans all room columns */}
          <div
            className="ms-grid-venue-header"
            style={{
              gridRow: 1,
              gridColumn: `2 / span ${String(columns.length)}`,
              borderBottom: hasRoomHeaders
                ? "1px solid var(--ms-header-border)"
                : undefined,
            }}
          >
            <Text fw={600} size="sm" ta="center">
              {venueName}
            </Text>
          </div>

          {/* Room sub-headers (row 2) */}
          {hasRoomHeaders &&
            columns.map((col, i) => (
              <div
                key={`room-${col.roomId ?? "main"}`}
                className="ms-grid-room-header"
                style={{ gridRow: 2, gridColumn: i + 2 }}
              >
                <Text size="xs" c="dimmed" ta="center" fw={500}>
                  {col.label}
                </Text>
              </div>
            ))}

          {/* Time labels */}
          {timeSlots
            .filter((slot) => slot.time.getUTCMinutes() % 30 === 0)
            .map((slot) => {
              const isHour = slot.time.getUTCMinutes() === 0;
              return (
                <div
                  key={slot.row}
                  className="ms-grid-time-label"
                  style={{
                    gridRow: slot.row + headerRows,
                    gridColumn: 1,
                  }}
                >
                  <Text
                    size="xs"
                    fw={isHour ? 700 : 400}
                    c="dimmed"
                    style={isHour ? { fontSize: 13 } : { fontSize: 11 }}
                  >
                    {formatTimeShort(slot.time)}
                  </Text>
                </div>
              );
            })}

          {/* Gridlines */}
          {timeSlots
            .filter((slot) => slot.time.getUTCMinutes() === 0)
            .map((slot) => (
              <div
                key={`line-${String(slot.row)}`}
                className="ms-grid-line-hour"
                style={{
                  gridRow: slot.row + headerRows,
                  gridColumn: `1 / ${String(columns.length + 2)}`,
                }}
              />
            ))}

          {timeSlots
            .filter(
              (slot) =>
                slot.time.getUTCMinutes() === 30,
            )
            .map((slot) => (
              <div
                key={`line-half-${String(slot.row)}`}
                className="ms-grid-line"
                style={{
                  gridRow: slot.row + headerRows,
                  gridColumn: `1 / ${String(columns.length + 2)}`,
                }}
              />
            ))}

          {/* Droppable cells — one per (time-slot, room) */}
          {timeSlots.map((slot) =>
            columns.map((col, colIdx) => (
              <DroppableCell
                key={`drop-${String(slot.row)}-${col.roomId ?? "main"}`}
                slotTime={slot.time}
                roomId={col.roomId}
                row={slot.row}
                col={colIdx}
                headerRows={headerRows}
              />
            )),
          )}

          {/* Draggable session blocks */}
          {sessionsGrid.map(({ session, startRow, endRow }) => {
            let colIndex: number;
            if (session.roomId) {
              colIndex = columns.findIndex(
                (col) => col.roomId === session.roomId,
              );
            } else {
              colIndex = 0;
            }
            if (colIndex === -1) colIndex = 0;

            const color =
              session.sessionType?.color ??
              session.track?.color ??
              "#94a3b8";

            return (
              <DraggableSessionBlock
                key={session.id}
                session={session}
                startRow={startRow}
                endRow={endRow}
                colIndex={colIndex}
                color={color}
                isDragging={activeDragSession?.id === session.id}
                onOpenComments={onOpenComments}
              />
            );
          })}
        </div>
      </div>

      {/* Drag overlay (ghost preview) */}
      <DragOverlay>
        {activeDragSession ? (
          <SessionDragOverlay session={activeDragSession} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
