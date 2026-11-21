---
author: rorz
summary: Why do all LLMs seem to talk about non-negative balances when asked to explain formal verification?
---
# LLMs are obsessed with non-negative balances?

Something interesting about asking LLMs to explain _what formal verification is_ to me: They always use the example of "a bank" or "a store" where either one customer tries to make a transaction twice -- or two customers attempt to deplete a finite resource (a balance) simultaneously.

I think this is:

a) There is some strong stuff in the training data.[^1]

b) This is a nascent field, really.[^2]

[^1]: Crypto + blockchain contracts I guess?

[^2]: I know it's been going for a long time, but I mean in terms of how much _mindshare_ (especially amongst developers it has).
