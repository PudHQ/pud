/** A single dedicated PostgreSQL connection for the duration of this call. */
export interface Session {
  query(sql: string, params?: string[]): Promise<{ rows: unknown[] }>;
}

export interface Auth {
  tenantId: string;
}

export interface DebitInput {
  accountId: string;
  requestId: string;
  amountCents: bigint;
}

export const CLAIM = `
  INSERT INTO debit_requests (tenant_id, request_id) VALUES ($1, $2)
  ON CONFLICT (tenant_id, request_id) DO NOTHING
  RETURNING request_id
`;

export const DEBIT = `
  UPDATE accounts AS a SET balance = a.balance - r.amount
  FROM (VALUES ($1::text, $2::text, $3::bigint)) AS r(tenant_id, account_id, amount)
  WHERE a.tenant_id = r.tenant_id AND a.account_id = r.account_id AND a.balance >= r.amount
  RETURNING a.account_id
`;

export async function debit(
  db: Session,
  auth: Auth,
  input: DebitInput,
): Promise<"applied" | "duplicate" | "declined"> {
  const { tenantId } = auth;
  const { accountId, requestId, amountCents } = input;
  if (
    typeof amountCents !== "bigint" ||
    amountCents <= 0n ||
    amountCents > 9_223_372_036_854_775_807n
  ) {
    throw new RangeError("amountCents must be a positive PostgreSQL bigint");
  }

  await db.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  try {
    const claim = await db.query(CLAIM, [tenantId, requestId]);
    if (claim.rows.length === 0) {
      await db.query("COMMIT");
      return "duplicate";
    }

    const debit = await db.query(DEBIT, [
      tenantId,
      accountId,
      amountCents.toString(),
    ]);
    if (debit.rows.length === 0) {
      await db.query("ROLLBACK");
      return "declined";
    }

    await db.query("COMMIT");
    return "applied";
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}
