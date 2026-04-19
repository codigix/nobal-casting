const mysql = require('mysql2/promise');
async function run() {
    try {
        const c = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'nobalcasting_user',
            password: 'C0digix$309',
            database: 'nobalcasting',
            port: 3307
        });
        const jcId = 'JC - 2 - WO-SA-1776157886595-1';
        
        const [jc] = await c.query('SELECT * FROM job_card WHERE job_card_id = ?', [jcId]);
        console.log('Job Card JC-2:', JSON.stringify(jc[0], null, 2));
        
        const [buffers] = await c.query('SELECT * FROM job_card_buffer WHERE job_card_id = ?', [jcId]);
        console.log('Buffers for JC-2:', JSON.stringify(buffers, null, 2));
        
        const [woItems] = await c.query('SELECT * FROM work_order_item WHERE wo_id = ?', [jc[0].work_order_id]);
        console.log('WO Items:', JSON.stringify(woItems, null, 2));

        // Simulate _getMaxAllowedQuantity logic
        const plannedQuantity = parseFloat(jc[0].planned_quantity) || 0;
        const inputQty = parseFloat(jc[0].input_qty) || 0;
        let maxAllowed = plannedQuantity;
        console.log(`Initial maxAllowed: ${maxAllowed}, inputQty: ${inputQty}`);

        if (buffers && buffers.length > 0) {
            for (const buffer of buffers) {
                let qtyPerUnit = 0;
                const matchingItem = woItems.find(i => i.item_code === buffer.source_item_code);
                if (matchingItem) {
                    qtyPerUnit = parseFloat(matchingItem.required_qty) / plannedQuantity;
                    console.log(`Found matching item ${buffer.source_item_code}, qtyPerUnit: ${qtyPerUnit} (${matchingItem.required_qty} / ${plannedQuantity})`);
                } else if (buffer.source_item_code === jc[0].item_code) {
                    qtyPerUnit = 1.0;
                    console.log(`Direct match item_code ${buffer.source_item_code}, qtyPerUnit: 1.0`);
                }

                if (qtyPerUnit > 0) {
                    const constraint = parseFloat(buffer.available_qty) / qtyPerUnit;
                    console.log(`Buffer constraint: ${constraint} (${buffer.available_qty} / ${qtyPerUnit})`);
                    if (constraint < maxAllowed) maxAllowed = constraint;
                }
            }
        }
        console.log(`Final simulated maxAllowed: ${maxAllowed}`);

        await c.end();
    } catch (e) {
        console.error(e);
    }
}
run();
