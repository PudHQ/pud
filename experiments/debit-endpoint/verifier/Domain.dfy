datatype AccountKey = AccountKey(tenant: string, account: string)
datatype ReceiptKey = ReceiptKey(tenant: string, requestId: string)
datatype Request = Request(tenant: string, account: string, requestId: string, amount: int)
datatype State = State(accounts: map<AccountKey, int>, receipts: set<ReceiptKey>)
datatype Outcome = Outcome(status: string, isText: bool, after: State, closed: bool)

// PostgreSQL bigint columns hold signed 64-bit values. The schema forbids negative balances.
predicate ValidState(s: State) {
  forall k | k in s.accounts :: 0 <= s.accounts[k] <= 9223372036854775807
}

predicate ValidRequest(q: Request) {
  0 < q.amount <= 9223372036854775807
}
