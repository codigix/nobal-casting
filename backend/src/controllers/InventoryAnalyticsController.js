class InventoryAnalyticsController {
  static async getInventoryAnalytics(req, res) {
    try {
      const { db } = req.app.locals;

      // 1. Current Month Metrics
      const [[{ total_value }]] = await db.query(`
        SELECT COALESCE(SUM(current_qty * valuation_rate), 0) as total_value
        FROM stock_balance
      `);

      const [[{ total_items }]] = await db.query(`
        SELECT COUNT(DISTINCT item_code) as total_items
        FROM stock_balance
        WHERE current_qty > 0
      `);

      const [[{ low_stock_count }]] = await db.query(`
        SELECT COUNT(DISTINCT item_code) as low_stock_count
        FROM stock_balance
        WHERE available_qty <= 10
      `);

      const [lowStockItemsList] = await db.query(`
        SELECT 
          sb.item_code, 
          i.name as item_name,
          sb.available_qty as current_qty,
          sb.warehouse_id,
          w.warehouse_name,
          COALESCE(sb.available_qty * sb.valuation_rate, 0) as total_value
        FROM stock_balance sb
        LEFT JOIN item i ON sb.item_code = i.item_code
        LEFT JOIN warehouses w ON sb.warehouse_id = w.id
        WHERE sb.available_qty <= 10 AND sb.available_qty >= 0
        ORDER BY sb.available_qty ASC
      `);

      const [[{ movement_count }]] = await db.query(`
        SELECT COUNT(*) as movement_count
        FROM stock_ledger
        WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      `);

      // 2. Previous Month Metrics (for Trends)
      const [[{ prev_total_value }]] = await db.query(`
        SELECT COALESCE(SUM(balance_qty * valuation_rate), 0) as total_value
        FROM (
          SELECT item_code, warehouse_id, balance_qty, valuation_rate,
                 ROW_NUMBER() OVER (PARTITION BY item_code, warehouse_id ORDER BY transaction_date DESC, id DESC) as rn
          FROM stock_ledger
          WHERE transaction_date < DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
        ) t
        WHERE rn = 1
      `);

      const [[{ prev_total_items }]] = await db.query(`
        SELECT COUNT(DISTINCT item_code) as total_items
        FROM (
          SELECT item_code, warehouse_id, balance_qty,
                 ROW_NUMBER() OVER (PARTITION BY item_code, warehouse_id ORDER BY transaction_date DESC, id DESC) as rn
          FROM stock_ledger
          WHERE transaction_date < DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
        ) t
        WHERE rn = 1 AND balance_qty > 0
      `);

      const [[{ prev_movement_count }]] = await db.query(`
        SELECT COUNT(*) as movement_count
        FROM stock_ledger
        WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
          AND transaction_date < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      `);

      const [[{ prev_low_stock_count }]] = await db.query(`
        SELECT COUNT(DISTINCT item_code) as low_stock_count
        FROM (
          SELECT item_code, warehouse_id, balance_qty,
                 ROW_NUMBER() OVER (PARTITION BY item_code, warehouse_id ORDER BY transaction_date DESC, id DESC) as rn
          FROM stock_ledger
          WHERE transaction_date < DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
        ) t
        WHERE rn = 1 AND balance_qty <= 10 AND balance_qty > 0
      `);

      // 3. Calculate Trends
      const kpiTrends = {
        value: {
          trend: total_value >= prev_total_value ? 'up' : 'down',
          percent: prev_total_value > 0 ? Math.round(Math.abs(total_value - prev_total_value) / prev_total_value * 100) : (total_value > 0 ? 100 : 0)
        },
        items: {
          trend: total_items >= prev_total_items ? 'up' : 'down',
          percent: prev_total_items > 0 ? Math.round(Math.abs(total_items - prev_total_items) / prev_total_items * 100) : (total_items > 0 ? 100 : 0)
        },
        movements: {
          trend: movement_count >= prev_movement_count ? 'up' : 'down',
          percent: prev_movement_count > 0 ? Math.round(Math.abs(movement_count - prev_movement_count) / prev_movement_count * 100) : (movement_count > 0 ? 100 : 0)
        },
        lowStock: {
          trend: low_stock_count <= (prev_low_stock_count || 0) ? 'down' : 'up',
          percent: (prev_low_stock_count || 0) > 0 ? Math.round(Math.abs(low_stock_count - prev_low_stock_count) / prev_low_stock_count * 100) : (low_stock_count > 0 ? 100 : 0)
        }
      };

      // 4. Warehouse distribution
      const [warehouseData] = await db.query(`
        SELECT 
          w.warehouse_code,
          w.warehouse_name,
          COUNT(DISTINCT sb.item_code) as item_count,
          COALESCE(SUM(sb.current_qty * sb.valuation_rate), 0) as value,
          ROUND((SUM(sb.current_qty * sb.valuation_rate) / ${parseFloat(total_value) || 1}) * 100, 1) as occupancy
        FROM stock_balance sb
        LEFT JOIN warehouses w ON sb.warehouse_id = w.id
        GROUP BY w.id, w.warehouse_code, w.warehouse_name
        ORDER BY value DESC
      `);

      // 5. Top items by inventory value
      const [topItems] = await db.query(`
        SELECT 
          i.item_code,
          i.name as item_name,
          sb.current_qty as quantity,
          COALESCE(sb.current_qty * sb.valuation_rate, 0) as value,
          w.warehouse_name
        FROM stock_balance sb
        LEFT JOIN item i ON sb.item_code = i.item_code
        LEFT JOIN warehouses w ON sb.warehouse_id = w.id
        ORDER BY value DESC
        LIMIT 10
      `);

      // 6. Stock movement in last 30 days
      const [movementStats] = await db.query(`
        SELECT 
          COUNT(*) as stock_movements_count,
          COALESCE(SUM(CASE WHEN qty_in > 0 THEN qty_in ELSE 0 END), 0) as inward_qty,
          COALESCE(SUM(CASE WHEN qty_out > 0 THEN qty_out ELSE 0 END), 0) as outward_qty
        FROM stock_ledger
        WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      `);

      // 7. Workflow Status Counts
      const [[{ pending_mr_count }]] = await db.query(`
        SELECT COUNT(*) as pending_mr_count FROM material_request WHERE status = 'draft' OR status = 'pending'
      `);

      const [[{ production_mr_count }]] = await db.query(`
        SELECT COUNT(*) as production_mr_count FROM material_request WHERE status = 'draft' AND purpose = 'material_issue'
      `);

      const [[{ active_po_count }]] = await db.query(`
        SELECT COUNT(*) as active_po_count FROM purchase_order WHERE status = 'submitted' OR status = 'partially_received'
      `);

      const [[{ pending_qc_count }]] = await db.query(`
        SELECT COUNT(*) as pending_qc_count FROM grn_requests WHERE status = 'pending' OR status = 'inspecting'
      `);

      const [[{ pending_transfer_count }]] = await db.query(`
        SELECT COUNT(*) as pending_transfer_count FROM stock_movements WHERE movement_type = 'TRANSFER' AND status = 'Pending'
      `);

      res.json({
        success: true,
        data: {
          total_value: Math.round(total_value * 100) / 100,
          total_items: total_items,
          low_stock_items: low_stock_count,
          low_stock_list: lowStockItemsList,
          kpiTrends,
          workflow_status: {
            pending_mrs: pending_mr_count,
            production_mrs: production_mr_count,
            active_pos: active_po_count,
            pending_qc: pending_qc_count,
            pending_transfers: pending_transfer_count
          },
          warehouse_distribution: warehouseData.map(wh => ({
            warehouse_code: wh.warehouse_code,
            warehouse_name: wh.warehouse_name,
            item_count: wh.item_count,
            value: Math.round(wh.value * 100) / 100,
            occupancy: parseFloat(wh.occupancy) || 0
          })),
          top_items: topItems.map(item => ({
            item_code: item.item_code,
            item_name: item.item_name,
            quantity: Math.round(item.quantity * 100) / 100,
            value: Math.round(item.value * 100) / 100,
            warehouse_name: item.warehouse_name
          })),
          stock_movements_count: movementStats[0].stock_movements_count || 0,
          inward_qty: Math.round(movementStats[0].inward_qty * 100) / 100,
          outward_qty: Math.round(movementStats[0].outward_qty * 100) / 100
        }
      });
    } catch (error) {
      console.error('Inventory analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching inventory analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

export default InventoryAnalyticsController;
