CREATE TABLE accounts (
  tenant_id text NOT NULL,
  account_id text NOT NULL,
  balance bigint NOT NULL CHECK (balance >= 0),
  PRIMARY KEY (tenant_id, account_id)
);

CREATE TABLE debit_requests (
  tenant_id text NOT NULL,
  request_id text NOT NULL,
  PRIMARY KEY (tenant_id, request_id)
);
