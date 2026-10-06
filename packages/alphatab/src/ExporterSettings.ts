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
     * Optional physical width in millimeters for each system in a GP7/8 export.
     * A positive value writes native GP8 score-view records, dividing this width
     * equally among the bars of each requested system, including the last one.
     * Choose the usable width for the target page and stylesheet. Zero leaves
     * native automatic sizing unchanged. System bar counts must be positive integers.
     * @since 1.9.0
     * @defaultValue `0`
     * @category Exporter
     */
    public gpSystemWidth: number = 0;
}
