import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://ai_user:ai_password@localhost:5432/nobal_ai_iot")
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
    QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
    MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
    MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    ERP_API_URL = os.getenv("ERP_API_URL", "http://localhost:5000")

settings = Config()
