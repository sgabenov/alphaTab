import { AlphaTabError, AlphaTabErrorType } from '@coderline/alphatab/AlphaTabError';
import type { Beat } from '@coderline/alphatab/model/Beat';
import type { Score } from '@coderline/alphatab/model/Score';

/** @internal */
export class Gp7TextLayout {
    public static apply(score: Score, lineLength: number): void {
        if (!Number.isInteger(lineLength) || lineLength <= 0) {
            throw new AlphaTabError(AlphaTabErrorType.General, 'gpTextLineLength must be a positive integer.');
        }
        for (const track of score.tracks) {
            for (const staff of track.staves) {
                let start = 0;
                let system = 0;
                while (start < staff.bars.length) {
                    let count = track.systemsLayout[system] ?? track.defaultSystemsLayout;
                    if (!Number.isInteger(count) || count <= 0) {
                        count = 3;
                    }
                    const end = Math.min(start + count, staff.bars.length);
                    const beats: Beat[] = [];
                    const blocks: string[][] = [];
                    let height = 0;
                    for (let i = start; i < end; i++) {
                        for (const voice of staff.bars[i].voices) {
                            for (const beat of voice.beats) {
                                const lines = Gp7TextLayout._prepare(beat.text, lineLength);
                                if (lines !== null) {
                                    beats.push(beat);
                                    blocks.push(lines);
                                    height = Math.max(height, lines.length);
                                }
                            }
                        }
                    }
                    for (let i = 0; i < beats.length; i++) {
                        let text = blocks[i].join('\n');
                        for (let line = blocks[i].length; line < height; line++) {
                            text = `\n${text}`;
                        }
                        beats[i].text = text;
                    }
                    start = end;
                    system++;
                }
            }
        }
    }

    private static _prepare(text: string | null, lineLength: number): string[] | null {
        if (!text) {
            return null;
        }
        const source = text.replace(/\r\n/g, '\n').split('\n');
        while (source.length > 0 && source[0] === '') {
            source.shift();
        }
        const lines: string[] = [];
        for (const line of source) {
            lines.push(...Gp7TextLayout._wrap(line, lineLength));
        }
        return lines;
    }

    private static _wrap(line: string, length: number): string[] {
        if (line.trim().length === 0) {
            return [''];
        }
        const lines: string[] = [];
        let current = '';
        for (const word of line.trim().split(/\s+/)) {
            if (current.length > 0 && current.length + word.length + 1 > length) {
                lines.push(current);
                current = word;
            } else {
                current = current.length === 0 ? word : `${current} ${word}`;
            }
        }
        lines.push(current);
        return lines;
    }
}
