import { Gp7Exporter } from '@coderline/alphatab/exporter/Gp7Exporter';
import { ScoreLoader } from '@coderline/alphatab/importer/ScoreLoader';
import { Settings } from '@coderline/alphatab/Settings';
import { describe, expect, it } from 'vitest';

describe('Gp7 opt-in practice text', () => {
    it('aligns bottom titles, wraps explanations and keeps source text', () => {
        const score = ScoreLoader.loadAlphaTex(
            '\\instrument percussion . :4 38 38 38 38 | :4 38 38 38 38 | :4 38 38 38 38 | :4 38 38 38 38'
        );
        const bars = score.tracks[0].staves[0].bars;
        score.tracks[0].systemsLayout = [4];
        const first = 'Set: practice\nA long roll explanation with ordinary words\nExercise: Number 1';
        bars[0].voices[0].beats[0].text = first;
        bars[2].voices[0].beats[0].text = 'Exercise: Number 2';
        bars[3].voices[0].beats[0].text = 'Generic caption\nkeep its layout';
        const settings = new Settings();
        settings.exporter.gpAlignTextBottom = true;
        settings.exporter.gpTextLineLength = 24;
        const back = ScoreLoader.loadScoreFromBytes(new Gp7Exporter().export(score, settings));
        const output = back.tracks[0].staves[0].bars;
        const left = output[0].voices[0].beats[0].text!.split('\n');
        const right = output[2].voices[0].beats[0].text!.split('\n');
        expect(left[left.length - 1]).toBe('Exercise: Number 1');
        expect(right[right.length - 1]).toBe('Exercise: Number 2');
        expect(left.length).toBe(right.length);
        expect(left.every(line => line.length <= 24)).toBe(true);
        expect(bars[0].voices[0].beats[0].text).toBe(first);
        expect(output[3].voices[0].beats[0].text!.trimStart()).toBe('Generic caption\nkeep its layout');
        const again = ScoreLoader.loadScoreFromBytes(new Gp7Exporter().export(back, settings));
        expect(again.tracks[0].staves[0].bars[2].voices[0].beats[0].text).toBe(output[2].voices[0].beats[0].text);
        const defaultBack = ScoreLoader.loadScoreFromBytes(new Gp7Exporter().export(score));
        expect(defaultBack.tracks[0].staves[0].bars[0].voices[0].beats[0].text).toBe(first);
    });
    it('rejects invalid wrapping lengths without changing the score', () => {
        const score = ScoreLoader.loadAlphaTex('\\instrument percussion . :4 38 38 38 38');
        for (const length of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
            const settings = new Settings();
            settings.exporter.gpAlignTextBottom = true;
            settings.exporter.gpTextLineLength = length;
            expect(() => new Gp7Exporter().export(score, settings)).toThrow('positive integer');
        }
    });
});
