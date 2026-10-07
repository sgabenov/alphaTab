// Adapted from guitarpro-composer; see LICENSE in this directory.
import { type AlphaTabApi, type model, synth } from '@coderline/alphatab';
import {
    beatRange,
    moveRangeEdge,
    type NoteEdge,
    nearestNoteEdge,
    nearestOccurrence,
    noteEdges,
    type RangeEdge,
    type Rectangle,
    type SelectionRange,
    selectionPadding,
    selectionRectangles
} from './SelectionGeometry';
import './PlaybackStyles';

export interface RangeSelection {
    readonly root: HTMLElement;
    readonly range: SelectionRange | null;
    attach(api: AlphaTabApi): void;
    preparePlayback(api: AlphaTabApi): void;
    setPlaying(value: boolean): void;
    clear(): void;
    refresh(): void;
    dispose(): void;
}

// Keep controls outside alphaTab's replaced/scaled highlight tiles.
export function createRangeSelection(root: HTMLElement, current: () => AlphaTabApi | undefined): RangeSelection {
    root.classList.add('at-playback-score');
    const subscriptions: (() => void)[] = [];
    let edges: NoteEdge[] | undefined;
    let renderedTracks = '';
    const layer = document.createElement('div');
    layer.className = 'at-range-overlay';
    const frames = document.createElement('div');
    layer.append(frames);
    let selectedRange: SelectionRange | null = null;
    let playing = false;
    let firstBeat: model.Beat | undefined;
    let rangeDrag = false;
    let pointer: number | undefined;
    let dragRange: SelectionRange | undefined;
    const handles = (['start', 'end'] as const).map(edge => {
        const handle = document.createElement('button');
        handle.type = 'button';
        handle.className = 'at-range-handle';
        handle.setAttribute('aria-label', edge === 'start' ? 'Selection start' : 'Selection end');
        handle.title = 'Drag to a note, or use Left/Right arrow keys';
        layer.append(handle);
        handle.onpointerdown = event => {
            if (event.button !== 0 || !selectedRange) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            pointer = event.pointerId;
            dragRange = { ...selectedRange! };
            handle.classList.add('is-dragging');
            handle.setPointerCapture(event.pointerId);
        };
        handle.onpointermove = event => {
            if (pointer !== event.pointerId) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            const api = current(),
                surface = root.querySelector<HTMLElement>('.at-surface');
            if (!api || !selectedRange || !surface || !api.boundsLookup) {
                return;
            }
            const rect = surface.getBoundingClientRect();
            const x = (event.clientX - rect.left) * (surface.offsetWidth / rect.width || 1);
            const y = (event.clientY - rect.top) * (surface.offsetHeight / rect.height || 1);
            const candidates = candidatesForRange();
            const nearest = nearestNoteEdge(candidates, edge, x, y);
            if (!nearest) {
                return;
            }
            const anchor = dragRange ?? selectedRange;
            const tick = edge === 'start' ? anchor.startTick : anchor.endTick;
            const note = nearestOccurrence(candidates, nearest.id, edge, tick);
            if (note) {
                apply(edge, note);
            }
        };
        const end = (event: PointerEvent) => {
            if (pointer !== event.pointerId) {
                return;
            }
            event.stopPropagation();
            pointer = undefined;
            dragRange = undefined;
            handle.classList.remove('is-dragging');
            if (handle.hasPointerCapture(event.pointerId)) {
                handle.releasePointerCapture(event.pointerId);
            }
        };
        handle.onpointerup = end;
        handle.onpointercancel = end;
        handle.onlostpointercapture = () => {
            pointer = undefined;
            dragRange = undefined;
            handle.classList.remove('is-dragging');
        };
        handle.onclick = event => {
            event.stopPropagation();
        };
        handle.onkeydown = event => {
            if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            const range = selectedRange;
            if (!range) {
                return;
            }
            const tick = edge === 'start' ? range.startTick : range.endTick;
            const direction = event.key === 'ArrowRight' ? 1 : -1;
            const notes = candidatesForRange().filter(
                n => ((edge === 'start' ? n.start : n.end) - tick) * direction > 0
            );
            notes.sort((a, b) => (edge === 'start' ? a.start - b.start : a.end - b.end) * direction);
            if (notes[0]) {
                apply(edge, notes[0]);
            }
        };
        return handle;
    });
    function finishSelection() {
        firstBeat = undefined;
        rangeDrag = false;
    }
    function cancelGesture() {
        finishSelection();
        const capturedPointer = pointer;
        pointer = undefined;
        dragRange = undefined;
        for (const handle of handles) {
            handle.classList.remove('is-dragging');
            if (capturedPointer !== undefined && handle.hasPointerCapture(capturedPointer)) {
                handle.releasePointerCapture(capturedPointer);
            }
        }
    }
    function onMouseUp(event: MouseEvent) {
        if (event.button !== 0) {
            return;
        }
        // The native beatMouseUp event only reaches us inside the score.
        // Capture releases elsewhere too, even if another control stops propagation.
        // Leave a simple click inside the score to the click-to-seek handler.
        if (rangeDrag || !(event.target instanceof Node && root.contains(event.target))) {
            finishSelection();
        }
    }
    function onMouseMove(event: MouseEvent) {
        // Recover if the mouse was released outside the browser window.
        if ((event.buttons & 1) === 0) {
            cancelGesture();
        }
    }
    window.addEventListener('mouseup', onMouseUp, true);
    root.addEventListener('mousemove', onMouseMove, true);
    window.addEventListener('blur', cancelGesture);
    window.addEventListener('pointercancel', cancelGesture, true);
    function candidatesForRange() {
        const api = current();
        if (!api) {
            return [];
        }
        edges ??= noteEdges(api);
        return edges;
    }
    function invalidate() {
        edges = undefined;
    }
    function apply(edge: RangeEdge, bar: { start: number; end: number }) {
        const api = current(),
            range = selectedRange;
        if (!api || !range) {
            return;
        }
        const next = moveRangeEdge(range, edge, bar);
        if (next.startTick !== range.startTick || next.endTick !== range.endTick) {
            selectedRange = next;
            refresh();
        }
    }
    function drawRange(range: SelectionRange) {
        const api = current();
        const systems = (api?.boundsLookup?.staffSystems ?? []).map(
            system => system.bars[0]?.visualBounds ?? system.visualBounds
        );
        const rectangles = selectionRectangles(
            candidatesForRange(),
            systems,
            range,
            selectionPadding * (api?.settings.display.scale ?? 1)
        );
        if (rectangles.length) {
            draw(rectangles);
        }
        return rectangles.length > 0;
    }
    function clear() {
        selectedRange = null;
        cancelGesture();
        layer.hidden = true;
    }
    function refresh() {
        const parent = root.querySelector('.at-cursors');
        if (!parent || !selectedRange || playing) {
            layer.hidden = true;
            return;
        }
        if (layer.parentElement !== parent) {
            parent.append(layer);
        }
        if (!drawRange(selectedRange)) {
            layer.hidden = true;
        }
    }
    function selectBeats(start: model.Beat, end: model.Beat) {
        const cache = current()?.tickCache;
        if (!cache) {
            return;
        }
        if (cache.getBeatStart(start) > cache.getBeatStart(end)) {
            [start, end] = [end, start];
        }
        const api = current()!;
        const startRange = beatRange(api, start);
        const endRange = beatRange(api, end);
        if (!startRange || !endRange) {
            return;
        }
        selectedRange = { startTick: startRange.startTick, endTick: endRange.endTick };
        refresh();
    }
    function detach() {
        for (const unsubscribe of subscriptions.splice(0)) {
            unsubscribe();
        }
        invalidate();
    }
    function attach(api: AlphaTabApi) {
        detach();
        clear();
        playing = api.playerState === synth.PlayerState.Playing;
        subscriptions.push(
            // Native range selection applies the range to the synth immediately,
            // which seeks to its start. Keep the draft entirely in this overlay.
            api.beatMouseDown.on(beat => {
                if (current() !== api) {
                    return;
                }
                firstBeat = beat;
                rangeDrag = false;
            }),
            api.beatMouseMove.on(beat => {
                if (current() !== api || !firstBeat) {
                    return;
                }
                rangeDrag ||= beat !== firstBeat;
                if (rangeDrag) {
                    selectBeats(firstBeat, beat);
                }
            }),
            api.beatMouseUp.on(() => {
                if (current() !== api || !firstBeat) {
                    return;
                }
                const clicked = firstBeat;
                const isSelection = rangeDrag;
                finishSelection();
                if (!isSelection) {
                    clear();
                    api.playbackRange = null;
                    // Preserve click-to-seek; dragging a range never seeks.
                    const cache = api.tickCache;
                    if (cache) {
                        api.tickPosition =
                            cache.getMasterBarStart(clicked.voice.bar.masterBar) +
                            (cache.getRelativeBeatPlaybackRange(clicked)?.startTick ?? clicked.playbackStart);
                    }
                }
            }),
            api.scoreLoaded.on(() => {
                if (current() === api) {
                    clear();
                    invalidate();
                }
            }),
            api.renderStarted.on(() => {
                if (current() === api) {
                    cancelGesture();
                    invalidate();
                    layer.hidden = true;
                }
            }),
            api.midiLoaded.on(() => {
                if (current() === api) {
                    invalidate();
                    refresh();
                }
            }),
            api.playerStateChanged.on(event => {
                if (current() !== api) {
                    return;
                }
                playing = event.state === synth.PlayerState.Playing;
                if (!playing && api.playbackRange) {
                    api.playbackRange = null;
                }
                if (playing) {
                    cancelGesture();
                }
                refresh();
            }),
            api.postRenderFinished.on(() => {
                if (current() === api) {
                    const tracks = api.tracks.map(track => track.index).join(',');
                    if (tracks !== renderedTracks) {
                        clear();
                        renderedTracks = tracks;
                    }
                    invalidate();
                    refresh();
                }
            })
        );
    }
    function draw(rectangles: Rectangle[]) {
        layer.hidden = false;
        frames.replaceChildren();
        for (const r of rectangles) {
            const frame = document.createElement('div');
            frame.className = 'at-range-frame';
            frame.style.cssText = `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`;
            frames.append(frame);
        }
        const first = rectangles[0]!,
            last = rectangles[rectangles.length - 1]!;
        handles[0]!.style.cssText = `left:${first.x}px;top:${first.y}px;height:${first.h}px`;
        handles[1]!.style.cssText = `left:${last.x + last.w}px;top:${last.y}px;height:${last.h}px`;
    }
    return {
        root: layer,
        preparePlayback(api) {
            playing = true;
            cancelGesture();
            api.playbackRange = selectedRange;
            if (selectedRange) {
                api.tickPosition = selectedRange.startTick;
            }
            refresh();
        },
        dispose() {
            cancelGesture();
            detach();
            root.classList.remove('at-playback-score');
            window.removeEventListener('mouseup', onMouseUp, true);
            root.removeEventListener('mousemove', onMouseMove, true);
            window.removeEventListener('blur', cancelGesture);
            window.removeEventListener('pointercancel', cancelGesture, true);
            layer.remove();
        },
        setPlaying(value: boolean) {
            playing = value;
            refresh();
        },
        attach,
        refresh,
        clear,
        get range(): SelectionRange | null {
            return selectedRange;
        }
    };
}
