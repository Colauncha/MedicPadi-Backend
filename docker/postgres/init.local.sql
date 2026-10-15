SELECT 'CREATE DATABASE medicpadi_user' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'medicpadi_user')\gexec
SELECT 'CREATE DATABASE medicpadi_profile' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'medicpadi_profile')\gexec
SELECT 'CREATE DATABASE medicpadi_notif' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'medicpadi_notif')\gexec
SELECT 'CREATE DATABASE medicpadi_service' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'medicpadi_service')\gexec
SELECT 'CREATE DATABASE medicpadi_orders' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'medicpadi_orders')\gexec
SELECT 'CREATE DATABASE medicpadi_ehr' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'medicpadi_ehr')\gexec
SELECT 'CREATE DATABASE medicpadi_transactions' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'medicpadi_transactions')\gexec