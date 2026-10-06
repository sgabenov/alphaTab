# Preparing paired exercise annotations for native Guitar Pro

The optional GP exporter settings `gpAlignTextBottom` and `gpTextLineLength`
wrap text at word boundaries and pad shorter text blocks with leading blank
lines within each requested track system. The original score is not modified.
Defaults preserve the caller's original text.

For paired exercises use an explicit `track.systemsLayout`, put an exercise
number on the last line of each beat's `text`, and put shared recommendations
only on the first exercise. The exporter preserves line order and does not
recognize or delete duplicated instructions. This works for other caption
formats too; the exporter does not require the word "Exercise".

```ts
score.tracks[0].systemsLayout = [4]; // two two-bar exercises
bars[0].voices[0].beats[0].text =
    'Set: practice\nRepeat each exercise 20 times\nClosed roll explanation\nExercise: Number 1';
bars[2].voices[0].beats[0].text = 'Exercise: Number 2';
settings.exporter.gpAlignTextBottom = true;
settings.exporter.gpTextLineLength = 30;
```

This targets single-track native views using the requested systems. It is not a
font measurement or collision detector: choose the wrapping length for the
available width and native stylesheet. Long words are not split. Bottom
alignment is relative to other text blocks in the system, not to different
tracks displayed together in full-score mode. Changing the native layout after
export can invalidate the padding; export again for the new layout.
