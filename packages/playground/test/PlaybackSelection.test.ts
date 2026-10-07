import { describe, expect, it } from 'vitest';
import {
    moveRangeEdge,
    type NoteEdge,
    nearestNoteEdge,
    nearestOccurrence,
    selectionRectangles
} from '../src/components/playback/SelectionGeometry';

function note(id: number, systemIndex: number, start: number, end: number, x: number, w = 40): NoteEdge {
    return { id, systemIndex, start, end, lineAlignedBounds: { x, y: systemIndex * 200, w, h: 40 } };
}

describe('playback selection range boundaries', () => {
    it('moves only the chosen edge and rejects crossing the other edge', () => {
        const range = { startTick: 960, endTick: 2830 };
        expect(moveRangeEdge(range, 'start', { start: 1440, end: 1870 })).toEqual({ startTick: 1440, endTick: 2830 });
        expect(moveRangeEdge(range, 'end', { start: 2880, end: 3310 })).toEqual({ startTick: 960, endTick: 3310 });
        expect(moveRangeEdge(range, 'start', { start: 2880, end: 3310 })).toEqual(range);
        expect(moveRangeEdge(range, 'end', { start: 0, end: 910 })).toEqual(range);
    });
    it('chooses the closest system before comparing note edges', () => {
        const notes = [
            { lineAlignedBounds: { x: 100, y: 20, w: 100, h: 40 } },
            { lineAlignedBounds: { x: 110, y: 200, w: 50, h: 40 } },
            { lineAlignedBounds: { x: 170, y: 200, w: 40, h: 40 } }
        ];
        expect(nearestNoteEdge(notes, 'start', 105, 215)).toBe(notes[1]);
        expect(nearestNoteEdge(notes, 'end', 205, 215)).toBe(notes[2]);
        expect(nearestNoteEdge([], 'start', 0, 0)).toBeUndefined();
    });
    it('keeps a dragged repeated note near the playback occurrence being edited', () => {
        const notes = [note(1, 0, 0, 910, 100), note(1, 0, 7680, 8590, 100), note(2, 0, 8640, 9550, 150)];
        expect(nearestOccurrence(notes, 1, 'start', 8000)).toBe(notes[1]);
        expect(nearestOccurrence(notes, 1, 'end', 910)).toBe(notes[0]);
        expect(nearestOccurrence(notes, 3, 'start', 0)).toBeUndefined();
    });
    it('covers markings outside a notation staff and both staves of a notation/tab system', () => {
        const notes = [note(1, 0, 0, 910, 100), note(2, 1, 960, 1870, 110)];
        expect(
            selectionRectangles(
                notes,
                [
                    { x: 80, y: -30, w: 400, h: 100 },
                    { x: 80, y: 170, w: 400, h: 180 }
                ],
                { startTick: 0, endTick: 1870 },
                4
            )
        ).toEqual([
            { x: 100, y: -34, w: 40, h: 108 },
            { x: 110, y: 166, w: 40, h: 188 }
        ]);
    });
    it('does not let a sustained note in another voice pull the start edge backwards', () => {
        const notes = [note(1, 0, 0, 3790, 50, 300), note(2, 0, 960, 1870, 150), note(3, 0, 1920, 2830, 210)];
        expect(
            selectionRectangles(
                notes,
                [{ x: 40, y: -20, w: 500, h: 100 }],
                {
                    startTick: 960,
                    endTick: 2830
                },
                4
            )
        ).toEqual([{ x: 150, y: -24, w: 100, h: 108 }]);
    });
});
