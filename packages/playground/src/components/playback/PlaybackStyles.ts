import { css, injectStyles } from '../../util/Dom';

injectStyles(
    'PlaybackSelection',
    css`
    .at-playback-score {
        isolation: isolate;
        --at-selection: rgba(67, 109, 157, 0.08);
        --at-selection-border: #6988ab;
        --at-selection-edge: #315d8a;
        --at-cursor-bar: rgba(255, 242, 0, 0.18);
        --at-cursor-beat: #c35b25;
    }
    /* Escape the cursor wrapper's stacking context so only handles sit above notation. */
    .at-playback-score > .at-cursors { z-index: auto !important; }
    .at-playback-score > .at-surface { z-index: 1; }
    .at-playback-score .at-selection { visibility: hidden; }
    .at-range-overlay {
        position: absolute;
        left: 0;
        top: 0;
        pointer-events: none;
        z-index: 2;
    }
    .at-range-overlay[hidden] { display: none; }
    .at-range-frame {
        position: absolute;
        border: 1px solid var(--at-selection-border);
        background: var(--at-selection);
        pointer-events: none;
    }
    .at-range-handle {
        position: absolute;
        transform: translateX(-50%);
        width: 14px;
        padding: 0;
        border: 0;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        outline: none;
        cursor: ew-resize;
        touch-action: none;
        pointer-events: auto;
    }
    .at-range-handle::after {
        content: '';
        position: absolute;
        left: 50%;
        top: 0;
        bottom: 0;
        width: 3px;
        transform: translateX(-50%);
        background: var(--at-selection-edge);
        opacity: 0;
        transition: opacity 120ms ease;
    }
    .at-range-handle:hover::after,
    .at-range-handle:focus-visible::after,
    .at-range-handle.is-dragging::after { opacity: 1; }
`
);
