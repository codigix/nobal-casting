import json
import asyncio
from paho.mqtt import client as mqtt_client
from common.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MQTT_TOPIC = "nobal/+/telemetry/+"  # machine_id / parameter

class IoTGateway:
    def __init__(self):
        self.client = mqtt_client.Client(mqtt_client.CallbackAPIVersion.VERSION2)
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message

    def on_connect(self, client, userdata, flags, rc, properties):
        if rc == 0:
            logger.info("Connected to MQTT Broker!")
            client.subscribe(MQTT_TOPIC)
        else:
            logger.error(f"Failed to connect, return code {rc}")

    def on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode())
            topic_parts = msg.topic.split('/')
            machine_id = topic_parts[1]
            parameter = topic_parts[3]
            
            logger.info(f"Received telemetry: Machine {machine_id}, Param {parameter}, Value {payload.get('value')}")
            
            # TODO: Store in Redis for real-time and PostgreSQL for historical
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")

    async def start(self):
        self.client.connect(settings.MQTT_BROKER, settings.MQTT_PORT)
        self.client.loop_start()
        try:
            while True:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            self.client.loop_stop()

if __name__ == "__main__":
    gateway = IoTGateway()
    asyncio.run(gateway.start())
