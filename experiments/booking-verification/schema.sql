CREATE TABLE accounts (
  id text PRIMARY KEY,
  balance bigint NOT NULL CHECK (balance >= 0),
  member boolean NOT NULL
);

CREATE TABLE workshops (
  id text PRIMARY KEY,
  available bigint NOT NULL CHECK (available >= 0),
  seat_price bigint NOT NULL CHECK (seat_price >= 0),
  starts_minute bigint NOT NULL
);

CREATE TABLE bookings (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts (id),
  workshop_id text NOT NULL REFERENCES workshops (id),
  seats bigint NOT NULL CHECK (seats > 0),
  paid bigint NOT NULL CHECK (paid >= 0),
  refund bigint CHECK (refund BETWEEN 0 AND paid)
);
