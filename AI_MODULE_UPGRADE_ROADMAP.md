# AI Module Upgrade Roadmap

This roadmap details the step-by-step AI implementation for each existing module in the Nobal Casting ERP.

## Phase 1: Sales Intelligence (Weeks 1-3)
**Module: Sales Dashboard**
1. **Lead Scoring Engine**: Use historical data to predict lead conversion probability.
2. **RFQ Analysis**: Extract key requirements (material, grade, quantity, delivery) from uploaded RFQ documents using OCR.
3. **Auto-Quotation Draft**: Generate initial quotation prices based on material costs, historical margins, and customer risk scores.
4. **Sales Forecasting**: Predict monthly sales volume for production planning.

## Phase 2: Design Engineering AI (Weeks 4-7)
**Module: Design Engineering Dashboard**
1. **Drawing Intelligence**: Implement OCR/Vision models to analyze PDF/DXF drawings.
2. **Material & Dimension Extraction**: Automatically identify technical specifications from drawings.
3. **AI BOM Generator**: Create initial Bill of Materials (BOM) structure directly from extracted drawing data.
4. **Similar Drawing Search**: Use Qdrant vector search to find existing parts with similar geometry to reuse BOMs/Routings.

## Phase 3: Procurement & Inventory AI (Weeks 8-10)
**Module: Procurement & Inventory Dashboards**
1. **Demand Forecasting**: Predict raw material requirements based on confirmed sales orders and market trends.
2. **Stock Optimization**: AI-driven reorder suggestions to minimize dead stock and avoid stockouts.
3. **Vendor Recommendation**: Rank vendors based on price, quality index, and lead time performance.
4. **Price Trend Analysis**: Predict material price fluctuations to optimize purchasing time.

## Phase 4: Production & Quality AI (Weeks 11-14)
**Module: Production & Quality Dashboards**
1. **Production Scheduling**: AI-based optimization of job card sequencing to maximize workstation utilization (OEE).
2. **Delay Prediction**: Identify bottlenecks and predict job card delays before they happen.
3. **Quality Defect Analysis**: Root cause analysis of rejections based on production parameters (temperature, pressure, etc.).
4. **Inspection Assistant**: AI-powered check-list generation for in-process inspection.

## Phase 5: Maintenance & IoT Intelligence (Weeks 15-17)
**Module: Maintenance Dashboard**
1. **Predictive Maintenance**: Failure prediction for furnaces, CNC machines, and compressors using IoT telemetry.
2. **Machine Health Scoring**: Real-time health index calculation.
3. **Tool Life Prediction**: Track tool usage and predict replacement cycles.

## Phase 6: Accounts & Financial AI (Weeks 18-20)
**Module: Accounts Dashboard**
1. **Margin Analysis**: Real-time profitability tracking per project/sales order.
2. **Cost Prediction**: Estimate project costs during the quotation phase.
3. **Cash Flow Forecasting**: Predict receivables and payables timing.

---

## Current Status
- [x] Enterprise AI Architecture Defined
- [x] Database Schema Designed
- [x] AI Microservices Initialized (Python/FastAPI)
- [ ] **Phase 1: Sales Intelligence (Next Step)**
