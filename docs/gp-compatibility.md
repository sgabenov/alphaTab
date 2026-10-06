# Native Guitar Pro export compatibility

Guitar Pro 8 can warn when a sequence exceeds 4000 playback bars after repeats
and directions are unfolded. `Gp7Exporter` checks the exported score with
AlphaTab's playback controller and logs `GuitarProPlaybackBarLimit` when that
count exceeds 4000. It does not remove repeats, split scores or alter notation.
The count follows AlphaTab's playback semantics; native playback may differ for
features the target cannot represent. This is a warning, not a native validator.

The check stops at the first excess bar. To keep export bounded even when huge
repeat counts skip many alternate endings, it stops after 100000 transitions
and logs `GuitarProPlaybackCheckIncomplete` if traversal is unfinished. An
incomplete check must not be interpreted as target compatibility.

Capture these messages through the existing `Logger.log` interface if an export
UI needs to present them. Repeats can be removed or scores divided deliberately
by the caller, after the user chooses a practice workflow.

## Editing an exported archive

AlphaTab already writes native section marker strings as CDATA. An XML editor
may preserve the text but change its representation; this can hide the framed
marker in Guitar Pro. Preserve CDATA when post-processing `Content/score.gpif`.
With Python lxml:

```python
from lxml import etree
parser = etree.XMLParser(strip_cdata=False)
root = etree.fromstring(gpif_bytes, parser)
# Apply the intended edit; preserve text nodes that do not need changes.
# If replacing a marker, preserve its explicit native text representation:
root.find('.//Section/Letter').text = etree.CDATA('№ 01')
updated = etree.tostring(root, encoding='UTF-8', xml_declaration=True)
```

Keep the other archive entries unchanged. Reopen the result in native Guitar
Pro to check the marker and layout; an AlphaTab reimport alone is insufficient.
CDATA loss introduced by a downstream XML editor is not an AlphaTab exporter bug.
