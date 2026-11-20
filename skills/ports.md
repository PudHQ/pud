# Local ports

Give each local service a unique `49XX` port (`4900`–`4999`).
The web app (`apps/www`) uses `4901`.
Reuse a service already running on its assigned port.
If another process owns the port, report the conflict.
