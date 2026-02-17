-- ==============================================================================
-- CENSUS DATABASE — Esquema de Identidad Electoral
-- ==============================================================================
-- Esta base de datos SOLO contiene identidades. NUNCA votos.

CREATE TABLE IF NOT EXISTS public_keys (
    key_id VARCHAR(255) PRIMARY KEY,
    voter_identifier VARCHAR(255) NOT NULL,
    public_key_jwk JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ballot_registry (
    voter_id VARCHAR(255) PRIMARY KEY,
    ballot_issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_hash VARCHAR(64)  -- Hash de la IP, no la IP real
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_public_keys_status ON public_keys(status);
CREATE INDEX IF NOT EXISTS idx_ballot_voter ON ballot_registry(voter_id);
