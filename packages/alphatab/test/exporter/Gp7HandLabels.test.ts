import { Gp7Exporter } from '@coderline/alphatab/exporter/Gp7Exporter';
import { ScoreLoader } from '@coderline/alphatab/importer/ScoreLoader';
import { describe, expect, it } from 'vitest';

describe('Gp7 beat-local hand labels', () => {
    it('keeps multiple hand pulses on the first sustained beat', () => {
        const score = ScoreLoader.loadAlphaTex('\\instrument percussion . :2 38 38 | :2 38 38');
        const beats = score.tracks[0].staves[0].bars.flatMap(bar => bar.voices[0].beats);
        const labels = ['R L R L', 'L', 'R L', 'R'];
        for (let i = 0; i < beats.length; i++) beats[i].lyrics = [labels[i]];
        const back = ScoreLoader.loadScoreFromBytes(new Gp7Exporter().export(score));
        expect(back.tracks[0].staves[0].bars.flatMap(bar => bar.voices[0].beats.map(beat => beat.lyrics![0]))).toEqual(labels);
        expect(beats[0].lyrics).toEqual(['R L R L']);
    });
});
