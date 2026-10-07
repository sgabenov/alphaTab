import type { AlphaTabApi, ICursorHandler } from '@coderline/alphatab';
import { MidiTickLookupFindBeatResultCursorMode } from '@coderline/alphatab/midi/MidiTickLookup';
import { selectionPadding } from './SelectionGeometry';

export function playbackCursor(api: AlphaTabApi): ICursorHandler {
    return {
        onAttach(cursors) {
            cursors.beatCursor.width = 2;
        },
        onDetach() {},
        placeBarCursor(cursor, beat) {
            const bounds = beat.barBounds.masterBarBounds.lineAlignedBounds;
            cursor.setBounds(bounds.x, bounds.y, bounds.w, bounds.h);
        },
        placeBeatCursor(cursor, beat, x) {
            const bounds = beat.barBounds.masterBarBounds.visualBounds;
            const padding = selectionPadding * api.settings.display.scale;
            cursor.transitionToX(0, x);
            cursor.setBounds(x, bounds.y - padding, 1, bounds.h + padding * 2);
        },
        transitionBeatCursor(cursor, _beat, start, end, duration, mode) {
            const factor = mode === MidiTickLookupFindBeatResultCursorMode.ToNextBext ? 2 : 1;
            cursor.transitionToX(duration * factor, start + (end - start) * factor);
        }
    };
}
