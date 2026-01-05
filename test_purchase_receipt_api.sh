#!/bin/bash

# Test creating Purchase Receipt from Production Material Request with purchase purpose
# This should FAIL because Production requests must use material_issue

curl -X POST http://localhost:5001/api/purchase-receipts/from-material-request \
  -H "Content-Type: application/json" \
  -d '{
    "mr_id": "MR-1767614641317",
    "items": [
      {
        "item_code": "FG-ALUMINUMBOTTLE500ML",
        "item_name": "Aluminium Bottle 500ML",
        "qty": 100,
        "uom": "pcs"
      }
    ],
    "department": "Production",
    "purpose": "purchase"
  }'
