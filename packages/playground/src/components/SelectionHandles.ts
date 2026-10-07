import type * as alphaTab from '@coderline/alphatab';
import type { Mountable } from '../util/Dom';
import { playbackCursor } from './playback/PlaybackCursor';
import { createRangeSelection, type RangeSelection } from './playback/RangeSelection';

export class SelectionHandles implements Mountable {
    readonly root: HTMLElement;
    private readonly selection: RangeSelection;
    private readonly previousCursorHandler;

    constructor(
        private readonly api: alphaTab.AlphaTabApi,
        canvasEl: HTMLElement
    ) {
        this.selection = createRangeSelection(canvasEl, () => this.api);
        this.selection.attach(api);
        this.root = this.selection.root;
        this.previousCursorHandler = api.customCursorHandler;
        api.customCursorHandler = playbackCursor(api);
    }

    preparePlayback(): void {
        if (this.api.isReadyForPlayback) {
            this.selection.preparePlayback(this.api);
        }
    }

    dispose(): void {
        this.selection.dispose();
        this.api.customCursorHandler = this.previousCursorHandler;
    }
}
