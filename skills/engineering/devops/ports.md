---
name: ports
description: Assign and reuse local service ports when working on Pud’s apps or adding a service.
---
# Local ports

Give each local service a unique `49XX` port (`4900`–`4999`).
The web app (`apps/www`) uses `4901`.
PudDex (`apps/dex`) uses `4902`.
Reuse a service already running on its assigned port.
If another process owns the port, report the conflict.
