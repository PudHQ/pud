datatype QueryResult = QueryResult(after: State, rowCount: nat)

// INSERT ... ON CONFLICT DO NOTHING RETURNING on the receipt primary key.
function InsertReceipt(s: State, key: ReceiptKey): QueryResult {
  if key in s.receipts then QueryResult(s, 0)
  else QueryResult(State(s.accounts, s.receipts + {key}), 1)
}
