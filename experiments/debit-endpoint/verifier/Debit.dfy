// Contract vocabulary reads the authenticated tenant and request, independently of SQL bindings.
predicate Funded(s: State, q: Request) {
  var k := AccountKey(q.tenant, q.account);
  k in s.accounts && s.accounts[k] >= q.amount
}

predicate DebitedOnly(s: State, q: Request, o: Outcome) {
  var k := AccountKey(q.tenant, q.account);
  k in s.accounts && o.after.accounts == s.accounts[k := s.accounts[k] - q.amount]
}
