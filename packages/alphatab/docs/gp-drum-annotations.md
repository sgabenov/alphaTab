# Beat-local drum hand labels in Guitar Pro exports

`Track.applyLyrics` distributes words over successive beats. For a static hand-pulse label associated with a single roll beat, assign `Beat.lyrics` directly:

```ts
const beats = score.tracks[0].staves[0].bars.flatMap(bar => bar.voices[0].beats);
beats[0].lyrics = ['R L R L'];
beats[1].lyrics = ['L'];
beats[2].lyrics = ['R L'];
beats[3].lyrics = ['R'];
const bytes = new Gp7Exporter().export(score);
```

The labels remain attached to their beats through export/reimport and native Guitar Pro 8.1.5 display. This is a static annotation: the individual letters do not carry separate onset times or change roll playback. It does not supply a timed hand-pulse model.

A linear `isLegatoOrigin` at the end of a repeated exercise can link to the next exercise. It does not specify a return arc to the repeat target. Native encoding and model semantics for that cyclic arc remain unresolved in upstream issue #2923; the example above does not implement that feature. Until it is established, the closing arc's meaning can be recorded in the exercise text rather than encoded as a linear legato to an unrelated exercise.
