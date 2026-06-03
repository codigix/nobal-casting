# AI-Powered Manufacturing ERP Upgrade Plan

## 1. System Architecture Overview

The upgraded system will follow a **Microservice Architecture** to ensure scalability, maintainability, and specialized processing for AI and IoT.

### High-Level Architecture
- **Web Frontend (React.js)**: Unified interface for all modules and AI Copilot.
- **ERP Backend (Node.js/Express.js)**: Primary business logic, database management (PostgreSQL), and orchestration.
- **AI Microservices (Python/FastAPI)**: Specialized services for heavy computations, LLM integration, and predictive analytics.
- **IoT Layer (Python/MQTT)**: Real-time data ingestion from machines and sensors.
- **Vector Database (Qdrant)**: High-speed semantic search for drawings, CAD files, and technical documentation.
- **Cache & Message Broker (Redis/Celery)**: Asynchronous task processing and real-time alerts.

---

## 2. Microservice Architecture

### Node.js ERP Core (Primary)
- **Role**: Handles standard ERP operations (Sales, Production, Inventory, Finance).
- **Communication**: REST APIs and WebSockets for real-time updates.
- **Responsibility**: Security, Auth, Data Persistence, Business Workflow.

### Python AI Services
1. **Drawing Intelligence Service**:
   - OCR for technical drawings.
   - Dimension and material extraction.
   - BOM/Routing auto-generation.
2. **ERP Copilot Service**:
   - RAG (Retrieval-Augmented Generation) over ERP data.
   - Natural language query processing.
   - Automated report drafting.
3. **Analytics Intelligence Service**:
   - Forecasting (Sales, Inventory, Material).
   - Anomaly detection in production.
   - Vendor risk scoring.
4. **Maintenance Intelligence Service**:
   - Predictive maintenance based on IoT data.
   - Tool life prediction.

---

## 3. Database Design

### Primary Database (PostgreSQL)
Expanded schema to include:
- `ai_logs`: Monitor AI token usage and performance.
- `iot_telemetry`: Raw and aggregated sensor data.
- `drawing_metadata`: Extracted features from CAD/Drawing files.
- `predictions`: Stored forecasting results for various modules.

### Vector Database (Qdrant)
- **Collection: `technical_drawings`**: Store embeddings of drawings for similarity search.
- **Collection: `bom_history`**: Store BOM structures for pattern matching.
- **Collection: `erp_docs`**: Store manuals and standard operating procedures (SOPs).

---

## 4. IoT Architecture

### Ingestion Flow
1. **Edge Devices**: PLC, ESP32, CNC controllers.
2. **Protocol**: MQTT / OPC-UA.
3. **IoT Gateway**: Python-based MQTT subscriber.
4. **Processing**: Stream processing for real-time OEE calculation.
5. **Storage**: Time-series data in PostgreSQL (TimescaleDB extension recommended).

### Key Metrics Collected
- Temperature, Pressure, Vibration, Power Consumption, Runtime, Downtime.

---

## 5. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Migrate database to PostgreSQL (if necessary).
- [ ] Setup Qdrant and Redis infrastructure.
- [ ] Setup Python FastAPI base microservice.

### Phase 2: Drawing Intelligence (Weeks 3-5)
- [ ] Implement OCR and dimension extraction.
- [ ] Integrate Qdrant for similarity search.
- [ ] Automated BOM generation from drawings.

### Phase 3: ERP Copilot & RAG (Weeks 6-8)
- [ ] Develop Natural Language Query engine.
- [ ] Integrate OpenAI with LangChain.
- [ ] Build Copilot UI component.

### Phase 4: IoT & Analytics (Weeks 9-12)
- [ ] Setup MQTT broker and IoT Gateway.
- [ ] Implement OEE and Predictive Maintenance logic.
- [ ] Build real-time monitoring dashboards.

---

## 6. Folder Structure

### Backend (Node.js)
```text
backend/
├── src/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   │   ├── aiIntegration.js  # Communication with Python services
│   │   └── iotService.js      # IoT data management
│   └── app.js
```

### AI Services (Python)
```text
ai_services/
├── drawing_intelligence/
│   ├── main.py
│   ├── processors/
│   └── models/
├── erp_copilot/
│   ├── main.py
│   ├── chains/
│   └── vectordb/
└── common/
```

---

## 7. Deployment Strategy (Docker & K8s)

- **Dockerization**: Each service (Node, FastAPI, Qdrant, Redis) containerized.
- **Orchestration**: Kubernetes (EKS/GKE) for high availability.
- **CI/CD**: GitHub Actions for automated testing and deployment.

---

## 8. Production Ready Recommendations

1. **Security**: Use API Gateways (Kong/Nginx) with JWT.
2. **Monitoring**: Prometheus and Grafana for system health and IoT metrics.
3. **Data Integrity**: Implement strict validation for AI-generated BOMs.
4. **Scalability**: Horizontal Pod Autoscaling (HPA) for AI services.
