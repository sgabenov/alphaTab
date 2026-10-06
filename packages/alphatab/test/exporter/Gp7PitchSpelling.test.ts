import { Gp7Exporter } from '@coderline/alphatab/exporter/Gp7Exporter';
import { ScoreLoader } from '@coderline/alphatab/importer/ScoreLoader';
import { ByteBuffer } from '@coderline/alphatab/io/ByteBuffer';
import { IOHelper } from '@coderline/alphatab/io/IOHelper';
import { KeySignature } from '@coderline/alphatab/model/KeySignature';
import { NoteAccidentalMode } from '@coderline/alphatab/model/NoteAccidentalMode';
import { Ottavia } from '@coderline/alphatab/model/Ottavia';
import { Settings } from '@coderline/alphatab/Settings';
import { XmlDocument } from '@coderline/alphatab/xml/XmlDocument';
import type { XmlNode } from '@coderline/alphatab/xml/XmlNode';
import { ZipReader } from '@coderline/alphatab/zip/ZipReader';
import { describe, expect, it } from 'vitest';

function writtenPitches(bytes: Uint8Array): XmlNode[] {
    const settings = new Settings();
    const entries = new ZipReader(ByteBuffer.fromBuffer(bytes), settings.importer.maxDecodingBufferSize).read();
    const xml = new XmlDocument();
    xml.parse(IOHelper.toString(entries.find(e => e.fileName === 'score.gpif')!.data, settings.importer.encoding));
    return xml.firstElement!.findChildElement('Notes')!.childElements();
}
function readPitch(note: XmlNode, field: string): [string, string, number] {
    const property = note
        .findChildElement('Properties')!
        .childElements()
        .find(p => p.attributes.get('name') === field)!;
    const pitch = property.findChildElement('Pitch')!;
    return [
        pitch.findChildElement('Step')!.innerText,
        pitch.findChildElement('Accidental')!.innerText,
        Number(pitch.findChildElement('Octave')!.innerText)
    ];
}
function midi(pitch: [string, string, number]): number {
    const natural: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const accidental: Record<string, number> = { '': 0, b: -1, '#': 1, bb: -2, x: 2 };
    return 12 * pitch[2] + natural[pitch[0]] + accidental[pitch[1]];
}
describe('Gp7 pitch spelling', () => {
    const cases: [string, KeySignature, number, number, NoteAccidentalMode, [string, string, number]][] = [
        ['Bb in F', KeySignature.F, 3, 1, NoteAccidentalMode.Default, ['B', 'b', 3]],
        ['forced Bb', KeySignature.F, 3, 1, NoteAccidentalMode.ForceFlat, ['B', 'b', 3]],
        ['E sharp', KeySignature.C, 1, 4, NoteAccidentalMode.ForceSharp, ['E', '#', 2]],
        ['B sharp', KeySignature.C, 8, 4, NoteAccidentalMode.ForceSharp, ['B', '#', 2]],
        ['E double flat', KeySignature.C, 10, 4, NoteAccidentalMode.ForceDoubleFlat, ['E', 'bb', 3]],
        ['D double sharp', KeySignature.C, 12, 4, NoteAccidentalMode.ForceDoubleSharp, ['D', 'x', 3]]
    ];
    it('preserves the six reported spellings without mutating notes', () => {
        for (const [_name, key, fret, string, mode, spelling] of cases) {
            const score = ScoreLoader.loadAlphaTex(`\\instrument 33 \\tuning (G2 D2 A1 E1) . ${fret}.${string}.1`);
            const bar = score.tracks[0].staves[0].bars[0];
            bar.keySignature = key;
            const note = bar.voices[0].beats[0].notes[0];
            note.accidentalMode = mode;
            const original = [note.string, note.fret, note.accidentalMode];
            const pitches = writtenPitches(new Gp7Exporter().export(score));
            expect(readPitch(pitches[0], 'ConcertPitch')).toEqual(spelling);
            expect(midi(readPitch(pitches[0], 'TransposedPitch'))).toBe(note.displayValueWithoutBend);
            expect([note.string, note.fret, note.accidentalMode]).toEqual(original);
        }
    });
    it('preserves every pitch class across keys, modes and octave boundaries', () => {
        for (let key = -7; key <= 7; key++) {
            for (let mode = 0; mode <= 6; mode++) {
                const bars = Array.from({ length: 6 }, (_, b) =>
                    Array.from({ length: 4 }, (_, i) => `${b * 4 + i}.1.4`).join(' ')
                ).join(' | ');
                const score = ScoreLoader.loadAlphaTex(`\\tuning (C4) . ${bars}`);
                const staff = score.tracks[0].staves[0];
                staff.transpositionPitch = staff.displayTranspositionPitch = 0;
                for (const bar of staff.bars) {
                    bar.keySignature = key;
                    for (const beat of bar.voices[0].beats) {
                        beat.notes[0].accidentalMode = mode;
                    }
                }
                const pitches = writtenPitches(new Gp7Exporter().export(score));
                expect(pitches).toHaveLength(24);
                for (let i = 0; i < pitches.length; i++) {
                    for (const field of ['ConcertPitch', 'TransposedPitch']) {
                        expect(
                            midi(readPitch(pitches[i], field)),
                            `key=${key}, mode=${mode}, fret=${i}, ${field}`
                        ).toBe(60 + i);
                    }
                }
            }
        }
    });
    it('keeps concert and displayed pitch distinct with transposition and ottavia', () => {
        const score = ScoreLoader.loadAlphaTex('\\tuning (C4) . 0.1.1');
        const staff = score.tracks[0].staves[0];
        staff.transpositionPitch = -2;
        staff.displayTranspositionPitch = 12;
        const beat = staff.bars[0].voices[0].beats[0];
        beat.ottava = Ottavia._8va;
        staff.bars[0].clefOttava = Ottavia._8vb;
        const pitch = writtenPitches(new Gp7Exporter().export(score))[0];
        expect(midi(readPitch(pitch, 'ConcertPitch'))).toBe(62);
        expect(midi(readPitch(pitch, 'TransposedPitch'))).toBe(50);
    });
});
