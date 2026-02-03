const BASE_URL = 'http://localhost:5001/api';
const mysql = require('mysql2/promise');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidGVzdC11c2VyIiwidXNlcm5hbWUiOiJ0ZXN0LXVzZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3NzAxMTA0OTksImV4cCI6MTc3MDE5Njg5OX0.LboRCHwvhlVgwzeXRzv4kR6fBZt3bHBtzpler_JM530';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log('🚀 Starting Production Inventory Sync & Backflush Test\n');

    const db = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'erp_user',
        password: 'erp_password',
        database: 'nobalcasting',
        port: 3306
    });

    try {
        // 1. Setup Test Data
        const itemCodeRM = 'R-TEST-RM-' + Date.now();
        const itemCodeFG = 'FG-TEST-FG-' + Date.now();
        const warehouseRM = 1;
        const warehouseFG = 5;

        console.log(`1️⃣ Creating test items: ${itemCodeRM} (RM), ${itemCodeFG} (FG)`);
        
        await db.query('INSERT INTO item (item_code, name, item_group, uom, is_active) VALUES (?, ?, ?, ?, ?)', 
            [itemCodeRM, 'Test Raw Material', 'Raw Material', 'Kg', 1]);
        await db.query('INSERT INTO item (item_code, name, item_group, uom, is_active) VALUES (?, ?, ?, ?, ?)', 
            [itemCodeFG, 'Test Finished Good', 'Finished Goods', 'Nos', 1]);

        console.log(`2️⃣ Adding initial stock for ${itemCodeRM}`);
        await db.query(`INSERT INTO stock_balance (item_code, warehouse_id, current_qty, available_qty, valuation_rate) 
                       VALUES (?, ?, 1000, 1000, 50)`, [itemCodeRM, warehouseRM]);

        console.log(`3️⃣ Creating BOM for ${itemCodeFG}`);
        const bomId = 'BOM-TEST-' + Date.now();
        await db.query('INSERT INTO bom (bom_id, item_code, quantity, status, is_active) VALUES (?, ?, 1, "active", 1)', 
            [bomId, itemCodeFG, 1]);
        await db.query('INSERT INTO bom_line (bom_id, component_code, quantity, uom) VALUES (?, ?, 2, "Kg")', 
            [bomId, itemCodeRM, 2]);
        
        // Add operation to BOM so job cards can be generated
        await db.query('INSERT INTO bom_operation (bom_id, operation_name, workstation_type, hour_rate, time_in_minutes, sequence) VALUES (?, ?, ?, ?, ?, ?)',
            [bomId, 'Test Operation', 'Test Workstation', 100, 10, 1]);

        // 4. Create Work Order via API
        console.log('\n4️⃣ Creating Work Order via API (should trigger allocation)');
        const woId = 'WO-TEST-' + Date.now();
        const woResponse = await fetch(`${BASE_URL}/production/work-orders`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({
                wo_id: woId,
                item_code: itemCodeFG,
                quantity: 10,
                bom_no: bomId,
                required_items: [
                    {
                        item_code: itemCodeRM,
                        item_name: 'Test Raw Material',
                        required_qty: 20, // 2 per unit * 10 units
                        source_warehouse: 'main', // Use warehouse name
                        uom: 'Kg'
                    }
                ]
            })
        });

        const woData = await woResponse.json();
        if (!woData.success) {
            console.log('Full response:', woData);
            throw new Error('WO Creation failed: ' + (woData.message || woData.error));
        }
        console.log(`✅ Work Order created: ${woId}`);

        // 5. Check Allocation
        console.log('\n5️⃣ Checking Material Allocation and Reserved Qty');
        const [allocs] = await db.query('SELECT * FROM material_allocation WHERE work_order_id = ?', [woId]);
        console.log(`Found ${allocs.length} allocations`);
        
        const [stockRM] = await db.query('SELECT * FROM stock_balance WHERE item_code = ? AND warehouse_id = ?', [itemCodeRM, warehouseRM]);
        console.log(`Stock for ${itemCodeRM}: Current=${stockRM[0].current_qty}, Reserved=${stockRM[0].reserved_qty}, Available=${stockRM[0].available_qty}`);

        if (parseFloat(stockRM[0].reserved_qty) !== 20) {
            console.error('❌ Reserved quantity mismatch! Expected 20, got ' + stockRM[0].reserved_qty);
        } else {
            console.log('✅ Reserved quantity correctly set to 20');
        }

        // 6. Generate and Complete Job Card
        console.log('\n6️⃣ Generating and Completing Job Card (should trigger backflush)');
        // Generate job cards
        await fetch(`${BASE_URL}/production/job-cards/${woId}/generate-all`, { 
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        
        // Get the job card
        const jcRes = await fetch(`${BASE_URL}/production/job-cards?work_order_id=${woId}`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const jcData = await jcRes.json();
        const jobCard = jcData.data[0];
        
        console.log(`Completing Job Card: ${jobCard.job_card_id}`);
        const completeRes = await fetch(`${BASE_URL}/production/job-cards/${jobCard.job_card_id}/status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({ status: 'completed' })
        });
        const completeData = await completeRes.json();
        if (!completeData.success) throw new Error('Job Card completion failed: ' + completeData.message);

        await sleep(1500); // Wait for async operations

        // 7. Verify Final Stock
        console.log('\n7️⃣ Verifying Final Stock Balances');
        
        const [stockRMFinal] = await db.query('SELECT * FROM stock_balance WHERE item_code = ? AND warehouse_id = ?', [itemCodeRM, warehouseRM]);
        console.log(`RM Stock (${itemCodeRM}): Current=${stockRMFinal[0].current_qty}, Reserved=${stockRMFinal[0].reserved_qty}`);
        
        const [stockFGFinal] = await db.query('SELECT * FROM stock_balance WHERE item_code = ? AND warehouse_id = ?', [itemCodeFG, warehouseFG]);
        console.log(`FG Stock (${itemCodeFG}): Current=${stockFGFinal[0].current_qty}`);

        if (parseFloat(stockRMFinal[0].current_qty) === 980 && parseFloat(stockRMFinal[0].reserved_qty) === 0) {
            console.log('✅ RM Stock correctly deducted and reservation cleared');
        } else {
            console.error('❌ RM Stock mismatch!');
        }

        if (parseFloat(stockFGFinal[0].current_qty) === 10) {
            console.log('✅ FG Stock correctly added');
        } else {
            console.error('❌ FG Stock mismatch!');
        }

        // 8. Check Stock Ledger
        console.log('\n8️⃣ Checking Stock Ledger entries');
        const [ledger] = await db.query('SELECT * FROM stock_ledger WHERE reference_name = ? ORDER BY transaction_date DESC', [woId]);
        console.table(ledger.map(l => ({
            item: l.item_code,
            type: l.transaction_type,
            qty_in: l.qty_in,
            qty_out: l.qty_out,
            ref: l.reference_name
        })));

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.stack) console.error(error.stack);
    } finally {
        await db.end();
        console.log('\n🏁 Test complete');
    }
}

runTest();
