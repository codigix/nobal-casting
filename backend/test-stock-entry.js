#!/usr/bin/env node
import axios from 'axios'

const API_BASE = process.env.API_URL || 'http://localhost:3000'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(color, ...args) {
  console.log(`${color}${args.join(' ')}${colors.reset}`)
}

function success(msg) { log(colors.green, '✓', msg) }
function error(msg) { log(colors.red, '✗', msg) }
function info(msg) { log(colors.blue, 'ℹ', msg) }
function section(msg) { log(colors.cyan, '\n=== ' + msg + ' ===\n') }

let testsPassed = 0
let testsFailed = 0

async function test(name, fn) {
  try {
    await fn()
    success(name)
    testsPassed++
  } catch (err) {
    error(name)
    console.log(`  ${colors.red}${err.message}${colors.reset}`)
    testsFailed++
  }
}

const client = axios.create({
  baseURL: API_BASE,
  validateStatus: () => true
})

let testData = {
  warehouseId: null,
  itemCode: null,
  grnId: null,
  createdStockEntryId: null
}

async function getWarehouses() {
  const res = await client.get('/api/stock/warehouses')
  if (res.status !== 200 || !res.data.data || res.data.data.length === 0) {
    throw new Error('No warehouses found in system. Please create a warehouse first.')
  }
  return res.data.data[0]
}

async function getItems() {
  const res = await client.get('/api/items?limit=10')
  if (res.status !== 200 || !res.data.data || res.data.data.length === 0) {
    throw new Error('No items found in system. Please create an item first.')
  }
  return res.data.data[0]
}

async function getApprovedGRNs() {
  const res = await client.get('/api/grn-requests?status=approved')
  if (res.status !== 200 || !res.data.data || res.data.data.length === 0) {
    return null
  }
  return res.data.data[0]
}

