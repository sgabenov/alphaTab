// Adapted from guitarpro-composer; see LICENSE in this directory.
import type { AlphaTabApi, model } from '@coderline/alphatab';

export type RangeEdge = 'start' | 'end';
export interface SelectionRange {
    startTick: number;
    endTick: number;
}
export interface Rectangle {
    x: number;
    y: number;
    w: number;
    h: number;
}
export interface NoteEdge {
    id: number;
    systemIndex: number;
    start: number;
    end: number;
    lineAlignedBounds: Rectangle;
}

// Match alphaTab's selection margin without making very short beats empty.
const endTickMargin = 50;
export const selectionPadding = 4;

export function beatRange(api: AlphaTabApi, beat: model.Beat, masterBarStart?: number): SelectionRange | undefined {
    const cache = api.tickCache;
    if (!cache) {
        return undefined;
    }
    const timing = cache.getRelativeBeatPlaybackRange(beat);
    const start = masterBarStart ?? cache.getMasterBarStart(beat.voice.bar.masterBar);
    const startTick = start + (timing?.startTick ?? beat.playbackStart);
    const endTick = start + (timing?.endTick ?? beat.playbackStart + beat.playbackDuration);
    return { startTick, endTick: Math.max(startTick + 1, endTick - endTickMargin) };
}

export function noteEdges(api: AlphaTabApi): NoteEdge[] {
    const occurrences = new Map<number, number[]>();
    for (const bar of api.tickCache?.masterBars ?? []) {
        const starts = occurrences.get(bar.masterBar.index) ?? [];
        starts.push(bar.start);
        occurrences.set(bar.masterBar.index, starts);
    }
    return (api.boundsLookup?.staffSystems ?? []).flatMap((system, systemIndex) =>
        system.bars.flatMap(master =>
            master.bars.flatMap(staff =>
                staff.beats.flatMap(bounds =>
                    (occurrences.get(master.index) ?? []).flatMap(start => {
                        const range = beatRange(api, bounds.beat, start);
                        return range
                            ? [
                                  {
                                      id: bounds.beat.id,
                                      systemIndex,
                                      start: range.startTick,
                                      end: range.endTick,
                                      lineAlignedBounds: {
                                          x: bounds.realBounds.x,
                                          w: bounds.realBounds.w,
                                          y: master.lineAlignedBounds.y,
                                          h: master.lineAlignedBounds.h
                                      }
                                  }
                              ]
                            : [];
                    })
                )
            )
        )
    );
}

export function nearestNoteEdge<T extends { lineAlignedBounds: Rectangle }>(
    notes: T[],
    edge: RangeEdge,
    x: number,
    y: number
): T | undefined {
    // Compare systems first so a horizontally closer note on another row never wins.
    let nearest: T | undefined;
    let vertical = Infinity;
    let horizontal = Infinity;
    for (const note of notes) {
        const bounds = note.lineAlignedBounds;
        const dy = Math.max(bounds.y - y, 0, y - bounds.y - bounds.h);
        const dx = Math.abs(x - (edge === 'start' ? bounds.x : bounds.x + bounds.w));
        if (dy < vertical || (dy === vertical && dx < horizontal)) {
            nearest = note;
            vertical = dy;
            horizontal = dx;
        }
    }
    return nearest;
}

export function nearestOccurrence(notes: NoteEdge[], id: number, edge: RangeEdge, tick: number): NoteEdge | undefined {
    let nearest: NoteEdge | undefined;
    let distance = Infinity;
    for (const note of notes) {
        const delta = Math.abs((edge === 'start' ? note.start : note.end) - tick);
        if (note.id === id && delta < distance) {
            nearest = note;
            distance = delta;
        }
    }
    return nearest;
}

export function moveRangeEdge(
    range: SelectionRange,
    edge: RangeEdge,
    note: { start: number; end: number }
): SelectionRange {
    if (edge === 'start' && note.start < range.endTick) {
        return { ...range, startTick: note.start };
    }
    if (edge === 'end' && note.end > range.startTick) {
        return { ...range, endTick: note.end };
    }
    return range;
}

export function selectionRectangles(
    notes: NoteEdge[],
    systems: Rectangle[],
    range: SelectionRange,
    padding: number
): Rectangle[] {
    const start = notes.find(note => note.start === range.startTick);
    const end = notes.find(note => note.end === range.endTick);
    if (!start || !end) {
        return [];
    }
    const selected = notes.filter(note => note.start < range.endTick && note.end > range.startTick);
    return systems.flatMap((bounds, index) => {
        const row = selected.filter(note => note.systemIndex === index);
        if (!row.length) {
            return [];
        }
        // Sustained notes in another voice must not move a chosen endpoint backwards.
        const x =
            index === start.systemIndex ? start.lineAlignedBounds.x : Math.min(...row.map(n => n.lineAlignedBounds.x));
        const right =
            index === end.systemIndex
                ? end.lineAlignedBounds.x + end.lineAlignedBounds.w
                : Math.max(...row.map(n => n.lineAlignedBounds.x + n.lineAlignedBounds.w));
        return [{ x, y: bounds.y - padding, w: right - x, h: bounds.h + padding * 2 }];
    });
}
