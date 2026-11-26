import { fetchSignDocument } from "@/features/signing/server/signing.document";

/** The document a signer reads before signing: by request id (signed in) or by link token. */
export async function GET(request: Request): Promise<Response> {
  return fetchSignDocument(new URL(request.url).searchParams);
}
