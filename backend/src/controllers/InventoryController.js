import InventoryModel from '../models/InventoryModel.js'

class InventoryController {
  constructor(db) {
    this.inventoryModel = new InventoryModel(db)
  }

  // ============================================================================
  // STEP 1: ALLOCATE MATERIALS FOR WORK ORDER
  // ============================================================================
  async allocateMaterialsForWorkOrder(req, res) {
    try {
      const { work_order_id, materials } = req.body

      if (!work_order_id || !materials || materials.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'work_order_id and materials array are required'
        })
      }

      const allocations = await this.inventoryModel.allocateMaterialsForWorkOrder(
        work_order_id,
        materials,
        req.user?.username || 'system'
      )

      res.status(201).json({
        success: true,
        message: `${allocations.length} materials allocated successfully`,
        data: allocations
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error allocating materials',
        error: error.message
      })
    }
  }

  // ============================================================================
  // STEP 2: ISSUE MATERIALS TO WIP
  // ============================================================================
  async issueMaterialsToWIP(req, res) {
    try {
      const { work_order_id, materials } = req.body

      if (!work_order_id || !materials || materials.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'work_order_id and materials array are required'
        })
      }

      const issued = await this.inventoryModel.issueMaterialsToWIP(
        work_order_id,
        materials,
        req.user?.username || 'system'
      )

      res.status(201).json({
        success: true,
        message: `${issued.length} materials issued to WIP successfully`,
        data: issued
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error issuing materials to WIP',
        error: error.message
      })
    }
  }

  // ============================================================================
  // STEP 3: TRACK MATERIAL CONSUMPTION
  // ============================================================================
  async trackMaterialConsumption(req, res) {
    try {
      const { job_card_id, work_order_id, produced_qty } = req.body

      if (!job_card_id || !work_order_id || produced_qty === undefined) {
        return res.status(400).json({
          success: false,
          message: 'job_card_id, work_order_id and produced_qty are required'
        })
      }

      const consumptions = await this.inventoryModel.trackMaterialConsumption(
        job_card_id,
        work_order_id,
        produced_qty,
        req.user?.username || 'system'
      )

      res.status(201).json({
        success: true,
        message: `Material consumption tracked for ${consumptions.length} items`,
        data: consumptions
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error tracking material consumption',
        error: error.message
      })
    }
  }

  // ============================================================================
  // STEP 4: RETURN MATERIALS FROM WIP
  // ============================================================================
  async returnMaterialFromWIP(req, res) {
    try {
      const { work_order_id, item_code, return_qty, target_warehouse, reason } = req.body

      if (!work_order_id || !item_code || !return_qty || !target_warehouse) {
        return res.status(400).json({
          success: false,
          message: 'work_order_id, item_code, return_qty and target_warehouse are required'
        })
      }

      await this.inventoryModel.returnMaterialFromWIP(
        work_order_id,
        item_code,
        return_qty,
        target_warehouse,
        reason,
        req.user?.username || 'system'
      )

      res.status(200).json({
        success: true,
        message: 'Materials returned from WIP to store'
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error returning materials from WIP',
        error: error.message
      })
    }
  }

  // Record Scrap
  async recordMaterialScrap(req, res) {
    try {
      const { work_order_id, job_card_id, item_code, scrap_qty, reason } = req.body
      if (!work_order_id || !item_code || !scrap_qty) {
        return res.status(400).json({ success: false, message: 'Missing required fields' })
      }

      await this.inventoryModel.recordMaterialScrap(
        work_order_id,
        job_card_id || null,
        item_code,
        scrap_qty,
        reason,
        req.user?.username || 'system'
      )

      res.status(200).json({ success: true, message: 'Scrap recorded successfully' })
    } catch (error) {
      res.status(400).json({ success: false, message: 'Error recording scrap', error: error.message })
    }
  }

  // ============================================================================
  // REPORTS: Get allocation details
  // ============================================================================
  async getMaterialAllocationForWorkOrder(req, res) {
    try {
      const { work_order_id } = req.params

      if (!work_order_id) {
        return res.status(400).json({
          success: false,
          message: 'work_order_id is required'
        })
      }

      const allocations = await this.inventoryModel.getMaterialAllocationForWorkOrder(work_order_id)

      res.status(200).json({
        success: true,
        data: allocations
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error fetching material allocation',
        error: error.message
      })
    }
  }

  // ============================================================================
  // REPORTS: Get waste report
  // ============================================================================
  async getMaterialWasteReport(req, res) {
    try {
      const { work_order_id } = req.params

      if (!work_order_id) {
        return res.status(400).json({
          success: false,
          message: 'work_order_id is required'
        })
      }

      const report = await this.inventoryModel.getMaterialWasteReport(work_order_id)

      const totalAllocated = report.reduce((sum, item) => sum + item.allocated_qty, 0)
      const totalWasted = report.reduce((sum, item) => sum + item.wasted_qty, 0)
      const wastePercentage = totalAllocated > 0 ? ((totalWasted / totalAllocated) * 100).toFixed(2) : 0

      res.status(200).json({
        success: true,
        data: {
          items: report,
          summary: {
            total_allocated: totalAllocated,
            total_wasted: totalWasted,
            waste_percentage: wastePercentage
          }
        }
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error fetching waste report',
        error: error.message
      })
    }
  }

  // ============================================================================
  // REPORTS: Get audit log
  // ============================================================================
  async getMaterialDeductionAuditLog(req, res) {
    try {
      const { work_order_id } = req.params

      if (!work_order_id) {
        return res.status(400).json({
          success: false,
          message: 'work_order_id is required'
        })
      }

      const logs = await this.inventoryModel.getMaterialDeductionAuditLog(work_order_id)

      res.status(200).json({
        success: true,
        data: logs
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error fetching audit log',
        error: error.message
      })
    }
  }

  async getMaterialConsumptionByOperation(req, res) {
    try {
      const { work_order_id } = req.params

      if (!work_order_id) {
        return res.status(400).json({
          success: false,
          message: 'work_order_id is required'
        })
      }

      const consumptions = await this.inventoryModel.getMaterialConsumptionByOperation(work_order_id)

      res.status(200).json({
        success: true,
        data: consumptions
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error fetching material consumption by operation',
        error: error.message
      })
    }
  }

  // ============================================================================
  // STEP 5: FINALIZE DEDUCTION
  // ============================================================================
  async finalizeWorkOrderMaterials(req, res) {
    try {
      const { work_order_id } = req.params

      if (!work_order_id) {
        return res.status(400).json({
          success: false,
          message: 'work_order_id is required'
        })
      }

      const results = await this.inventoryModel.finalizeWorkOrderMaterials(
        work_order_id,
        req.user?.username || 'system'
      )

      res.status(200).json({
        success: true,
        message: 'Work order materials finalized successfully',
        data: results
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error finalizing work order materials',
        error: error.message
      })
    }
  }
}

export default InventoryController
