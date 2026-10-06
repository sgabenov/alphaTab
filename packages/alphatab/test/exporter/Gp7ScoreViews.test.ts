/** @target web */
import { Gp7Exporter } from '@coderline/alphatab/exporter/Gp7Exporter';
import { ScoreLoader } from '@coderline/alphatab/importer/ScoreLoader';
import { ByteBuffer } from '@coderline/alphatab/io/ByteBuffer';
import { IOHelper } from '@coderline/alphatab/io/IOHelper';
import { JsonConverter } from '@coderline/alphatab/model/JsonConverter';
import { Settings } from '@coderline/alphatab/Settings';
import { ZipReader } from '@coderline/alphatab/zip/ZipReader';
import { describe, expect, it } from 'vitest';

function fields(bytes: Uint8Array): Map<number, (number | Uint8Array)[]> {
    let position = 0;
    function variable(): number {
        let result = 0,
            shift = 0,
            byte: number;
        do {
            byte = bytes[position++];
            result += (byte & 127) * 2 ** shift;
            shift += 7;
        } while (byte & 128);
        return result;
    }
    const result = new Map<number, (number | Uint8Array)[]>();
    while (position < bytes.length) {
        const tag = variable(),
            field = tag >> 3;
        let value: number | Uint8Array;
        if ((tag & 7) === 0) {
            value = variable();
        } else if ((tag & 7) === 2) {
            const length = variable();
            value = bytes.slice(position, position + length);
            position += length;
        } else if ((tag & 7) === 5) {
            value = new DataView(bytes.buffer, bytes.byteOffset + position, 4).getFloat32(0, true);
            position += 4;
        } else {
            throw new Error('Unexpected wire type');
        }
        if (!result.has(field)) {
            result.set(field, []);
        }
        result.get(field)!.push(value);
    }
    return result;
}
function exported(width: number) {
    const score = ScoreLoader.loadAlphaTex(
        '\\track "Snare № 1" { instrument percussion } :4 38 38 38 38 | :4 38 38 38 38 | :4 38 38 38 38'
    );
    score.systemsLayout = score.tracks[0].systemsLayout = [2, 1];
    const before = JsonConverter.scoreToJsObject(score);
    const settings = new Settings();
    settings.exporter.gpSystemWidth = width;
    const bytes = new Gp7Exporter().export(score, settings);
    expect(JsonConverter.scoreToJsObject(score)).toEqual(before);
    const entries = new ZipReader(ByteBuffer.fromBuffer(bytes), settings.importer.maxDecodingBufferSize).read();
    return { bytes, entries, score, settings };
}
describe('Gp7 explicit score-view width', () => {
    it('writes matching view references and full-width final systems', () => {
        const { bytes, entries } = exported(190);
        const gpif = IOHelper.toString(entries.find(e => e.fileName === 'score.gpif')!.data, 'utf-8');
        expect(gpif).toContain('<ScoreView id="1"');
        expect(gpif).toContain('<ScoreView id="2"');
        for (const id of [1, 2]) {
            const view = fields(entries.find(e => e.fullName === `Content/ScoreViews/${id}.gpsv`)!.data);
            const bars = view.get(3)!.map(data => fields(data as Uint8Array));
            const sizes = bars.map(bar => fields(bar.get(4)![0] as Uint8Array));
            expect(sizes.map(size => size.get(1)![0])).toEqual([95, 95, 190]);
            expect(sizes.map(size => size.get(2)?.[0] ?? 0)).toEqual([0, 1, 1]);
            expect(bars.map(bar => bar.get(1)![0])).toEqual([0, 1, 2]);
            expect(bars.map(bar => bar.get(2)![0])).toEqual([1, 2, 3]);
        }
        const view = fields(entries.find(e => e.fileName === '2.gpsv')!.data);
        expect(IOHelper.toString(view.get(2)![0] as Uint8Array, 'utf-8')).toBe('Snare № 1');
        expect(ScoreLoader.loadScoreFromBytes(bytes).tracks[0].systemsLayout).toEqual([2, 1]);
    });
    it('leaves default native sizing unchanged', () => {
        const { entries } = exported(0);
        expect(entries.some(e => e.fullName.includes('/ScoreViews/'))).toBe(false);
        expect(IOHelper.toString(entries.find(e => e.fileName === 'score.gpif')!.data, 'utf-8')).not.toContain(
            '<ScoreViews>'
        );
    });
    it('rejects invalid widths and counts instead of writing corrupt view records', () => {
        for (const width of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
            expect(() => exported(width)).toThrow();
        }
        const { score, settings } = exported(190);
        score.systemsLayout = [0];
        expect(() => new Gp7Exporter().export(score, settings)).toThrow('positive integer');
    });
});
