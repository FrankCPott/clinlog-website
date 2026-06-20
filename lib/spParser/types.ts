/**
 * Types for the SP (Sundhedsplatformen) smartphrase parser.
 */

/** A single data point extracted from the raw SP output. */
export interface DataPoint {
  /** Normalized key used for grouping/matching (e.g. "BT", "KREATININP") */
  key: string;
  /** The value text (e.g. "100/52", "155") */
  value: string;
  /** True if marked with (!) — SP alert flag */
  flagAlert: boolean;
  /** Date in DD-MM-YYYY format */
  date: string;
}

/** Values for a lab component on today + optionally yesterday */
export interface LabResult {
  todayValue:     string;
  yesterdayValue: string | null;
  flagAlert:      boolean;   // (!) from inline, or (H)/(L) from table
}

/** Fully structured parse result (intermediate form) */
export interface ParsedSections {
  cns:      DataPoint[];
  resp:     DataPoint[];
  circ:     DataPoint[];
  gi:       DataPoint[];
  renal:    DataPoint[];
  coag:     DataPoint[];
  systemic: DataPoint[];
  micro:    DataPoint[];
  /** Lab results keyed by mapped display name */
  labs: Record<string, LabResult>;
}
