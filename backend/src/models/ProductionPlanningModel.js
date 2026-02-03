export class ProductionPlanningModel {
  constructor(db) {
    this.db = db
  }

  async createPlan(data) {
    try {
      const planId = data.plan_id || `PLAN-${Date.now()}`
      const today = new Date().toISOString().split('T')[0]
      
      await this.db.execute(
        `INSERT INTO production_plan (plan_id, naming_series, company, sales_order_id, status, bom_id, plan_date, week_number, planned_by_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [planId, data.naming_series || 'PP', data.company || '', data.sales_order_id || null, data.status || 'draft', data.bom_id || null, data.plan_date || today, data.week_number || null, data.planned_by_id || null]
      )

      return { plan_id: planId }
    } catch (error) {
      throw error
    }
  }

  async getPlanById(plan_id) {
    try {
      const [plans] = await this.db.execute(
        `SELECT pp.*, i.name as bom_product_name, b.item_code as bom_item_code 
         FROM production_plan pp
         LEFT JOIN bom b ON pp.bom_id = b.bom_id
         LEFT JOIN item i ON b.item_code = i.item_code
         WHERE pp.plan_id = ?`,
        [plan_id]
      )
      
      if (!plans.length) return null

      const plan = plans[0]

      const [fgItems] = await this.db.execute(
        `SELECT pg.*, i.name as item_name, pg.bom_no 
         FROM production_plan_fg pg 
         LEFT JOIN item i ON pg.item_code = i.item_code 
         WHERE pg.plan_id = ?`,
        [plan_id]
      ).catch(() => [])

      const [subAssemblies] = await this.db.execute(
        `SELECT psa.*, i.name as item_name, psa.bom_no 
         FROM production_plan_sub_assembly psa 
         LEFT JOIN item i ON psa.item_code = i.item_code 
         WHERE psa.plan_id = ?`,
        [plan_id]
      ).catch(() => [])

      const [rawMaterials] = await this.db.execute(
        `SELECT prm.*, i.name as item_name 
         FROM production_plan_raw_material prm 
         LEFT JOIN item i ON prm.item_code = i.item_code 
         WHERE prm.plan_id = ?`,
        [plan_id]
      ).catch(() => [])

      const [operations] = await this.db.execute(
        `SELECT * FROM production_plan_operations 
         WHERE plan_id = ? 
         ORDER BY FIELD(operation_type, 'FG', 'SA', 'IN_HOUSE') ASC, id ASC`,
        [plan_id]
      ).catch(() => [])

      const mappedSubAssemblies = subAssemblies.map(item => ({
        ...item,
        scheduled_date: item.schedule_date
      }))

      const mappedRawMaterials = rawMaterials.map(item => ({
        ...item,
        qty: item.plan_to_request_qty || item.qty
      }))

      let salesOrderId = plan.sales_order_id

      if (!salesOrderId && fgItems.length > 0) {
        salesOrderId = await this.findMatchingSalesOrder(fgItems)
        if (salesOrderId) {
          plan.sales_order_id = salesOrderId
          
          try {
            await this.db.execute(
              `UPDATE production_plan SET sales_order_id = ? WHERE plan_id = ?`,
              [salesOrderId, plan_id]
            )
          } catch (err) {
            console.log('Note: Could not update sales_order_id in database:', err.message)
          }
        }
      }

      return {
        ...plan,
        fg_items: fgItems,
        sub_assemblies: mappedSubAssemblies,
        raw_materials: mappedRawMaterials,
        operations: operations
      }
    } catch (error) {
      throw error
    }
  }

  async findMatchingSalesOrder(fgItems) {
    try {
      const [salesOrders] = await this.db.execute(
        `SELECT sales_order_id, items FROM selling_sales_order WHERE deleted_at IS NULL`
      ).catch(() => [[], []])

      if (!salesOrders.length) return null

      const fgItemCodes = fgItems.map(item => item.item_code)

      for (const order of salesOrders) {
        try {
          const orderItems = order.items ? JSON.parse(order.items) : []
          const soItemCodes = orderItems.map(item => item.item_code)

          const matchedItems = fgItemCodes.filter(code => soItemCodes.includes(code))
          
          if (matchedItems.length > 0 && matchedItems.length === fgItemCodes.length) {
            return order.sales_order_id
          }
        } catch (err) {
          continue
        }
      }

      return null
    } catch (error) {
      console.error('Error finding matching sales order:', error)
      return null
    }
  }

  async getAllPlans() {
    try {
      const [plans] = await this.db.execute(
        `SELECT pp.*, i.name as bom_product_name, b.item_code as bom_item_code 
         FROM production_plan pp
         LEFT JOIN bom b ON pp.bom_id = b.bom_id
         LEFT JOIN item i ON b.item_code = i.item_code
         ORDER BY pp.created_at DESC`
      )
      
      const plansWithItems = []
      for (const plan of plans) {
        try {
          const [fgItems] = await this.db.execute(
            `SELECT pg.*, i.name as item_name 
             FROM production_plan_fg pg 
             LEFT JOIN item i ON pg.item_code = i.item_code 
             WHERE pg.plan_id = ?`,
            [plan.plan_id]
          ).catch(() => [])
          
          const [rawMaterials] = await this.db.execute(
            `SELECT prm.*, i.name as item_name 
             FROM production_plan_raw_material prm 
             LEFT JOIN item i ON prm.item_code = i.item_code 
             WHERE prm.plan_id = ?`,
            [plan.plan_id]
          ).catch(() => [])
          
          const mappedRawMaterials = rawMaterials.map(item => ({
            ...item,
            qty: item.plan_to_request_qty || item.qty
          }))
          
          let salesOrderId = plan.sales_order_id
          if (!salesOrderId && fgItems && fgItems.length > 0) {
            salesOrderId = await this.findMatchingSalesOrder(fgItems)
            if (salesOrderId) {
              plan.sales_order_id = salesOrderId
            }
          }
          
          plansWithItems.push({
            ...plan,
            fg_items: fgItems || [],
            raw_materials: mappedRawMaterials || []
          })
        } catch (err) {
          console.error(`Error fetching items for plan ${plan.plan_id}:`, err)
          plansWithItems.push({
            ...plan,
            fg_items: [],
            raw_materials: []
          })
        }
      }
      
      return plansWithItems
    } catch (error) {
      throw error
    }
  }

  async getPlanByItemCode(itemCode) {
    try {
      const [fgItems] = await this.db.execute(
        `SELECT pg.*, i.name as item_name 
         FROM production_plan_fg pg 
         LEFT JOIN item i ON pg.item_code = i.item_code 
         WHERE pg.item_code = ? LIMIT 1`,
        [itemCode]
      ).catch(() => [[], null])

      if (!fgItems || fgItems.length === 0) {
        return null
      }

      const fgItem = fgItems[0]
      const planId = fgItem.plan_id

      const [plans] = await this.db.execute(
        `SELECT * FROM production_plan WHERE plan_id = ?`,
        [planId]
      )

      if (!plans || plans.length === 0) {
        return null
      }

      const plan = plans[0]

      return {
        plan_id: plan.plan_id,
        sales_order_id: plan.sales_order_id,
        fg_item: {
          item_code: fgItem.item_code,
          item_name: fgItem.item_name,
          bom_no: fgItem.bom_no,
          planned_qty: fgItem.planned_qty,
          uom: fgItem.uom
        }
      }
    } catch (error) {
      console.error('Error in getPlanByItemCode:', error)
      throw error
    }
  }

  async updatePlanHeader(plan_id, data) {
    try {
      const checkQuery = `SELECT plan_id FROM production_plan WHERE plan_id = ?`
      const [existing] = await this.db.execute(checkQuery, [plan_id])
      
      if (existing.length === 0) {
        const today = new Date().toISOString().split('T')[0]
        const insertQuery = `INSERT INTO production_plan 
          (plan_id, naming_series, company, sales_order_id, status, bom_id, plan_date, week_number, planned_by_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        
        await this.db.execute(insertQuery, [
          plan_id,
          data.naming_series || 'PP',
          data.company || '',
          data.sales_order_id || null,
          data.status || 'draft',
          data.bom_id || null,
          data.plan_date || today,
          data.week_number || null,
          data.planned_by_id || null
        ])
        
        return true
      }

      const fields = []
      const values = []

      if (data.naming_series !== undefined) { fields.push('naming_series = ?'); values.push(data.naming_series) }
      if (data.company !== undefined) { fields.push('company = ?'); values.push(data.company) }
      if (data.sales_order_id !== undefined) { fields.push('sales_order_id = ?'); values.push(data.sales_order_id) }
      if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }
      if (data.bom_id !== undefined) { fields.push('bom_id = ?'); values.push(data.bom_id) }
      if (data.plan_date !== undefined) { fields.push('plan_date = ?'); values.push(data.plan_date) }
      if (data.week_number !== undefined) { fields.push('week_number = ?'); values.push(data.week_number) }
      if (data.planned_by_id !== undefined) { fields.push('planned_by_id = ?'); values.push(data.planned_by_id) }

      if (fields.length === 0) return true

      values.push(plan_id)
      const query = `UPDATE production_plan SET ${fields.join(', ')} WHERE plan_id = ?`
      await this.db.execute(query, values)

      return true
    } catch (error) {
      throw error
    }
  }

  async clearFGItems(plan_id) {
    try {
      await this.db.execute(`DELETE FROM production_plan_fg WHERE plan_id = ?`, [plan_id])
      return true
    } catch (error) {
      throw error
    }
  }

  async clearSubAssemblyItems(plan_id) {
    try {
      await this.db.execute(`DELETE FROM production_plan_sub_assembly WHERE plan_id = ?`, [plan_id])
      return true
    } catch (error) {
      throw error
    }
  }

  async clearRawMaterialItems(plan_id) {
    try {
      await this.db.execute(`DELETE FROM production_plan_raw_material WHERE plan_id = ?`, [plan_id])
      return true
    } catch (error) {
      throw error
    }
  }

  async addFGItem(plan_id, item) {
    try {
      const [plans] = await this.db.execute(
        `SELECT plan_id FROM production_plan WHERE plan_id = ?`,
        [plan_id]
      )
      
      if (!plans.length) {
        throw new Error(`Production plan with ID ${plan_id} does not exist. Please create the plan first.`)
      }
      
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS production_plan_fg (
          id INT AUTO_INCREMENT PRIMARY KEY,
          plan_id VARCHAR(100) NOT NULL,
          item_code VARCHAR(100) NOT NULL,
          item_name VARCHAR(255),
          bom_no VARCHAR(100),
          planned_qty DECIMAL(18,6) NOT NULL,
          uom VARCHAR(50),
          planned_start_date DATE,
          fg_warehouse VARCHAR(100),
          revision VARCHAR(50),
          material_grade VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (plan_id) REFERENCES production_plan(plan_id) ON DELETE CASCADE,
          INDEX idx_plan_id (plan_id),
          INDEX idx_item_code (item_code)
        )
      `)
      
      const plannedQty = item.planned_qty || item.qty || item.quantity || 0
      const fgWarehouse = item.fg_warehouse || item.warehouse || ''
      
      await this.db.execute(
        `INSERT INTO production_plan_fg 
         (plan_id, item_code, item_name, bom_no, planned_qty, uom, planned_start_date, fg_warehouse, revision, material_grade, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [plan_id, item.item_code || null, item.item_name || null, item.bom_no || null, plannedQty, 
         item.uom || null, item.planned_start_date || null, fgWarehouse, item.revision || null, item.material_grade || null, item.notes || null]
      )
    } catch (error) {
      throw error
    }
  }

  async addSubAssemblyItem(plan_id, item) {
    try {
      const [plans] = await this.db.execute(
        `SELECT plan_id FROM production_plan WHERE plan_id = ?`,
        [plan_id]
      )
      
      if (!plans.length) {
        throw new Error(`Production plan with ID ${plan_id} does not exist. Please create the plan first.`)
      }
      
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS production_plan_sub_assembly (
          id INT AUTO_INCREMENT PRIMARY KEY,
          plan_id VARCHAR(100) NOT NULL,
          item_code VARCHAR(100) NOT NULL,
          item_name VARCHAR(255),
          target_warehouse VARCHAR(100),
          schedule_date DATE,
          required_qty DECIMAL(18,6),
          planned_qty DECIMAL(18,6),
          planned_qty_before_scrap DECIMAL(18,6),
          scrap_percentage DECIMAL(5,2) DEFAULT 0,
          manufacturing_type VARCHAR(50),
          bom_no VARCHAR(100),
          revision VARCHAR(50),
          material_grade VARCHAR(100),
          drawing_no VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (plan_id) REFERENCES production_plan(plan_id) ON DELETE CASCADE,
          INDEX idx_plan_id (plan_id),
          INDEX idx_item_code (item_code)
        )
      `)
      
      const scheduleDate = item.scheduled_date || item.schedule_date || null
      const requiredQty = item.required_qty || item.qty || item.quantity || 0
      const plannedQty = item.planned_qty || requiredQty
      const plannedQtyBeforeScrap = item.planned_qty_before_scrap || requiredQty
      const scrapPercentage = item.scrap_percentage || 0
      
      await this.db.execute(
        `INSERT INTO production_plan_sub_assembly 
         (plan_id, item_code, item_name, target_warehouse, schedule_date, required_qty, planned_qty, planned_qty_before_scrap, scrap_percentage, manufacturing_type, bom_no, revision, material_grade, drawing_no, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [plan_id, item.item_code || null, item.item_name || null, item.target_warehouse || null, scheduleDate, 
         requiredQty, plannedQty, plannedQtyBeforeScrap, scrapPercentage, item.manufacturing_type || null, item.bom_no || null, item.revision || null, item.material_grade || null, item.drawing_no || null, item.notes || null]
      )
    } catch (error) {
      throw error
    }
  }

  async addRawMaterialItem(plan_id, item) {
    try {
      const [plans] = await this.db.execute(
        `SELECT plan_id FROM production_plan WHERE plan_id = ?`,
        [plan_id]
      )
      
      if (!plans.length) {
        throw new Error(`Production plan with ID ${plan_id} does not exist. Please create the plan first.`)
      }
      
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS production_plan_raw_material (
          id INT AUTO_INCREMENT PRIMARY KEY,
          plan_id VARCHAR(100) NOT NULL,
          item_code VARCHAR(100) NOT NULL,
          item_name VARCHAR(255),
          item_type VARCHAR(50),
          item_group VARCHAR(100),
          plan_to_request_qty DECIMAL(18,6),
          qty_as_per_bom DECIMAL(18,6),
          required_by DATE,
          bom_no VARCHAR(100),
          revision VARCHAR(50),
          material_grade VARCHAR(100),
          drawing_no VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (plan_id) REFERENCES production_plan(plan_id) ON DELETE CASCADE,
          INDEX idx_plan_id (plan_id),
          INDEX idx_item_code (item_code)
        )
      `)
      
      const planToRequestQty = item.plan_to_request_qty || item.qty || 0
      const qtyAsPerBom = item.qty_as_per_bom || item.qty || item.quantity || 0
      
      await this.db.execute(
        `INSERT INTO production_plan_raw_material 
         (plan_id, item_code, item_name, item_type, item_group, plan_to_request_qty, qty_as_per_bom, required_by, bom_no, revision, material_grade, drawing_no, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [plan_id, item.item_code || null, item.item_name || null, item.item_type || null, item.item_group || null, planToRequestQty, 
         qtyAsPerBom, item.required_by || null, item.bom_no || null, item.revision || null, item.material_grade || null, item.drawing_no || null, item.notes || null]
      )
    } catch (error) {
      throw error
    }
  }

  async deleteFGItem(id) {
    try {
      await this.db.execute(`DELETE FROM production_plan_fg WHERE id = ?`, [id])
    } catch (error) {
      throw error
    }
  }

  async deleteSubAssemblyItem(id) {
    try {
      await this.db.execute(`DELETE FROM production_plan_sub_assembly WHERE id = ?`, [id])
    } catch (error) {
      throw error
    }
  }

  async deleteRawMaterialItem(id) {
    try {
      await this.db.execute(`DELETE FROM production_plan_raw_material WHERE id = ?`, [id])
    } catch (error) {
      throw error
    }
  }

  async updatePlanStatus(plan_id, status) {
    try {
      await this.db.execute(
        `UPDATE production_plan SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE plan_id = ?`,
        [status, plan_id]
      )
    } catch (error) {
      throw error
    }
  }

  async deletePlan(plan_id) {
    try {
      await this.db.execute(
        `DELETE FROM production_plan WHERE plan_id = ?`,
        [plan_id]
      )
    } catch (error) {
      throw error
    }
  }

  async createMaterialRequest(plan_id) {
    try {
      const [plans] = await this.db.execute(
        `SELECT * FROM production_plan WHERE plan_id = ?`,
        [plan_id]
      )
      if (!plans.length) throw new Error('Production plan not found')
      const plan = plans[0]

      const [rawMaterials] = await this.db.execute(
        `SELECT * FROM production_plan_raw_material WHERE plan_id = ?`,
        [plan_id]
      )

      if (!rawMaterials || rawMaterials.length === 0) {
        throw new Error('No raw materials found in this production plan')
      }

      const mr_id = 'MR-' + Date.now()
      const request_date = new Date().toISOString().split('T')[0]

      await this.db.execute(
        `INSERT INTO material_request 
         (mr_id, series_no, transition_date, requested_by_id, department, purpose, 
          request_date, required_by_date, target_warehouse, source_warehouse, items_notes, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [mr_id, `PLAN-${plan_id}`, null, 'system', 'Production', 'material_issue', 
         request_date, null, null, null, `Auto-created from Production Plan: ${plan_id}`, 'draft']
      )

      for (const material of rawMaterials) {
        const mr_item_id = 'MRI-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
        await this.db.execute(
          'INSERT INTO material_request_item (mr_item_id, mr_id, item_code, qty, uom, purpose) VALUES (?, ?, ?, ?, ?, ?)',
          [mr_item_id, mr_id, material.item_code, material.plan_to_request_qty || material.qty_as_per_bom || 0, 'Kg', null]
        )

        await this.db.execute(
          'UPDATE production_plan_raw_material SET mr_id = ?, material_status = ? WHERE plan_id = ? AND item_code = ?',
          [mr_id, 'requested', plan_id, material.item_code]
        )
      }

      return mr_id
    } catch (error) {
      throw new Error('Failed to create material request from production plan: ' + error.message)
    }
  }

  async truncatePlans() {
    try {
      await this.db.execute('DELETE FROM production_plan_fg')
      await this.db.execute('DELETE FROM production_plan_sub_assembly')
      await this.db.execute('DELETE FROM production_plan_raw_material')
      await this.db.execute('DELETE FROM production_plan')
    } catch (error) {
      throw error
    }
  }
}
