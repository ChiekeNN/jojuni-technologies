/**
 * Bank accounts money moves through.
 *
 * The workspace tracks *which bank an entry touches*: income records where the
 * payment landed, expenses record where the money left from.
 *
 * The two lists differ on purpose. Money can only arrive in an account the
 * company actually holds — today that is Fidelity, so income offers nothing
 * else. Money can leave for anywhere: a contractor at GTBank, a vendor paid
 * into Access, a SaaS tool on a card. Restricting expenses to Fidelity would
 * have made half of them impossible to record.
 *
 * Edit `INCOME_BANKS` when another account is opened. The names here are the
 * banks, not account numbers, so two accounts at the same bank would need
 * distinguishing labels.
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

/**
 * Where income can land. Only accounts the company holds.
 * Fidelity is the only operating account for now.
 */
export const INCOME_BANK_NAMES: string[] = ["Fidelity Bank"];

export const INCOME_BANKS: BankOption[] = BANK_OPTIONS.filter((bank) =>
  INCOME_BANK_NAMES.includes(bank.name),
);

/** Same banks, alphabetical — pickers are much easier to scan this way. */
export const BANKS_SORTED: BankOption[] = [...BANK_OPTIONS].sort((a, b) =>
  a.label.localeCompare(b.label, "en"),
);

export function bankByName(name: string | undefined): BankOption | undefined {
  if (!name) return undefined;
  return BANK_OPTIONS.find((bank) => bank.name === name);
}
