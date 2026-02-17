-- ==============================================================================
-- URN DATABASE — Esquema de la Urna Electoral
-- ==============================================================================
-- Esta base de datos SOLO contiene votos anónimos. NUNCA identidades.

CREATE TABLE IF NOT EXISTS used_tokens (
    token_hash VARCHAR(64) PRIMARY KEY,  -- Hash del token (no el token completo)
    burned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS votes (
    id SERIAL PRIMARY KEY,
    hash_recibo VARCHAR(64) NOT NULL UNIQUE,
    eleccion VARCHAR(255) NOT NULL,
    token_fingerprint VARCHAR(16),  -- Huella parcial del token
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_blocks (
    block_hash VARCHAR(64) PRIMARY KEY,
    key_id VARCHAR(255),
    previous_hash VARCHAR(64),
    payload_hash VARCHAR(64),
    signature TEXT,
    action VARCHAR(50),
    timestamp BIGINT,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_votes_recibo ON votes(hash_recibo);
CREATE INDEX IF NOT EXISTS idx_votes_eleccion ON votes(eleccion);
CREATE INDEX IF NOT EXISTS idx_audit_keyid ON audit_blocks(key_id);
