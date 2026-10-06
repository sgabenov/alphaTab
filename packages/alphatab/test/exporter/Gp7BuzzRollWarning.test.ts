import { Gp7Exporter } from '@coderline/alphatab/exporter/Gp7Exporter';
import { ScoreLoader } from '@coderline/alphatab/importer/ScoreLoader';
import { ConsoleLogger, Logger } from '@coderline/alphatab/Logger';
import { TremoloPickingEffect } from '@coderline/alphatab/model/TremoloPickingEffect';
import { TremoloPickingStyle } from '@coderline/alphatab/model/TremoloPickingEffect';
import { describe, expect, it } from 'vitest';

/** @internal */
class WarningLogger extends ConsoleLogger {
    public warnings: string[] = [];
    public override warning(_category: string, message: string, ..._details: unknown[]): void {
        this.warnings.push(message);
    }
}

describe('Gp7 buzz-roll warning', () => {
    it('reports the affected beat while preserving marks and the source score', () => {
        const logger = new WarningLogger();
        const previous = Logger.log;
        Logger.log = logger;
        try {
            const score = ScoreLoader.loadAlphaTex('\\instrument percussion \\ts (2 2) . :2 38 38');
            const beat = score.tracks[0].staves[0].bars[0].voices[0].beats[1];
            beat.tremoloPicking = new TremoloPickingEffect();
            beat.tremoloPicking.marks = 3;
            beat.tremoloPicking.style = TremoloPickingStyle.BuzzRoll;
            const back = ScoreLoader.loadScoreFromBytes(new Gp7Exporter().export(score));
            expect(logger.warnings).toHaveLength(1);
            expect(logger.warnings[0]).toContain('UnsupportedBuzzRoll');
            expect(logger.warnings[0]).toContain('track 1, staff 1, bar 1, voice 1, beat 2');
            expect(back.tracks[0].staves[0].bars[0].voices[0].beats[1].tremoloPicking!.marks).toBe(3);
            expect(beat.tremoloPicking.style).toBe(TremoloPickingStyle.BuzzRoll);
            logger.warnings.length = 0;
            beat.tremoloPicking.style = TremoloPickingStyle.Default;
            new Gp7Exporter().export(score);
            expect(logger.warnings).toHaveLength(0);
        } finally {
            Logger.log = previous;
        }
    });
});
