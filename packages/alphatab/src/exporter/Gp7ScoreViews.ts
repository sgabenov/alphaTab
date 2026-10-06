import { AlphaTabError, AlphaTabErrorType } from '@coderline/alphatab/AlphaTabError';
import { ByteBuffer } from '@coderline/alphatab/io/ByteBuffer';
import { IOHelper } from '@coderline/alphatab/io/IOHelper';
import { TypeConversions } from '@coderline/alphatab/io/TypeConversions';
import type { Score } from '@coderline/alphatab/model/Score';
import { ZipEntry } from '@coderline/alphatab/zip/ZipEntry';

/**
 * Native GP8 score-view width records. This intentionally covers only the
 * opt-in uniform-width layout, not the full GPSV format.
 * @internal
 */
export class Gp7ScoreViews {
    public static write(score: Score, systemWidth: number): ZipEntry[] {
        const entries: ZipEntry[] = [];
        entries.push(
            new ZipEntry(
                'Content/ScoreViews/1.gpsv',
                Gp7ScoreViews._writeView(
                    'Full Score',
                    score.systemsLayout,
                    score.defaultSystemsLayout,
                    score.masterBars.length,
                    systemWidth
                )
            )
        );
        for (const track of score.tracks) {
            entries.push(
                new ZipEntry(
                    `Content/ScoreViews/${track.index + 2}.gpsv`,
                    Gp7ScoreViews._writeView(
                        track.name,
                        track.systemsLayout,
                        track.defaultSystemsLayout,
                        score.masterBars.length,
                        systemWidth
                    )
                )
            );
        }
        return entries;
    }

    private static _writeView(
        name: string,
        systems: number[],
        defaultCount: number,
        barCount: number,
        width: number
    ): Uint8Array {
        if (
            !Number.isInteger(defaultCount) ||
            defaultCount <= 0 ||
            systems.some(count => !Number.isInteger(count) || count <= 0)
        ) {
            throw new AlphaTabError(
                AlphaTabErrorType.General,
                'Explicit GP system widths require positive integer system bar counts.'
            );
        }
        const view = ByteBuffer.withCapacity(256);
        Gp7ScoreViews._writeBlob(view, 2, IOHelper.stringToBytes(name));
        let index = 0;
        let system = 0;
        while (index < barCount) {
            const count = Math.min(systems[system] ?? defaultCount, barCount - index);
            for (let offset = 0; offset < count; offset++) {
                const bar = ByteBuffer.withCapacity(32);
                Gp7ScoreViews._writeInteger(bar, 1, index);
                Gp7ScoreViews._writeInteger(bar, 2, index + 1);
                const size = ByteBuffer.withCapacity(8);
                // Field 1, fixed32, little endian: physical bar width in mm.
                size.writeByte(13);
                const bytes = TypeConversions.float32BEToBytes(width / count);
                for (let i = bytes.length - 1; i >= 0; i--) {
                    size.writeByte(bytes[i]);
                }
                if (offset === count - 1) {
                    Gp7ScoreViews._writeInteger(size, 2, 1);
                }
                Gp7ScoreViews._writeBlob(bar, 4, size.toArray());
                Gp7ScoreViews._writeBlob(bar, 6, new Uint8Array(0));
                Gp7ScoreViews._writeBlob(view, 3, bar.toArray());
                index++;
            }
            system++;
        }
        return view.toArray();
    }

    private static _writeInteger(writer: ByteBuffer, field: number, value: number): void {
        Gp7ScoreViews._writeVarInt(writer, field << 3);
        Gp7ScoreViews._writeVarInt(writer, value);
    }

    private static _writeBlob(writer: ByteBuffer, field: number, bytes: Uint8Array): void {
        Gp7ScoreViews._writeVarInt(writer, (field << 3) | 2);
        Gp7ScoreViews._writeVarInt(writer, bytes.length);
        writer.write(bytes, 0, bytes.length);
    }

    private static _writeVarInt(writer: ByteBuffer, value: number): void {
        while (value > 127) {
            writer.writeByte((value & 127) | 128);
            value >>>= 7;
        }
        writer.writeByte(value);
    }
}
