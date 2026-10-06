import { Logger } from '@coderline/alphatab/Logger';
import { MidiPlaybackController } from '@coderline/alphatab/midi/MidiPlaybackController';
import type { Score } from '@coderline/alphatab/model/Score';

/** @internal */
export class Gp7PlaybackCompatibility {
    public static warn(score: Score): void {
        const controller = new MidiPlaybackController(score);
        let playedBars = 0;
        let transitions = 0;
        // Bound work even for extreme alternate-ending/repeat combinations.
        while (!controller.finished && transitions < 100000) {
            controller.processCurrent();
            if (controller.shouldPlay && ++playedBars > 4000) {
                Logger.warning(
                    'Gp7Exporter',
                    'GuitarProPlaybackBarLimit: playback exceeds 4000 bars after repeats and directions. Guitar Pro may ignore repeats and directions; the exported notation and repeats are unchanged.'
                );
                return;
            }
            controller.moveNext();
            transitions++;
        }
        if (!controller.finished) {
            Logger.warning(
                'Gp7Exporter',
                'GuitarProPlaybackCheckIncomplete: stopped after 100000 playback transitions. Target playback compatibility could not be established; the exported notation and repeats are unchanged.'
            );
        }
    }
}
