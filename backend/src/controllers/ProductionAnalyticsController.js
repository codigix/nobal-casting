
class ProductionAnalyticsController {
  constructor(db) {
    this.db = db
  }

  async getProjectDetailedAnalysis(req, res) {
    try {
      const { soId } = req.params
      const db = req.app.locals.db || global.db

      // 1. Fetch Sales Order
      const [salesOrders] = await db.execute(
        'SELECT * FROM selling_sales_order WHERE sales_order_id = ?',
        [soId]
      )

      if (!salesOrders.length) {
        return res.status(404).json({ success: false, message: 'Sales Order not found' })
      }

      const salesOrder = salesOrders[0]

      // 2. Fetch Production Plan
      const [plans] = await db.execute(
        'SELECT * FROM production_plan WHERE sales_order_id = ?',
        [soId]
      )
      const plan = plans[0] || null

      // 3. Fetch Work Orders
      const [workOrders] = await db.execute(
        'SELECT * FROM work_order WHERE sales_order_id = ?',
        [soId]
      )

      // 4. Fetch Job Cards
      const [jobCards] = await db.execute(
        `SELECT jc.*, ps.stage_name, ps.stage_sequence 
         FROM job_card jc
         LEFT JOIN production_stages ps ON jc.operation = ps.stage_code OR jc.operation = ps.stage_name
         WHERE jc.work_order_id IN (SELECT wo_id FROM work_order WHERE sales_order_id = ?)
         ORDER BY FIELD(jc.operation_type, 'SA', 'IN_HOUSE', 'FG') ASC, CAST(SUBSTRING_INDEX(jc.job_card_id, "-", -1) AS UNSIGNED) ASC, ps.stage_sequence ASC, jc.operation_sequence ASC`,
        [soId]
      )

      // 5. Calculate Stage-Wise Progress
      const stagesMap = {}
      
      // Initialize with active stages
      const [activeStages] = await db.execute(
        'SELECT * FROM production_stages WHERE is_active = 1 ORDER BY stage_sequence ASC'
      )
      
      activeStages.forEach(stage => {
        stagesMap[stage.stage_code] = {
          stage_code: stage.stage_code,
          stage_name: stage.stage_name,
          sequence: stage.stage_sequence,
          planned_qty: 0,
          produced_qty: 0,
          accepted_qty: 0,
          rejected_qty: 0,
          scrap_qty: 0,
          status: 'pending',
          job_cards_count: 0,
          completed_count: 0
        }
      })

      jobCards.forEach(jc => {
        const stageCode = jc.operation
        // Try to find matching stage
        let stage = Object.values(stagesMap).find(s => s.stage_code === stageCode || s.stage_name === stageCode)
        
        if (!stage) {
          // Add ad-hoc stage if not found in active stages
          stagesMap[stageCode] = {
            stage_code: stageCode,
            stage_name: jc.stage_name || stageCode,
            sequence: jc.stage_sequence || 999,
            planned_qty: 0,
            produced_qty: 0,
            accepted_qty: 0,
            rejected_qty: 0,
            scrap_qty: 0,
            status: 'pending',
            job_cards_count: 0,
            completed_count: 0
          }
          stage = stagesMap[stageCode]
        }

        stage.planned_qty += parseFloat(jc.planned_quantity || 0)
        stage.produced_qty += parseFloat(jc.produced_quantity || 0)
        stage.accepted_qty += parseFloat(jc.accepted_quantity || 0)
        stage.rejected_qty += parseFloat(jc.rejected_quantity || 0)
        stage.scrap_qty += parseFloat(jc.scrap_quantity || 0)
        stage.job_cards_count += 1
        
        if (jc.status?.toLowerCase() === 'completed') {
          stage.completed_count += 1
        }
      })

      // Finalize stage statuses
      Object.values(stagesMap).forEach(stage => {
        if (stage.job_cards_count === 0) {
          stage.status = 'not_started'
        } else if (stage.completed_count === stage.job_cards_count) {
          stage.status = 'completed'
        } else if (stage.produced_qty > 0 || stage.completed_count > 0) {
          stage.status = 'in_progress'
        } else {
          stage.status = 'pending'
        }
      })

      // 6. Material Readiness
      let materialReadiness = []
      if (plan) {
        const [materials] = await db.execute(
          `SELECT prm.*, i.name as item_name, i.uom, i.lead_time_days,
                  (SELECT SUM(available_qty) FROM stock_balance WHERE item_code = prm.item_code) as current_stock
           FROM production_plan_raw_material prm
           LEFT JOIN item i ON prm.item_code = i.item_code
           WHERE prm.plan_id = ?`,
          [plan.plan_id]
        )
        
        materialReadiness = materials.map(m => ({
          item_code: m.item_code,
          item_name: m.item_name,
          uom: m.uom || 'Nos',
          lead_time: m.lead_time_days || 0,
          required_qty: parseFloat(m.plan_to_request_qty || m.qty_as_per_bom || 0),
          available_qty: parseFloat(m.current_stock || 0),
          shortage: Math.max(0, parseFloat(m.plan_to_request_qty || m.qty_as_per_bom || 0) - parseFloat(m.current_stock || 0)),
          is_ready: parseFloat(m.current_stock || 0) >= parseFloat(m.plan_to_request_qty || m.qty_as_per_bom || 0)
        }))
      }

      // 7. Overall Metrics
      const totalPlanned = jobCards.length > 0 ? jobCards.reduce((sum, jc) => sum + parseFloat(jc.planned_quantity || 0), 0) : 0
      const totalProduced = jobCards.length > 0 ? jobCards.reduce((sum, jc) => sum + parseFloat(jc.produced_quantity || 0), 0) : 0
      
      const overallProgress = totalPlanned > 0 ? Math.round((totalProduced / totalPlanned) * 100) : 0

      // 8. Fetch Job Card Dispatches (Production Shipments)
      const [jobCardShipments] = await db.execute(
        `SELECT jc.job_card_id, jc.operation, jc.carrier_name, jc.tracking_number, 
                jc.dispatch_qty as accepted_quantity, jc.dispatch_date, jc.shipping_notes
         FROM job_card jc
         WHERE jc.work_order_id IN (SELECT wo_id FROM work_order WHERE sales_order_id = ?)
         AND jc.is_shipment = 1 AND jc.dispatch_qty > 0`,
        [soId]
      )

      // 9. Fetch Official Delivery Challans (Selling Module)
      const [dispatches] = await db.execute(
        `SELECT dn.delivery_note_id as dispatch_id, dn.delivery_date as dispatch_date, 
                dn.driver_name as carrier, dn.status, dn.quantity
         FROM selling_delivery_note dn
         WHERE dn.sales_order_id = ? AND dn.deleted_at IS NULL`,
        [soId]
      )

      // 10. Fetch Daily Production Entries (History)
      const [entries] = await db.execute(
        `SELECT pe.entry_date as date, pe.quantity_produced, pe.quantity_rejected, pe.hours_worked, 
                wo.item_code, i.name as item_name
         FROM production_entry pe
         JOIN work_order wo ON pe.work_order_id = wo.wo_id
         LEFT JOIN item i ON wo.item_code = i.item_code
         WHERE wo.sales_order_id = ?
         ORDER BY pe.entry_date DESC`,
        [soId]
      )

      // 11. Calculate Chart Data (Daily Trend)
      const dailyTrend = entries.reduce((acc, entry) => {
        const dateStr = new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
        if (!acc[dateStr]) acc[dateStr] = { date: dateStr, actual: 0 }
        acc[dateStr].actual += parseFloat(entry.quantity_produced || 0)
        return acc
      }, {})

      const chartData = Object.values(dailyTrend).sort((a, b) => new Date(a.date) - new Date(b.date))

      res.status(200).json({
        success: true,
        data: {
          project: {
            id: salesOrder.sales_order_id,
            name: salesOrder.name || salesOrder.sales_order_id,
            customer: salesOrder.customer_name,
            status: salesOrder.status,
            delivery_date: salesOrder.delivery_date,
            grand_total: salesOrder.grand_total,
            overall_progress: overallProgress,
            job_card_shipments: jobCardShipments,
            dispatches: dispatches
          },
          stages: Object.values(stagesMap).sort((a, b) => a.sequence - b.sequence),
          materials: materialReadiness,
          entries: entries,
          chartData: [
            { id: 'Total Production', data: chartData }
          ],
          work_orders_count: workOrders.length,
          job_cards_count: jobCards.length,
          plan_id: plan ? plan.plan_id : null
        }
      })

    } catch (error) {
      console.error('Error in getProjectDetailedAnalysis:', error)
      res.status(500).json({
        success: false,
        message: 'Error fetching detailed project analysis',
        error: error.message
      })
    }
  }
}

export default new ProductionAnalyticsController()
