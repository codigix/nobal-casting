# Python AI Services Folder Structure

The AI microservices are built using **FastAPI** and organized for modularity and scalability.

## Root Directory: `ai_services/`

```text
ai_services/
├── common/                     # Shared utilities across all services
│   ├── database/
│   │   ├── postgres.py         # SQLAlchemy/Tortoise connection
│   │   ├── qdrant_client.py    # Vector DB client
│   │   └── redis_cache.py      # Redis client
│   ├── models/
│   │   └── base.py             # Shared Pydantic models
│   ├── utils/
│   │   ├── auth.py             # JWT validation
│   │   ├── logger.py           # Unified logging
│   │   └── openai_client.py    # OpenAI wrapper
│   └── config.py               # Shared environment variables
│
├── drawing_intelligence/       # OCR & CAD Processing
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints.py
│   │   │       └── router.py
│   │   ├── core/               # Business logic
│   │   │   ├── ocr_engine.py
│   │   │   ├── cad_parser.py
│   │   │   └── feature_extractor.py
│   │   ├── schemas/            # Request/Response validation
│   │   └── db/                 # Drawing specific DB operations
│   ├── main.py                 # FastAPI entry point
│   └── requirements.txt
│
├── erp_copilot/                # AI Global Assistant
│   ├── app/
│   │   ├── agents/             # LangChain Agents
│   │   │   ├── tool_calling.py
│   │   │   └── erp_agent.py
│   │   ├── chains/             # RAG Chains
│   │   │   ├── doc_retrieval.py
│   │   │   └── query_refiner.py
│   │   ├── services/
│   │   │   └── erp_connector.py # Connects to Node.js APIs for actions
│   ├── main.py
│   └── requirements.txt
│
├── predictive_analytics/       # Forecasting & Anomaly Detection
│   ├── app/
│   │   ├── models/             # ML Models (Prophet, Scikit-learn)
│   │   │   ├── sales_forecast.py
│   │   │   └── stock_prediction.py
│   │   ├── tasks/              # Celery background tasks
│   │   │   └── training.py
│   ├── main.py
│   └── requirements.txt
│
├── iot_gateway/                # MQTT & OPC-UA Ingestion
│   ├── app/
│   │   ├── subscribers/        # MQTT Subscribers
│   │   │   └── machine_data.py
│   │   ├── processors/         # Stream processing
│   │   │   └── oee_calculator.py
│   ├── main.py
│   └── requirements.txt
│
└── docker-compose.yml          # Local development orchestration
```

### Key Principles
1. **Separation of Concerns**: Business logic is separated from API routes.
2. **Standardization**: All services use the `common/` package for shared resources.
3. **Async First**: FastAPI is used in asynchronous mode for high performance.
4. **Validation**: Pydantic models ensure strict data integrity.
