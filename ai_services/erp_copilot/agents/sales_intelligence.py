from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from common.config import settings

class LeadScoreResponse(BaseModel):
    score: float = Field(description="Lead score from 0 to 100")
    reasoning: str = Field(description="Brief explanation of the score")

class SalesIntelligenceAgent:
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-4o", api_key=settings.OPENAI_API_KEY)
        self.score_parser = ChatPromptTemplate.from_messages([
            ("system", """You are an expert Sales Intelligence Assistant for a Manufacturing ERP specializing in Casting and Machining.
            Analyze the following lead details and provide a conversion probability score (0-100) and reasoning.
            
            Consider:
            - Company profile and industry relevance.
            - Source of the lead.
            - Completeness of contact info.
            - Historical patterns in manufacturing sales.
            """),
            ("human", "Lead Data: {lead_data}")
        ])

    async def score_lead(self, lead_data: dict) -> LeadScoreResponse:
        chain = self.score_parser | self.llm.with_structured_output(LeadScoreResponse)
        response = await chain.ainvoke({"lead_data": str(lead_data)})
        return response

sales_agent = SalesIntelligenceAgent()
