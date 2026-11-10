/**
 * Bank accounts money moves through.
 *
 * The workspace tracks *which bank an entry touches*: income records where the
 * payment landed, expenses record where the money left from. That is enough to
 * answer "what is actually sitting in GTBank right now?" without pretending to
 * be a reconciliation tool.
 *
 * Edit this list to match the accounts the company really holds — the names
 * here are the banks, not specific account numbers, so two accounts at the same
 * bank would need distinguishing labels.
 */

export interface BankOption {
  /** Stored on the entry. Keep these stable once entries reference them. */
  name: string;
  /** Shown in the picker. */
  label: string;
  /** Brand-ish colour for the small chip on each row. */
  color: string;
}

export const BANK_OPTIONS: BankOption[] = [
  { name: "GTBank", label: "GTBank", color: "#dd4b39" },
  { name: "Access Bank", label: "Access Bank", color: "#e87722" },
  { name: "Zenith Bank", label: "Zenith Bank", color: "#d01f2f" },
  { name: "First Bank", label: "First Bank", color: "#1b3a6b" },
  { name: "UBA", label: "UBA", color: "#b5121b" },
  { name: "Fidelity Bank", label: "Fidelity Bank", color: "#0a7f3f" },
  { name: "Stanbic IBTC", label: "Stanbic IBTC", color: "#0033a0" },
  { name: "Union Bank", label: "Union Bank", color: "#0f7d99" },
  { name: "Sterling Bank", label: "Sterling Bank", color: "#7b1e3c" },
  { name: "Wema / ALAT", label: "Wema / ALAT", color: "#7a1f5c" },
  { name: "Polaris Bank", label: "Polaris Bank", color: "#4b1d6b" },
  { name: "Keystone Bank", label: "Keystone Bank", color: "#1f5c3a" },
  { name: "Providus Bank", label: "Providus Bank", color: "#8a1c2b" },
  { name: "Kuda", label: "Kuda", color: "#40196d" },
  { name: "Moniepoint", label: "Moniepoint", color: "#0357ee" },
  { name: "OPay", label: "OPay", color: "#1dc468" },
  { name: "PalmPay", label: "PalmPay", color: "#6b2fd6" },
  { name: "Paystack (settlement)", label: "Paystack (settlement)", color: "#011b33" },
  { name: "Flutterwave (settlement)", label: "Flutterwave (settlement)", color: "#f5a623" },
  { name: "Cash", label: "Cash", color: "#525252" },
  { name: "Other", label: "Other", color: "#6f6f6f" },
];

export const BANK_NAMES: string[] = BANK_OPTIONS.map((bank) => bank.name);

/** Same banks, alphabetical — pickers are much easier to scan this way. */
export const BANKS_SORTED: BankOption[] = [...BANK_OPTIONS].sort((a, b) =>
  a.label.localeCompare(b.label, "en"),
);

export function bankByName(name: string | undefined): BankOption | undefined {
  if (!name) return undefined;
  return BANK_OPTIONS.find((bank) => bank.name === name);
}
