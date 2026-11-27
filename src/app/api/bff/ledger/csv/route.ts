import { fetchLedgerCsv } from "@/features/leases/server/ledger.csv";

/** The ledger of one lease as a CSV, for the landlord who owns it or a tenant of it. */
export async function GET(request: Request): Promise<Response> {
  return fetchLedgerCsv(new URL(request.url).searchParams);
}
