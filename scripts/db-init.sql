-- Database initialization for local development
-- This runs once when the container is first created

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable full text search (built-in, but explicit for clarity)
-- CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for LIKE search optimization

-- Create test database (for running tests separately from dev)
CREATE DATABASE cresyn_pulse_test;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE cresyn_pulse_dev TO postgres;
GRANT ALL PRIVILEGES ON DATABASE cresyn_pulse_test TO postgres;
