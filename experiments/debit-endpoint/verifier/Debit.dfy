// ClaimKey, Matches and UpdatedBalance are generated from the SQL and its bound parameters.
function MatchingRows(s: State, q: Request): set<AccountKey> {
  set k | k in s.accounts && Matches(k, s.accounts[k], q)
}

function Execute(s: State, q: Request): Outcome {
  var claim := ClaimKey(q);
  if claim in s.receipts then Outcome(Duplicate, s)
  else if MatchingRows(s, q) == {} then Outcome(Declined, s)
  else
    var balances := map k | k in s.accounts ::
      if k in MatchingRows(s, q) then UpdatedBalance(k, s.accounts[k], q) else s.accounts[k];
    Outcome(Applied, State(balances, s.receipts + {claim}))
}

// Contract vocabulary reads the authenticated tenant and request, independently of SQL bindings.
predicate Funded(s: State, q: Request) {
  var k := AccountKey(q.tenant, q.account);
  k in s.accounts && s.accounts[k] >= q.amount
}

predicate DebitedOnly(s: State, q: Request, o: Outcome) {
  var k := AccountKey(q.tenant, q.account);
  k in s.accounts && o.after.accounts == s.accounts[k := s.accounts[k] - q.amount]
}
