# IoT Architecture for Real-Time Machine Monitoring

## 1. Physical Layer (Data Sources)
- **CNC Machines**: Fanuc/Siemens controllers via MTConnect or OPC-UA.
- **Furnaces**: Thermocouples connected to ESP32/Arduino via MQTT.
- **Compressors & Pumps**: Vibration and power sensors.
- **PLCs**: Industrial logic controllers via Modbus TCP.

## 2. Connectivity & Ingestion
- **Protocol**: MQTT (Mosquitto Broker) for lightweight, real-time messaging.
- **QoS Level 1**: Ensuring data delivery even with intermittent connectivity.
- **Topics Structure**:
  ```text
  nobal/factory_1/machine_id/telemetry/temperature
  nobal/factory_1/machine_id/telemetry/vibration
  nobal/factory_1/machine_id/status/heartbeat
  ```

## 3. IoT Gateway (Python Microservice)
- **Library**: `paho-mqtt` for subscription.
- **Task**:
  - Subscribe to all telemetry topics.
  - Basic cleaning and normalization of data.
  - Forward raw data to **Redis** (for real-time dashboard) and **PostgreSQL** (for historical analysis).
  - Trigger alerts if parameters exceed safety thresholds.

## 4. Real-Time Processing (OEE Calculation)
**Overall Equipment Effectiveness (OEE) = Availability × Performance × Quality**

1. **Availability**: Track `RunTime` vs `PlannedTime` from machine heartbeats.
2. **Performance**: Compare actual `CycleTime` from sensors vs `IdealCycleTime` from BOM Routing.
3. **Quality**: Capture reject signals from inspection sensors.

## 5. Storage Strategy
- **Real-Time Data**: Stored in **Redis** with TTL (Time To Live) for live dashboarding.
- **Historical Data**: Stored in **PostgreSQL** (with TimescaleDB extension for optimized time-series queries).
- **Aggregated Data**: Hourly/Daily summaries stored in `machine_performance_summary` table.

## 6. Predictive Maintenance Integration
- IoT data is fed into the **AI Maintenance Service**.
- Algorithms (like Random Forest or LSTM) analyze vibration and temperature patterns to predict failure probability.
- Automated Work Orders are generated when the **Machine Health Score** drops below 60%.

## 7. Security
- **MQTT Authentication**: SSL/TLS encryption for all machine communication.
- **Device Provisioning**: Unique certificates for each IoT Gateway/Device.
- **Network Isolation**: IoT devices should reside on a separate VLAN from the ERP backend.