async function runTests() {
  section('STOCK ENTRY CREATION TEST SUITE')

  section('1. SETUP & DATA VERIFICATION')

  await test('API server is reachable', async () => {
    const res = await client.get('/api/items?limit=1')
    if (res.status !== 200) {
      throw new Error(`API returned status ${res.status}`)
    }
  })

  await test('Load warehouse data', async () => {
    const warehouse = await getWarehouses()
    testData.warehouseId = warehouse.id
    info(`Using warehouse: ${warehouse.warehouse_name} (ID: ${warehouse.id})`)
  })

  await test('Load item data', async () => {
    const item = await getItems()
    testData.itemCode = item.item_code
    info(`Using item: ${item.item_code} - ${item.name}`)
  })

  await test('Load GRN data (optional)', async () => {
    const grn = await getApprovedGRNs()
    if (grn) {
      testData.grnId = grn.id
      info(`Using GRN: ${grn.grn_no}`)
    } else {
      info('No approved GRNs found - will test manual entry only')
    }
  })

  section('2. API ENDPOINT TESTS')

  await test('GET /api/stock/entries - List stock entries', async () => {
    const res = await client.get('/api/stock/entries')
    if (res.status !== 200) {
      throw new Error(`Expected status 200, got ${res.status}`)
    }
    if (!Array.isArray(res.data.data)) {
      throw new Error('Response data is not an array')
    }
    info(`Found ${res.data.data.length} existing stock entries`)
  })

  section('3. STOCK ENTRY CREATION TESTS')

  await test('POST /api/stock/entries - Create manual stock entry', async () => {
    const payload = {
      entry_date: new Date().toISOString().split('T')[0],
      entry_type: 'Material Receipt',
      to_warehouse_id: testData.warehouseId,
      purpose: 'Test Manual Entry',
      remarks: 'Automated test entry',
      items: [
        {
          item_code: testData.itemCode,
          qty: 5,
          valuation_rate: 100,
          uom: 'Kg'
        }
      ]
    }

    const res = await client.post('/api/stock/entries', payload)
    if (res.status !== 201) {
      throw new Error(`Expected status 201, got ${res.status}. Response: ${JSON.stringify(res.data)}`)
    }
    if (!res.data.success) {
      throw new Error(`API returned success: false. Error: ${res.data.error}`)
    }
    if (!res.data.data || !res.data.data.id) {
      throw new Error('No stock entry ID in response')
    }

    testData.createdStockEntryId = res.data.data.id
    info(`Created stock entry: ${res.data.data.entry_no} (ID: ${res.data.data.id})`)
    info(`Status: ${res.data.data.status}`)
  })

  if (testData.grnId) {
    await test('POST /api/stock/entries - Create stock entry from GRN', async () => {
      const grn = await getApprovedGRNs()
      if (!grn || !grn.items || grn.items.length === 0) {
        throw new Error('GRN has no items')
      }

      const payload = {
        entry_date: new Date().toISOString().split('T')[0],
        entry_type: 'Material Receipt',
        to_warehouse_id: testData.warehouseId,
        purpose: `GRN: ${grn.grn_no}`,
        reference_doctype: 'GRN',
        reference_name: grn.grn_no,
        remarks: 'Test GRN entry',
        items: grn.items.map(item => ({
          item_code: item.item_code,
          qty: Number(item.received_qty) || Number(item.accepted_qty) || 0,
          valuation_rate: Number(item.valuation_rate) || 0,
          uom: 'Kg',
          batch_no: item.batch_no || null
        }))
      }

      const res = await client.post('/api/stock/entries', payload)
      if (res.status !== 201) {
        throw new Error(`Expected status 201, got ${res.status}. Response: ${JSON.stringify(res.data)}`)
      }
      if (!res.data.success) {
        throw new Error(`API returned success: false. Error: ${res.data.error}`)
      }

      info(`Created GRN-based stock entry: ${res.data.data.entry_no}`)
    })
  }

  section('4. RETRIEVAL & VERIFICATION TESTS')

  if (testData.createdStockEntryId) {
    await test('GET /api/stock/entries/:id - Retrieve created entry', async () => {
      const res = await client.get(`/api/stock/entries/${testData.createdStockEntryId}`)
      if (res.status !== 200) {
        throw new Error(`Expected status 200, got ${res.status}`)
      }
      if (!res.data.data) {
        throw new Error('No data in response')
      }
      if (!res.data.data.items || res.data.data.items.length === 0) {
        throw new Error('Stock entry has no items')
      }

      const entry = res.data.data
      info(`Entry: ${entry.entry_no} | Type: ${entry.entry_type} | Status: ${entry.status}`)
      info(`Items: ${entry.items.length} | Total Qty: ${entry.total_qty} | Total Value: ${entry.total_value}`)
    })

    await test('Verify stock entry item details', async () => {
      const res = await client.get(`/api/stock/entries/${testData.createdStockEntryId}`)
      if (res.status !== 200) {
        throw new Error(`Expected status 200, got ${res.status}`)
      }

      const entry = res.data.data
      const item = entry.items[0]

      if (!item.item_code) {
        throw new Error('Item code missing from stock entry item')
      }
      if (item.qty === undefined || item.qty === null) {
        throw new Error('Quantity missing from stock entry item')
      }
      if (item.valuation_rate === undefined || item.valuation_rate === null) {
        throw new Error('Valuation rate missing from stock entry item')
      }

      info(`Item: ${item.item_code} | Qty: ${item.qty} ${item.uom} | Rate: ${item.valuation_rate}`)
    })
  }

  section('5. DATABASE SCHEMA COMPATIBILITY TESTS')

  await test('Verify item_code column support in backend', async () => {
    const res = await client.get('/api/stock/entries')
    if (res.status !== 200) {
      throw new Error(`API returned status ${res.status}`)
    }

    if (res.data.data.length > 0) {
      const entry = res.data.data[0]
      if (entry.items && entry.items.length > 0) {
        const item = entry.items[0]
        if (!item.item_code) {
          throw new Error('Backend not returning item_code - possible schema mismatch')
        }
      }
    }
    info('Backend properly handles item_code column')
  })

  section('6. STOCK BALANCE VERIFICATION TESTS')

  await test('Check stock balance after entry creation', async () => {
    if (!testData.createdStockEntryId) {
      throw new Error('No stock entry to verify')
    }

    const res = await client.get('/api/stock/balance')
    if (res.status !== 200) {
      throw new Error(`Expected status 200, got ${res.status}`)
    }

    if (!Array.isArray(res.data.data)) {
      throw new Error('Response data is not an array')
    }

    info(`Stock balance records: ${res.data.data.length}`)
  })

  section('7. ERROR HANDLING TESTS')

  await test('Handle missing required fields', async () => {
    const payload = {
      entry_date: new Date().toISOString().split('T')[0],
      items: []
    }

    const res = await client.post('/api/stock/entries', payload)
    if (res.status === 200) {
      throw new Error('API should reject request with empty items')
    }
    if (!res.data.error) {
      throw new Error('API should return error message')
    }
    info(`Correctly rejected: ${res.data.error}`)
  })

  await test('Handle missing warehouse for Material Receipt', async () => {
    const payload = {
      entry_date: new Date().toISOString().split('T')[0],
      entry_type: 'Material Receipt',
      purpose: 'Test',
      items: [
        {
          item_code: testData.itemCode,
          qty: 5,
          valuation_rate: 100
        }
      ]
    }

    const res = await client.post('/api/stock/entries', payload)
    if (res.status === 201) {
      throw new Error('API should reject Material Receipt without to_warehouse_id')
    }
    info(`Correctly rejected: ${res.data.error}`)
  })

  await test('Handle invalid item code', async () => {
    const payload = {
      entry_date: new Date().toISOString().split('T')[0],
      entry_type: 'Material Receipt',
      to_warehouse_id: testData.warehouseId,
      items: [
        {
          item_code: 'INVALID-CODE-12345',
          qty: 5,
          valuation_rate: 100
        }
      ]
    }

    const res = await client.post('/api/stock/entries', payload)
    if (res.status === 201) {
      throw new Error('API should reject invalid item code')
    }
    if (!res.data.error) {
      throw new Error('API should return error message')
    }
    info(`Correctly rejected: ${res.data.error}`)
  })

  section('TEST SUMMARY')

  const total = testsPassed + testsFailed
  const percentage = total > 0 ? Math.round((testsPassed / total) * 100) : 0

  console.log(`\nTotal Tests: ${total}`)
  console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`)
  console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`)
  console.log(`Success Rate: ${percentage}%\n`)

  if (testsFailed === 0) {
    log(colors.green, '✓ ALL TESTS PASSED!')
    process.exit(0)
  } else {
    log(colors.red, '✗ SOME TESTS FAILED')
    process.exit(1)
  }
}

runTests().catch(err => {
  error('Fatal error running tests:')
  console.error(err)
  process.exit(1)
})
