import http from 'http';

async function testProductionPlanAPI() {
  return new Promise((resolve, reject) => {
    const salesOrderId = 'SO-1768557808327'; // The test sales order we created
    
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: `/api/production-planning/generate/sales-order/${salesOrderId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
          const result = JSON.parse(data);
          if (result.success && result.data) {
            const plan = result.data;
            console.log('\n=== Production Plan Generated ===');
            console.log('Plan ID:', plan.plan_id);
            console.log('\nSub-Assemblies:', plan.sub_assemblies?.length || 0);
            
            if (plan.sub_assemblies && plan.sub_assemblies.length > 0) {
              console.log('\n✅ Sub-Assembly Items with Scrap Data:');
              plan.sub_assemblies.forEach(sa => {
                console.log(`\n  Item: ${sa.item_code} - ${sa.item_name}`);
                console.log(`    Qty Before Scrap: ${sa.planned_qty_before_scrap}`);
                console.log(`    Scrap %: ${sa.scrap_percentage}%`);
                console.log(`    Final Qty: ${sa.planned_qty}`);
              });
              
              const hasScrap = plan.sub_assemblies.some(sa => sa.scrap_percentage > 0);
              if (hasScrap) {
                console.log('\n✅ Scrap calculation is working correctly!');
              } else {
                console.log('\n⚠️  No scrap percentages found (items may not have loss_percentage defined)');
              }
            } else {
              console.log('⚠️  No sub-assemblies in plan');
            }
          } else {
            console.log('Error:', result.error || 'Unknown error');
          }
        } catch (e) {
          console.log('Response:', data);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error('Error:', e.message);
      reject(e);
    });

    req.end();
  });
}

console.log('Testing Production Plan API with Scrap Calculation...\n');
testProductionPlanAPI().catch(console.error);
