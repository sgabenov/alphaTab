import { ByteBuffer } from '@coderline/alphatab/io/ByteBuffer';
import { IOHelper } from '@coderline/alphatab/io/IOHelper';
import type { Score } from '@coderline/alphatab/model/Score';
import { Settings } from '@coderline/alphatab/Settings';
import { XmlDocument } from '@coderline/alphatab/xml/XmlDocument';
import { ZipReader } from '@coderline/alphatab/zip/ZipReader';
import { expect } from 'vitest';

/** @internal */
export class Gp7ExportAssertions {
    public static writtenPitches(score: Score, bytes: Uint8Array): void {
        const settings = new Settings();
        const entries = new ZipReader(ByteBuffer.fromBuffer(bytes), settings.importer.maxDecodingBufferSize).read();
        const xml = new XmlDocument();
        xml.parse(IOHelper.toString(entries.find(e => e.fileName === 'score.gpif')!.data, settings.importer.encoding));
        const writtenNotes = xml.firstElement!.findChildElement('Notes')!.childElements();
        const notes = score.tracks.flatMap(track =>
            track.staves.flatMap(staff =>
                staff.bars.flatMap(bar =>
                    bar.voices.filter(voice => !voice.isEmpty).flatMap(voice => voice.beats.flatMap(beat => beat.notes))
                )
            )
        );
        expect(writtenNotes).toHaveLength(notes.length);
        const natural: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
        const offsets: Record<string, number> = { '': 0, b: -1, '#': 1, bb: -2, x: 2 };
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            if (note.isPercussion) {
                continue;
            }
            const properties = writtenNotes[i].findChildElement('Properties')!.childElements();
            for (const field of ['ConcertPitch', 'TransposedPitch']) {
                const pitch = properties.find(p => p.attributes.get('name') === field)!.findChildElement('Pitch')!;
                const actual =
                    12 * Number(pitch.findChildElement('Octave')!.innerText) +
                    natural[pitch.findChildElement('Step')!.innerText] +
                    offsets[pitch.findChildElement('Accidental')!.innerText];
                const expected =
                    field === 'ConcertPitch' ? note.realValueWithoutHarmonic : note.displayValueWithoutBend;
                expect(
                    actual,
                    `note ${i}: ${field} must describe the intended pitch independently of roundtrip tab data`
                ).toBe(expected);
            }
        }
    }
}
