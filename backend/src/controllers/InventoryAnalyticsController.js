class InventoryAnalyticsController {
  static async getInventoryAnalytics(req, res) {
    try {
      const { db } = req.app.locals;

      // Get total inventory value
      const [totalValueResult] = await db.query(`
        SELECT COALESCE(SUM(current_qty * valuation_rate), 0) as total_value
        FROM stock_balance
      `);
      const total_value = totalValueResult[0].total_value || 0;

      // Get total items in stock
      const [totalItemsResult] = await db.query(`
        SELECT COUNT(DISTINCT item_code) as total_items
        FROM stock_balance
        WHERE current_qty > 0
      `);
      const total_items = totalItemsResult[0].total_items || 0;

      // Get low stock items count (items with very low stock)
      const [lowStockResult] = await db.query(`
        SELECT COUNT(DISTINCT item_code) as low_stock_count
        FROM stock_balance
        WHERE available_qty <= 10
      `);
      const low_stock_items = lowStockResult[0].low_stock_count || 0;

      // Get stock turnover rate
      const [movementsResult] = await db.query(`
        SELECT COUNT(*) as movement_count
        FROM stock_ledger
        WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      `);
      const movement_count = movementsResult[0].movement_count || 1;
      const turnover_rate = total_value > 0 ? movement_count / (total_value / 100000) : 0;

      // Get warehouse distribution
      const [warehouseData] = await db.query(`
        SELECT 
          w.warehouse_code,
          w.warehouse_name,
          COUNT(DISTINCT sb.item_code) as item_count,
          COALESCE(SUM(sb.current_qty * sb.valuation_rate), 0) as value,
          ROUND((SUM(sb.current_qty * sb.valuation_rate) / ${total_value || 1}) * 100, 1) as occupancy
        FROM stock_balance sb
        LEFT JOIN warehouses w ON sb.warehouse_id = w.id
        GROUP BY w.id, w.warehouse_code, w.warehouse_name
        ORDER BY value DESC
      `);

      // Get top items by inventory value
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

      // Get stock movement in last 30 days
      const [movementStats] = await db.query(`
        SELECT 
          COUNT(*) as stock_movements_count,
          COALESCE(SUM(CASE WHEN qty_in > 0 THEN qty_in ELSE 0 END), 0) as inward_qty,
          COALESCE(SUM(CASE WHEN qty_out > 0 THEN qty_out ELSE 0 END), 0) as outward_qty
        FROM stock_ledger
        WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      `);

      res.json({
        success: true,
        data: {
          total_value: Math.round(total_value * 100) / 100,
          total_items: total_items,
          low_stock_items: low_stock_items,
          turnover_rate: Math.round(turnover_rate * 100) / 100,
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
