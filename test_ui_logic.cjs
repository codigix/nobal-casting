const axios = require('axios');
async function run() {
    try {
        // We can't easily call the API without auth, so let's just query the DB and simulate the controller enrichment
        const mysql = require('mysql2/promise');
        const c = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'nobalcasting_user',
            password: 'C0digix$309',
            database: 'nobalcasting',
            port: 3307
        });
        
        const jcId = 'JC - 2 - WO-SA-1776157886595-1';
        const [rows] = await c.query(`
            SELECT 
              jc.*, 
              (SELECT COALESCE(SUM(dispatch_quantity), 0) FROM outward_challan WHERE job_card_id = jc.job_card_id) as total_dispatched
            FROM job_card jc 
            WHERE jc.job_card_id = ?
        `, [jcId]);
        
        const jc = rows[0];
        console.log('DB Row:', JSON.stringify(jc, null, 2));

        // Now simulate _getMaxAllowedQuantity
        // ... (using the actual code logic)
        
        const plannedQuantity = parseFloat(jc.planned_quantity) || 0;
        const inputQty = parseFloat(jc.input_qty) || 0;
        
        console.log('Planned Qty:', plannedQuantity);
        console.log('Input Qty:', inputQty);
        console.log('Op Seq:', jc.operation_sequence);

        let maxAllowed = 0;
        if (inputQty > 0 || jc.operation_sequence > 1) {
            const effectivePlanned = plannedQuantity > 0 ? plannedQuantity : inputQty;
            maxAllowed = Math.min(effectivePlanned, inputQty);
        }
        
        console.log('Calculated maxAllowed:', maxAllowed);
        
        // Frontend disabled check
        const total_dispatched = parseFloat(jc.total_dispatched || 0);
        const isDisabled = jc.status === 'completed' || 
                           (plannedQuantity > 0 && total_dispatched >= plannedQuantity) ||
                           maxAllowed <= 0;
        
        console.log('Is Disabled in UI?:', isDisabled);
        console.log('Reason if disabled:');
        if (jc.status === 'completed') console.log('- Status is completed');
        if (plannedQuantity > 0 && total_dispatched >= plannedQuantity) console.log(`- Dispatched (${total_dispatched}) >= Planned (${plannedQuantity})`);
        if (maxAllowed <= 0) console.log(`- maxAllowed (${maxAllowed}) <= 0`);

        await c.end();
    } catch (e) {
        console.error(e);
    }
}
run();
