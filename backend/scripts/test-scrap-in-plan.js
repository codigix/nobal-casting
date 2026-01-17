import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
};

async function testScrapInPlan() {
  const conn = await mysql.createConnection(config);

  try {
    console.log('=== Testing Scrap Data in Production Plan ===\n');
    
    // Get the latest production plan
    const [plans] = await conn.execute(
      'SELECT plan_id FROM production_plan ORDER BY created_at DESC LIMIT 1'
    );

    if (plans.length === 0) {
      console.log('⚠️  No production plans found');
      await conn.end();
      return;
    }

    const planId = plans[0].plan_id;
    console.log(`Plan ID: ${planId}\n`);

    // Get sub-assembly items with scrap data
    const [subAssemblies] = await conn.execute(
      `SELECT item_code, item_name, planned_qty_before_scrap, scrap_percentage, planned_qty 
       FROM production_plan_sub_assembly 
       WHERE plan_id = ?`,
      [planId]
    );

    if (subAssemblies.length === 0) {
      console.log('⚠️  No sub-assemblies found in this plan');
    } else {
      console.log('✅ Sub-Assembly Items with Scrap Data:');
      console.log('─'.repeat(100));
      console.table(subAssemblies);
      
      // Check if scrap values are being stored
      const hasScrapData = subAssemblies.some(sa => 
        sa.scrap_percentage && sa.scrap_percentage > 0
      );
      
      if (hasScrapData) {
        console.log('\n✅ Scrap percentages are being stored correctly!');
      } else {
        console.log('\n⚠️  No scrap percentages found. This might be because items have no loss_percentage defined.');
      }
    }

    await conn.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testScrapInPlan();
