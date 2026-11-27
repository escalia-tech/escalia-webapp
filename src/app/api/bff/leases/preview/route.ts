import { fetchLeasePreview } from "@/features/leases/server/leases.preview";

/** The draft preview of a lease, for the landlord who owns it. */
export async function GET(request: Request): Promise<Response> {
  return fetchLeasePreview(new URL(request.url).searchParams);
}
