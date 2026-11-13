import Decimal from "decimal.js";

// NUMERIC values remain strings. Derived display values allow up to 80 source digits.
export const PreciseDecimal = Decimal.clone({ precision: 100 });
