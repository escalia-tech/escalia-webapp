import { fetchBylawsPdf } from "@/features/leases/server/bylaws.pdf";

/** One version of the by-laws of a building, for the landlord who owns it. */
export async function GET(request: Request): Promise<Response> {
  return fetchBylawsPdf(new URL(request.url).searchParams);
}
