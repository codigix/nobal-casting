from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from common.config import settings
from langchain_openai import ChatOpenAI
from langchain.agents import create_openai_functions_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.tools import tool
import httpx

from agents.sales_intelligence import sales_agent, LeadScoreResponse

app = FastAPI(title="ERP AI Copilot", version="1.0.0")

class LeadData(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    company_name: Optional[str] = None
    email: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None

@app.post("/sales/score-lead", response_model=LeadScoreResponse)
async def score_lead_endpoint(lead: LeadData):
    try:
        return await sales_agent.score_lead(lead.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class QueryRequest(BaseModel):
    query: str
    user_id: Optional[int] = None

class QueryResponse(BaseModel):
    answer: str
    metadata: Optional[dict] = None

# Tools for the Agent
@tool
def get_low_stock_items():
    """Fetches a list of items that have stock levels below their reorder points."""
    # In real implementation, this calls the Node.js backend
    # response = httpx.get(f"{settings.ERP_API_URL}/stock/low-stock")
    # return response.json()
    return [
        {"item_code": "RM-AL-001", "name": "Aluminium Ingot", "qty": 15, "reorder_level": 20},
        {"item_code": "RM-CU-002", "name": "Copper Wire", "qty": 5, "reorder_level": 50}
    ]

@tool
def get_delayed_job_cards():
    """Fetches list of job cards that are past their expected completion date."""
    return [
        {"job_card_id": "JC-123", "operation": "Turning", "delay_days": 2},
        {"job_card_id": "JC-125", "operation": "Milling", "delay_days": 1}
    ]

tools = [get_low_stock_items, get_delayed_job_cards]

# LLM Setup
llm = ChatOpenAI(model="gpt-4o", api_key=settings.OPENAI_API_KEY)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are the Nobal Casting ERP AI Copilot. You help users manage manufacturing data."),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

agent = create_openai_functions_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

@app.get("/")
async def root():
    return {"message": "ERP Copilot Service is online"}

@app.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    try:
        result = await agent_executor.ainvoke({"input": request.query})
        return {"answer": result["output"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
