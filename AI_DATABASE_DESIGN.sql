-- AI-Powered Manufacturing ERP - Database Schema Design (PostgreSQL)

-- 1. AI USAGE MONITORING
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    module_name VARCHAR(100),
    feature_name VARCHAR(100),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    cost_estimate DECIMAL(10, 6),
    status VARCHAR(20), -- 'success', 'failed'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. IOT TELEMETRY & MONITORING
CREATE TABLE IF NOT EXISTS iot_devices (
    device_id VARCHAR(50) PRIMARY KEY,
    device_name VARCHAR(100),
    device_type VARCHAR(50), -- 'PLC', 'CNC', 'Furnace', etc.
    workstation_id INTEGER REFERENCES workstations(id),
    protocol VARCHAR(20), -- 'MQTT', 'Modbus', 'OPC-UA'
    ip_address VARCHAR(45),
    status VARCHAR(20), -- 'online', 'offline'
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS iot_telemetry (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) REFERENCES iot_devices(device_id),
    parameter_name VARCHAR(50), -- 'temperature', 'vibration', 'power_consumption'
    parameter_value DECIMAL(18, 4),
    unit VARCHAR(20),
    timestamp TIMESTAMP NOT NULL,
    metadata JSONB
);

-- Index for IoT telemetry time-series queries
CREATE INDEX idx_iot_telemetry_timestamp ON iot_telemetry (timestamp DESC);
CREATE INDEX idx_iot_telemetry_device_param ON iot_telemetry (device_id, parameter_name);

-- 3. DRAWING INTELLIGENCE & OCR
CREATE TABLE IF NOT EXISTS drawing_analysis (
    id SERIAL PRIMARY KEY,
    file_path TEXT NOT NULL,
    item_code VARCHAR(50), -- Link to item if exists
    extracted_text TEXT,
    extracted_dimensions JSONB, -- List of dimensions found
    extracted_materials JSONB,
    qdrant_point_id UUID, -- Link to vector database
    status VARCHAR(20), -- 'pending', 'processing', 'completed', 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. PREDICTIONS & FORECASTING
CREATE TABLE IF NOT EXISTS ai_predictions (
    id SERIAL PRIMARY KEY,
    prediction_type VARCHAR(50), -- 'sales_forecast', 'inventory_demand', 'machine_failure'
    reference_id VARCHAR(100), -- ID of item, machine, or sales order
    predicted_value DECIMAL(18, 4),
    confidence_score DECIMAL(5, 2),
    prediction_date DATE, -- Target date for the prediction
    model_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. AI COPILOT INTERACTION
CREATE TABLE IF NOT EXISTS copilot_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(user_id),
    summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS copilot_messages (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES copilot_sessions(session_id),
    role VARCHAR(20), -- 'user', 'assistant'
    content TEXT,
    metadata JSONB, -- Related entities (SO, PO, Item IDs)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. MACHINE HEALTH SCORES (Derived from IoT)
CREATE TABLE IF NOT EXISTS machine_health_history (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER, -- Link to machines table
    health_score DECIMAL(5, 2), -- 0-100
    risk_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
    recommended_action TEXT,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. VENDOR RECOMMENDATIONS (AI Generated)
CREATE TABLE IF NOT EXISTS vendor_recommendations (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(50),
    vendor_id INTEGER,
    match_score DECIMAL(5, 2),
    reasoning TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
