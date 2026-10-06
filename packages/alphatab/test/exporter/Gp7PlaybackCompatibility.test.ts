import { Gp7Exporter } from '@coderline/alphatab/exporter/Gp7Exporter';
import { ScoreLoader } from '@coderline/alphatab/importer/ScoreLoader';
import { ConsoleLogger, Logger } from '@coderline/alphatab/Logger';
import { describe, expect, it } from 'vitest';

/** @internal */
class WarningLogger extends ConsoleLogger {
    public warnings: string[] = [];
    public override warning(_category: string, message: string, ..._details: unknown[]): void {
        this.warnings.push(message);
    }
}

describe('Gp7 playback compatibility', () => {
    it('warns above 4000 expanded bars, retains repeats and leaves source unchanged', () => {
        const logger = new WarningLogger();
        const previous = Logger.log;
        Logger.log = logger;
        try {
            for (const count of [200, 201]) {
                const score = ScoreLoader.loadAlphaTex(
                    `\\instrument percussion . \\ro ${Array(count - 1)
                        .fill(':1 r')
                        .join(' | ')} | \\rc 20 :1 r`
                );
                const back = ScoreLoader.loadScoreFromBytes(new Gp7Exporter().export(score));
                expect(logger.warnings.length).toBe(count === 200 ? 0 : 1);
                if (count === 201) {
                    expect(logger.warnings[0]).toContain('GuitarProPlaybackBarLimit');
                }
                expect(back.masterBars).toHaveLength(count);
                expect(back.masterBars[count - 1].repeatCount).toBe(20);
                expect(score.masterBars[count - 1].repeatCount).toBe(20);
                logger.warnings.length = 0;
            }
        } finally {
            Logger.log = previous;
        }
    });

    it('counts actual alternate endings rather than multiplying written bars', () => {
        const logger = new WarningLogger();
        const previous = Logger.log;
        Logger.log = logger;
        try {
            const score = ScoreLoader.loadAlphaTex('\\ro :1 r | \\ae 1 \\rc 2500 r | \\ae 2 r');
            new Gp7Exporter().export(score);
            expect(logger.warnings).toHaveLength(0);
        } finally {
            Logger.log = previous;
        }
    });

    it('includes bars replayed by directions', () => {
        const logger = new WarningLogger();
        const previous = Logger.log;
        Logger.log = logger;
        try {
            const score = ScoreLoader.loadAlphaTex(`${Array(2000).fill(':1 r').join(' | ')} | \\jump DaCapo :1 r`);
            new Gp7Exporter().export(score);
            expect(logger.warnings).toHaveLength(1);
            expect(logger.warnings[0]).toContain('GuitarProPlaybackBarLimit');
        } finally {
            Logger.log = previous;
        }
    });
    it('reports an incomplete check rather than success for extreme skipped endings', () => {
        const logger = new WarningLogger();
        const previous = Logger.log;
        Logger.log = logger;
        try {
            const score = ScoreLoader.loadAlphaTex('\\ro \\ae 1 \\rc 200001 :1 r');
            new Gp7Exporter().export(score);
            expect(logger.warnings).toHaveLength(1);
            expect(logger.warnings[0]).toContain('GuitarProPlaybackCheckIncomplete');
        } finally {
            Logger.log = previous;
        }
    });
});
