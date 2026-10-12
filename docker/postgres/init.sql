-- Creates one database per service on first start of the Postgres volume.
-- Names must match DB_NAME in apps/<service>/.env.staging and .env.production.
-- Postgres has no CREATE DATABASE IF NOT EXISTS, so each statement is only
-- generated (and run by \gexec) when the database is missing.

SELECT 'CREATE DATABASE auth_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'auth_db')\gexec
SELECT 'CREATE DATABASE profile_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'profile_db')\gexec
SELECT 'CREATE DATABASE notification_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'notification_db')\gexec
SELECT 'CREATE DATABASE services_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'services_db')\gexec
SELECT 'CREATE DATABASE order_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'order_db')\gexec
SELECT 'CREATE DATABASE ehr_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ehr_db')\gexec
SELECT 'CREATE DATABASE transactions_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'transactions_db')\gexec
SELECT 'CREATE DATABASE community_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'community_db')\gexec
