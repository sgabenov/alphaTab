import { Gp7Exporter } from '@coderline/alphatab/exporter/Gp7Exporter';
import { ScoreLoader } from '@coderline/alphatab/importer/ScoreLoader';
import { ByteBuffer } from '@coderline/alphatab/io/ByteBuffer';
import { IOHelper } from '@coderline/alphatab/io/IOHelper';
import { Settings } from '@coderline/alphatab/Settings';
import { XmlDocument } from '@coderline/alphatab/xml/XmlDocument';
import { ZipEntry } from '@coderline/alphatab/zip/ZipEntry';
import { ZipReader } from '@coderline/alphatab/zip/ZipReader';
import { ZipWriter } from '@coderline/alphatab/zip/ZipWriter';
import { Gp7ExportAssertions } from 'test/exporter/Gp7ExportAssertions';
import { describe, expect, it } from 'vitest';

describe('Gp7 written-pitch verification', () => {
    it('detects corrupt staff pitch even when tab MIDI roundtrips correctly', () => {
        const score = ScoreLoader.loadAlphaTex('\\tuning (G2 D2 A1 E1) \\ks F . 3.1.1');
        const settings = new Settings();
        const correct = new Gp7Exporter().export(score);
        Gp7ExportAssertions.writtenPitches(score, correct);
        const entries = new ZipReader(ByteBuffer.fromBuffer(correct), settings.importer.maxDecodingBufferSize).read();
        const output = ByteBuffer.withCapacity(1024);
        const writer = new ZipWriter(output);
        for (const entry of entries) {
            if (entry.fileName === 'score.gpif') {
                const xml = new XmlDocument();
                xml.parse(IOHelper.toString(entry.data, 'utf-8'));
                const properties = xml
                    .firstElement!.findChildElement('Notes')!
                    .firstElement!.findChildElement('Properties')!;
                const pitch = properties
                    .childElements()
                    .find(p => p.attributes.get('name') === 'ConcertPitch')!
                    .findChildElement('Pitch')!;
                pitch.findChildElement('Step')!.innerText = 'A';
                pitch.findChildElement('Accidental')!.innerText = '';
                writer.writeEntry(new ZipEntry(entry.fullName, IOHelper.stringToBytes(xml.toString())));
            } else {
                writer.writeEntry(entry);
            }
        }
        writer.end();
        const corrupted = output.toArray();
        const back = ScoreLoader.loadScoreFromBytes(corrupted);
        expect(back.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0].realValueWithoutHarmonic).toBe(46);
        expect(() => Gp7ExportAssertions.writtenPitches(score, corrupted)).toThrow('ConcertPitch');
    });
});
