# GP export changes: review notes

This branch collects an experimental set of alphaTab changes for review in the
fork. It is not yet an upstream pull request. The base is alphaTab develop
`7d3efe78e9d00744e20d6db656518a5e45b93f7a`.

## Changes and motivation

1. **Per-note Guitar Pro dynamics**: add optional `gpVelocity`
   and `gpRelativeVelocity` fields to `Note`, preserve them in GPIF import and
   export, and include them in generated cloning/serialization code. This
   lets a caller retain Guitar Pro-specific per-note values when writing a
   score. The fields are not used by alphaTab playback. A follow-up preserves
   fractional relative values when importing GPIF.
2. **Audio panel visibility**: if a GP export contains an embedded
   backing-track asset, add `Content/Preferences.json` requesting a visible
   backing-track panel in Guitar Pro. alphaTab already supported writing the
   backing-track asset and synchronization metadata before this change; this
   commit only adds the display preference. Files without an embedded asset do
   not receive that preference.
3. **Fractional tempo**: stop truncating initial and subsequent
   tempo values in GPIF writer output, preserving fractional values present in
   the score model. The separate score-model fallback is still integer-valued;
   the test explicitly records that limitation.

The initial three topics are combined in commit `5291e636` on this review
branch; subsequent commits refine fractional velocity and the generated C#
code. They should be considered separate proposals for upstream review.

## Evidence and limits

- The added exporter tests cover GP round-trip of integer and fractional note fields, audio
  preference presence/absence, and fractional tempo automations. They do not
  prove playback behavior across Guitar Pro versions or alphaTab platforms.
- Previously tested real drum exercises opened in Guitar Pro 8.1.4 with notes
  and an audio waveform. Some tested MIDI note positions, instruments and
  velocities matched the source after a Guitar Pro MIDI export and live output.
  These observations apply to those exercises and settings only; exact audio/MIDI
  synchronization and equivalence to Melodics have not been established.
- In a separate synthetic GP8.1.4 check, fractional relative-velocity values
  written by alphaTab did not provide the expected extra MIDI resolution: live
  output and MIDI export both yielded velocities 26, 64, 76, 80, 113, 64, 76,
  80 for offsets -15.5, 0.5, 3.75, 4.25, 10.75, 0.75, 3.5, 4.5. This does
  not rule out other settings or representations.
- Targeted TS exporter tests passed on Windows. On Linux WSL with .NET SDK
  8.0.427, the C# library and test project compiled and the generated fractional
  velocity round-trip test passed. Kotlin runtime behavior, broader regression
  suites, and an independent CI run remain to be verified. Do not claim
  universal support for MIDI dynamics or GP versions.

- On Windows with Git `core.autocrlf=true`, the full `Gp7Exporter.test.ts`
  initially reported two snapshot failures (`percussion-articulations` and
  `sound-mapper`): their checked-out snapshots had CRLF while generated strings
  used LF. Temporarily normalizing those two snapshots to LF yielded 29/29
  passing tests; the original checkout bytes were restored afterward. This is
  an environment-specific verification, not a permanent fix for the checkout.

## Before proposing upstream

Review the three topics separately with maintainers; they may belong in
independent issues and pull requests. Upstream `AGENTS.md` requires a triaged,
accepted issue before opening a pull request, and AI-authored submissions must
include its exact disclosure. Reproduce each issue with the required runtime
information, check cross-platform behavior and documentation, and remove or
relocate this fork-specific review note before an upstream PR if appropriate.
