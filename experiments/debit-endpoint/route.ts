import { debit, type Auth, type Session } from "./handler.ts";

function validId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.isWellFormed() && !value.includes("\0");
}

/** The caller supplies a dedicated connection and its authenticated tenant context. */
export function makeDebitRoute(transaction: typeof debit) {
  return async function postDebit(request: Request, { db, auth }: { db: Session; auth: Auth }): Promise<Response> {
    if (request.method !== "POST") {
      return Response.json({ error: "Use POST" }, { status: 405, headers: { Allow: "POST" } });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError) return Response.json({ error: "Invalid JSON" }, { status: 400 });
      throw error;
    }
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).some(key => !["accountId", "requestId", "amountCents"].includes(key))) {
      return Response.json({ error: "Supply accountId, requestId and amountCents only" }, { status: 400 });
    }
    const { accountId, requestId, amountCents } = body as Record<string, unknown>;
    if (!validId(accountId) || !validId(requestId)) {
      return Response.json({ error: "accountId and requestId must be nonempty text" }, { status: 400 });
    }
    if (typeof amountCents !== "string" || !/^[1-9][0-9]{0,18}$/.test(amountCents) ||
        BigInt(amountCents) > 9_223_372_036_854_775_807n) {
      return Response.json({ error: "amountCents must be a positive int64 decimal string" }, { status: 400 });
    }
    const status = await transaction(db, auth, { accountId, requestId, amountCents: BigInt(amountCents) });
    return Response.json({ status }, { status: status === "declined" ? 409 : 200 });
  };
}

export const postDebit = makeDebitRoute(debit);
