import { Gp7Exporter } from '@coderline/alphatab/exporter/Gp7Exporter';
import { ScoreLoader } from '@coderline/alphatab/importer/ScoreLoader';
import { ConsoleLogger, Logger } from '@coderline/alphatab/Logger';
import { describe, expect, it } from 'vitest';

class WarningLogger extends ConsoleLogger {
    public warnings: string[] = [];
    public override warning(_category: string, message: string, ..._details: unknown[]): void {
        this.warnings.push(message);
    }
}

describe('Gp7 internal-pickup warning', () => {
    it('identifies internal pickups without changing their duration or the source flags', () => {
        const logger = new WarningLogger();
        const previous = Logger.log;
        Logger.log = logger;
        try {
            const score = ScoreLoader.loadAlphaTex('\\tuning (G2 D2 A1 E1) . 9.3.8 | 9.3.8 | r.1');
            score.masterBars[0].isAnacrusis = true;
            score.masterBars[1].isAnacrusis = true;
            const back = ScoreLoader.loadScoreFromBytes(new Gp7Exporter().export(score));
            expect(logger.warnings).toHaveLength(1);
            expect(logger.warnings[0]).toContain('UnsupportedInternalPickup: bar 2');
            expect(back.masterBars[0].isAnacrusis).toBe(true);
            expect(score.masterBars[1].isAnacrusis).toBe(true);
            const beat = back.tracks[0].staves[0].bars[1].voices[0].beats[0];
            expect(beat.duration).toBe(8);
            logger.warnings.length = 0;
            score.masterBars[1].isAnacrusis = false;
            new Gp7Exporter().export(score);
            expect(logger.warnings).toHaveLength(0);
        } finally {
            Logger.log = previous;
        }
    });
});
