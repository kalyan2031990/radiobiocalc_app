import type { ParsedDvhBundle } from "@/lib/dvh-bundle-types";

export type PatientCase = {
  id: string;
  pseudonymId: string;
  planLabel: string;
  createdAt: string;
  bundle: ParsedDvhBundle;
};
