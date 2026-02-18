import { ProductionPlanningModel } from '../models/ProductionPlanningModel.js'
import { ProductionPlanningService } from '../services/ProductionPlanningService.js'
import ProductionModel from '../models/ProductionModel.js'

export class ProductionPlanningController {
  constructor(model, db) {
    this.model = model
    this.db = db
    this.service = new ProductionPlanningService(db)
    this.productionModel = new ProductionModel(db)
  }

  async createPlan(req, res) {
    const connection = await this.db.getConnection()
    try {
      await connection.beginTransaction()
      const { plan_id, company, planned_by_id, naming_series, sales_order_id, status, bom_id, plan_date, week_number, fg_items, sub_assemblies, raw_materials, operations, fg_operations } = req.body

      const planId = plan_id || `PLAN-${Date.now()}`
      const today = new Date().toISOString().split('T')[0]
      
      await connection.execute(
        `INSERT INTO production_plan (plan_id, naming_series, company, sales_order_id, status, bom_id, plan_date, week_number, planned_by_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [planId, naming_series || 'PP', company || '', sales_order_id || null, status || 'draft', bom_id || null, plan_date || today, week_number || null, planned_by_id || null]
      )

      if (fg_items && Array.isArray(fg_items)) {
        for (const item of fg_items) {
          const plannedQty = item.planned_qty || item.qty || item.quantity || 0
          const fgWarehouse = item.fg_warehouse || item.warehouse || ''
          await connection.execute(
            `INSERT INTO production_plan_fg 
             (plan_id, item_code, item_name, bom_no, planned_qty, uom, planned_start_date, fg_warehouse, revision, material_grade, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [planId, item.item_code || null, item.item_name || null, item.bom_no || null, plannedQty, 
             item.uom || null, item.planned_start_date || null, fgWarehouse, item.revision || null, item.material_grade || null, item.notes || null]
          )
        }
      }

      if (sub_assemblies && Array.isArray(sub_assemblies)) {
        for (const item of sub_assemblies) {
          const scheduleDate = item.scheduled_date || item.schedule_date || null
          const requiredQty = item.required_qty || item.qty || item.quantity || 0
          const plannedQty = item.planned_qty || requiredQty
          const plannedQtyBeforeScrap = item.planned_qty_before_scrap || requiredQty
          const scrapPercentage = item.scrap_percentage || 0
          const explosionLevel = item.explosion_level || 0
          
          await connection.execute(
            `INSERT INTO production_plan_sub_assembly 
             (plan_id, item_code, explosion_level, item_name, parent_item_code, target_warehouse, schedule_date, required_qty, planned_qty, planned_qty_before_scrap, scrap_percentage, manufacturing_type, bom_no, revision, material_grade, drawing_no, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [planId, item.item_code || null, explosionLevel, item.item_name || null, item.parent_item_code || item.parent_assembly_code || item.parent_code || null, item.target_warehouse || null, scheduleDate, 
             requiredQty, plannedQty, plannedQtyBeforeScrap, scrapPercentage, item.manufacturing_type || null, item.bom_no || null, item.revision || null, item.material_grade || null, item.drawing_no || null, item.notes || null]
          )
        }
      }

      if (raw_materials && Array.isArray(raw_materials)) {
        for (const item of raw_materials) {
          const planToRequestQty = item.plan_to_request_qty || item.qty || 0
          const qtyAsPerBom = item.qty_as_per_bom || item.qty || item.quantity || 0
          const rate = item.rate || 0
          
          await connection.execute(
            `INSERT INTO production_plan_raw_material 
             (plan_id, item_code, item_name, item_type, item_group, plan_to_request_qty, qty_as_per_bom, rate, required_by, bom_no, revision, material_grade, drawing_no, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [planId, item.item_code || null, item.item_name || null, item.item_type || null, item.item_group || null, planToRequestQty, 
             qtyAsPerBom, rate, item.required_by || null, item.bom_no || null, item.revision || null, item.material_grade || null, item.drawing_no || null, item.notes || null]
          )
        }
      }

      const allOperations = [
        ...(Array.isArray(fg_operations) ? fg_operations : []),
        ...(Array.isArray(operations) ? operations : [])
      ]

      if (allOperations.length > 0) {
        for (const op of allOperations) {
          await connection.execute(
            'INSERT INTO production_plan_operations (plan_id, operation_name, workstation_type, total_time_minutes, total_hours, hourly_rate, total_cost, operation_type, execution_mode, vendor_id, vendor_rate_per_unit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              planId, 
              op.operation_name || op.operation || '', 
              op.workstation_type || op.workstation || '', 
              op.total_time || op.total_time_minutes || 0, 
              op.total_hours || 0, 
              op.hourly_rate || 0, 
              op.total_cost || 0, 
              op.operation_type || 'SA', 
              op.execution_mode || 'IN_HOUSE', 
              op.vendor_id || null, 
              op.vendor_rate_per_unit || 0,
              op.notes || ''
            ]
          )
        }
      }

      await connection.commit()
      res.status(201).json({ success: true, data: { plan_id: planId } })
    } catch (error) {
      await connection.rollback()
      console.error('Error creating production plan:', error)
      res.status(500).json({ success: false, error: error.message })
    } finally {
      connection.release()
    }
  }

  async updatePlan(req, res) {
    const connection = await this.db.getConnection()
    try {
      await connection.beginTransaction()
      const { plan_id } = req.params
      const { naming_series, company, sales_order_id, status, bom_id, plan_date, week_number, planned_by_id, fg_items, sub_assemblies, raw_materials, operations, fg_operations } = req.body

      if (!plan_id) {
        throw new Error('Plan ID is required')
      }

      const fields = []
      const values = []
      if (naming_series !== undefined) { fields.push('naming_series = ?'); values.push(naming_series) }
      if (company !== undefined) { fields.push('company = ?'); values.push(company) }
      if (sales_order_id !== undefined) { fields.push('sales_order_id = ?'); values.push(sales_order_id) }
      if (status !== undefined) { fields.push('status = ?'); values.push(status) }
      if (bom_id !== undefined) { fields.push('bom_id = ?'); values.push(bom_id) }
      if (plan_date !== undefined) { fields.push('plan_date = ?'); values.push(plan_date) }
      if (week_number !== undefined) { fields.push('week_number = ?'); values.push(week_number) }
      if (planned_by_id !== undefined) { fields.push('planned_by_id = ?'); values.push(planned_by_id) }

      if (fields.length > 0) {
        values.push(plan_id)
        const query = `UPDATE production_plan SET ${fields.join(', ')} WHERE plan_id = ?`
        await connection.execute(query, values)
      }

      // Clear existing items
      await connection.execute(`DELETE FROM production_plan_fg WHERE plan_id = ?`, [plan_id])
      await connection.execute(`DELETE FROM production_plan_sub_assembly WHERE plan_id = ?`, [plan_id])
      await connection.execute(`DELETE FROM production_plan_raw_material WHERE plan_id = ?`, [plan_id])
      await connection.execute(`DELETE FROM production_plan_operations WHERE plan_id = ?`, [plan_id])

      if (fg_items && Array.isArray(fg_items)) {
        for (const item of fg_items) {
          const plannedQty = item.planned_qty || item.qty || item.quantity || 0
          const fgWarehouse = item.fg_warehouse || item.warehouse || ''
          await connection.execute(
            `INSERT INTO production_plan_fg 
             (plan_id, item_code, item_name, bom_no, planned_qty, uom, planned_start_date, fg_warehouse, revision, material_grade, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [plan_id, item.item_code || null, item.item_name || null, item.bom_no || null, plannedQty, 
             item.uom || null, item.planned_start_date || null, fgWarehouse, item.revision || null, item.material_grade || null, item.notes || null]
          )
        }
      }

      if (sub_assemblies && Array.isArray(sub_assemblies)) {
        for (const item of sub_assemblies) {
          const scheduleDate = item.scheduled_date || item.schedule_date || null
          const requiredQty = item.required_qty || item.qty || item.quantity || 0
          const plannedQty = item.planned_qty || requiredQty
          const plannedQtyBeforeScrap = item.planned_qty_before_scrap || requiredQty
          const scrapPercentage = item.scrap_percentage || 0
          const explosionLevel = item.explosion_level || 0
          
          await connection.execute(
            `INSERT INTO production_plan_sub_assembly 
             (plan_id, item_code, explosion_level, item_name, parent_item_code, target_warehouse, schedule_date, required_qty, planned_qty, planned_qty_before_scrap, scrap_percentage, manufacturing_type, bom_no, revision, material_grade, drawing_no, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [plan_id, item.item_code || null, explosionLevel, item.item_name || null, item.parent_item_code || item.parent_assembly_code || item.parent_code || null, item.target_warehouse || null, scheduleDate, 
             requiredQty, plannedQty, plannedQtyBeforeScrap, scrapPercentage, item.manufacturing_type || null, item.bom_no || null, item.revision || null, item.material_grade || null, item.drawing_no || null, item.notes || null]
          )
        }
      }

      if (raw_materials && Array.isArray(raw_materials)) {
        for (const item of raw_materials) {
          const planToRequestQty = item.plan_to_request_qty || item.qty || 0
          const qtyAsPerBom = item.qty_as_per_bom || item.qty || item.quantity || 0
          const rate = item.rate || 0
          
          await connection.execute(
            `INSERT INTO production_plan_raw_material 
             (plan_id, item_code, item_name, item_type, item_group, plan_to_request_qty, qty_as_per_bom, rate, required_by, bom_no, revision, material_grade, drawing_no, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [plan_id, item.item_code || null, item.item_name || null, item.item_type || null, item.item_group || null, planToRequestQty, 
             qtyAsPerBom, rate, item.required_by || null, item.bom_no || null, item.revision || null, item.material_grade || null, item.drawing_no || null, item.notes || null]
          )
        }
      }

      const allOperations = [
        ...(Array.isArray(fg_operations) ? fg_operations : []),
        ...(Array.isArray(operations) ? operations : [])
      ]

      if (allOperations.length > 0) {
        for (const op of allOperations) {
          await connection.execute(
            'INSERT INTO production_plan_operations (plan_id, operation_name, workstation_type, total_time_minutes, total_hours, hourly_rate, total_cost, operation_type, execution_mode, vendor_id, vendor_rate_per_unit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              plan_id, 
              op.operation_name || op.operation || '', 
              op.workstation_type || op.workstation || '', 
              op.total_time || op.total_time_minutes || 0, 
              op.total_hours || 0, 
              op.hourly_rate || 0, 
              op.total_cost || 0, 
              op.operation_type || 'SA', 
              op.execution_mode || 'IN_HOUSE', 
              op.vendor_id || null, 
              op.vendor_rate_per_unit || 0,
              op.notes || ''
            ]
          )
        }
      }

      await connection.commit()
      res.json({ success: true, message: 'Production plan updated successfully' })
    } catch (error) {
      await connection.rollback()
      console.error('Error updating production plan:', error)
      res.status(500).json({ success: false, error: error.message })
    } finally {
      connection.release()
    }
  }

  async getPlan(req, res) {
    try {
      const { plan_id } = req.params
      const plan = await this.model.getPlanById(plan_id)

      if (!plan) {
        return res.status(404).json({ success: false, error: 'Production plan not found' })
      }

      res.json({ success: true, data: plan })
    } catch (error) {
      console.error('Error fetching production plan:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async getAllPlans(req, res) {
    try {
      const plans = await this.model.getAllPlans()
      res.json({ success: true, data: plans })
    } catch (error) {
      console.error('Error fetching production plans:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async getByItemCode(req, res) {
    try {
      const { itemCode } = req.params
      
      if (!itemCode) {
        return res.status(400).json({ success: false, error: 'Item code is required' })
      }

      const result = await this.model.getPlanByItemCode(itemCode)
      
      if (!result) {
        return res.json({ success: true, data: null })
      }

      res.json({ success: true, data: result })
    } catch (error) {
      console.error('Error fetching production plan by item code:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async addFGItems(req, res) {
    try {
      const { plan_id } = req.params
      const body = req.body
      const items = body.items ? (Array.isArray(body.items) ? body.items : [body.items]) : [body]

      if (!plan_id) {
        return res.status(400).json({ success: false, error: 'Plan ID is required' })
      }

      if (!items || items.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one item is required' })
      }

      for (const item of items) {
        await this.model.addFGItem(plan_id, item)
      }

      res.json({ success: true, message: 'FG items added' })
    } catch (error) {
      console.error('Error adding FG items:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async addSubAssemblyItems(req, res) {
    try {
      const { plan_id } = req.params
      const body = req.body
      const items = body.items ? (Array.isArray(body.items) ? body.items : [body.items]) : [body]

      if (!plan_id) {
        return res.status(400).json({ success: false, error: 'Plan ID is required' })
      }

      if (!items || items.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one item is required' })
      }

      for (const item of items) {
        await this.model.addSubAssemblyItem(plan_id, item)
      }

      res.json({ success: true, message: 'Sub-assembly items added' })
    } catch (error) {
      console.error('Error adding sub-assembly items:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async addRawMaterialItems(req, res) {
    try {
      const { plan_id } = req.params
      const body = req.body
      const items = body.items ? (Array.isArray(body.items) ? body.items : [body.items]) : [body]

      if (!plan_id) {
        return res.status(400).json({ success: false, error: 'Plan ID is required' })
      }

      if (!items || items.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one item is required' })
      }

      for (const item of items) {
        await this.model.addRawMaterialItem(plan_id, item)
      }

      res.json({ success: true, message: 'Raw material items added' })
    } catch (error) {
      console.error('Error adding raw material items:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async deleteFGItem(req, res) {
    try {
      const { id } = req.params
      await this.model.deleteFGItem(id)
      res.json({ success: true, message: 'FG item deleted' })
    } catch (error) {
      console.error('Error deleting FG item:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async deleteSubAssemblyItem(req, res) {
    try {
      const { id } = req.params
      await this.model.deleteSubAssemblyItem(id)
      res.json({ success: true, message: 'Sub-assembly item deleted' })
    } catch (error) {
      console.error('Error deleting sub-assembly item:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async deleteRawMaterialItem(req, res) {
    try {
      const { id } = req.params
      await this.model.deleteRawMaterialItem(id)
      res.json({ success: true, message: 'Raw material item deleted' })
    } catch (error) {
      console.error('Error deleting raw material item:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async submitPlan(req, res) {
    try {
      const { plan_id } = req.params
      
      await this.model.updatePlanStatus(plan_id, 'submitted')
      
      let mrId = null
      try {
        mrId = await this.model.createMaterialRequest(plan_id)
      } catch (mrError) {
        console.error('Warning: Could not create material request:', mrError.message)
      }
      
      res.json({ 
        success: true, 
        message: 'Production plan submitted',
        data: { material_request_id: mrId }
      })
    } catch (error) {
      console.error('Error submitting production plan:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async deletePlan(req, res) {
    try {
      const { plan_id } = req.params
      await this.model.deletePlan(plan_id)
      res.json({ success: true, message: 'Production plan deleted' })
    } catch (error) {
      console.error('Error deleting production plan:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async truncatePlans(req, res) {
    try {
      await this.model.truncatePlans()
      res.json({ success: true, message: 'All production plans truncated successfully' })
    } catch (error) {
      console.error('Error truncating production plans:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async generateFromSalesOrder(req, res) {
    try {
      const { sales_order_id } = req.params

      if (!sales_order_id) {
        return res.status(400).json({ success: false, error: 'Sales Order ID is required' })
      }

      const plan = await this.service.generateProductionPlanFromSalesOrder(sales_order_id)

      const planId = await this.service.savePlanToDatabase(sales_order_id, plan)

      res.status(201).json({ 
        success: true, 
        message: 'Production plan generated successfully',
        data: {
          plan_id: planId,
          ...plan
        }
      })
    } catch (error) {
      console.error('Error generating production plan from sales order:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async createWorkOrders(req, res) {
    try {
      const { plan_id } = req.params

      if (!plan_id) {
        return res.status(400).json({ success: false, error: 'Plan ID is required' })
      }

      const result = await this.service.createWorkOrdersFromPlan(
        plan_id, 
        this.productionModel, 
        this.model,
        req.body,
        req.user?.user_id
      )

      res.json({ 
        success: true, 
        message: 'Work orders and job cards generated successfully',
        data: { work_orders: result }
      })
    } catch (error) {
      console.error('Error creating work orders from plan:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async getProductionReport(req, res) {
    try {
      const { plan_id } = req.params;
      const reportData = await this.model.getProductionReportData(plan_id);

      if (!reportData) {
        return res.status(404).json({ success: false, error: 'Production plan not found' });
      }

      res.json({ success: true, data: reportData });
    } catch (error) {
      console.error('Error generating production report:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getHierarchyBySalesOrder(req, res) {
    try {
      const { sales_order_id } = req.params;

      // 1. Get Sales Order basic info
      const [salesOrders] = await this.db.query(
        'SELECT sales_order_id, customer_name, status, order_amount, delivery_date FROM selling_sales_order WHERE sales_order_id = ?',
        [sales_order_id]
      );

      if (salesOrders.length === 0) {
        return res.status(404).json({ success: false, error: 'Sales Order not found' });
      }

      const salesOrder = salesOrders[0];

      // 2. Get Production Plans for this Sales Order
      const [plans] = await this.db.query(
        'SELECT plan_id, status, plan_date, bom_id FROM production_plan WHERE sales_order_id = ?',
        [sales_order_id]
      );

      // 3. Get Work Orders linked to this Sales Order or its Production Plans
      const planIds = plans.map(p => p.plan_id);
      let workOrders = [];
      if (planIds.length > 0 || sales_order_id) {
        // Query Work Orders linked directly to SO or to any of its Plans
        let query = `
          SELECT 
            wo.wo_id, 
            wo.item_code, 
            i.name as item_name,
            wo.quantity, 
            wo.status, 
            wo.production_plan_id, 
            wo.parent_wo_id, 
            wo.planned_start_date, 
            wo.expected_delivery_date 
          FROM work_order wo
          LEFT JOIN item i ON wo.item_code = i.item_code
          WHERE wo.sales_order_id = ?
        `;
        let params = [sales_order_id];
        
        if (planIds.length > 0) {
          query += ' OR wo.production_plan_id IN (?)';
          params.push(planIds);
        }
        
        const [woRows] = await this.db.query(query, params);
        workOrders = woRows;
      }

      // 4. Get Job Cards for these Work Orders
      const woIds = workOrders.map(wo => wo.wo_id);
      let jobCards = [];
      if (woIds.length > 0) {
        const [jcRows] = await this.db.query(
          'SELECT job_card_id, work_order_id, operation, status, planned_quantity, produced_quantity, machine_id, operator_id, actual_start_date, actual_end_date FROM job_card WHERE work_order_id IN (?)',
          [woIds]
        );
        jobCards = jcRows;
      }

      // 5. Get Work Order Dependencies for dotted lines
      let dependencies = [];
      if (woIds.length > 0) {
        const [depRows] = await this.db.query(
          'SELECT parent_wo_id, child_wo_id, item_code, required_qty FROM work_order_dependency WHERE parent_wo_id IN (?) OR child_wo_id IN (?)',
          [woIds, woIds]
        );
        dependencies = depRows;
      }

      res.json({
        success: true,
        data: {
          salesOrder,
          plans,
          workOrders,
          jobCards,
          dependencies
        }
      });
    } catch (error) {
      console.error('Error fetching production hierarchy:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
