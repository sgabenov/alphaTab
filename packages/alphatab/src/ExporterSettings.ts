/**
 * All settings related to exporters that encode file formats.
 * @json
 * @json_declaration
 * @public
 */
export class ExporterSettings {
    /**
     * How many characters should be indented on formatted outputs. If set to negative values
     * formatted outputs are disabled.
     * @since 1.7.0
     * @defaultValue `2`
     * @category Exporter
     */
    public indent: number = 2;

    /**
     * Whether to write extended comments into the exported file (e.g. to in alphaTex to mark where certain metadata or bars starts)
     * @since 1.7.0
     * @defaultValue `false`
     * @category Exporter
     */
    public comments: boolean = false;
    /**
     * Opt-in bottom alignment of beat text within each requested track system.
     * Leading blank lines pad shorter blocks. The caller chooses the line order;
     * for practice sheets place each exercise title on the last line. Text is
     * prepared on the export copy, leaving the original score untouched.
     * This targets single-track native views with explicit systemsLayout.
     * @since 1.9.0
     * @defaultValue `false`
     * @category Exporter
     */
    public gpAlignTextBottom: boolean = false;

    /**
     * Soft wrapping length used with gpAlignTextBottom. Wraps at word boundaries
     * and preserves long words. Choose this for the target font and available
     * annotation width; a character count is not a physical font measurement.
     * @since 1.9.0
     * @defaultValue `40`
     * @category Exporter
     */
    public gpTextLineLength: number = 40;
}
