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
  // STEP 2: TRACK MATERIAL CONSUMPTION
  // ============================================================================
  async trackMaterialConsumption(req, res) {
    try {
      const { job_card_id, work_order_id, materials } = req.body

      if (!job_card_id || !work_order_id || !materials || materials.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'job_card_id, work_order_id and materials array are required'
        })
      }

      const consumptions = await this.inventoryModel.trackMaterialConsumption(
        job_card_id,
        work_order_id,
        materials,
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
  // STEP 3: FINALIZE WORK ORDER MATERIALS
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

      const updates = await this.inventoryModel.finalizeWorkOrderMaterials(
        work_order_id,
        req.user?.username || 'system'
      )

      res.status(200).json({
        success: true,
        message: 'Work order materials finalized and deducted from stock',
        data: {
          total_items: updates.length,
          details: updates
        }
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error finalizing work order materials',
        error: error.message
      })
    }
  }

  // ============================================================================
  // STEP 4: RETURN MATERIALS
  // ============================================================================
  async returnMaterialToInventory(req, res) {
    try {
      const {
        work_order_id,
        job_card_id,
        item_code,
        warehouse_id,
        return_qty,
        reason
      } = req.body

      if (!work_order_id || !item_code || !warehouse_id || !return_qty) {
        return res.status(400).json({
          success: false,
          message: 'work_order_id, item_code, warehouse_id and return_qty are required'
        })
      }

      const result = await this.inventoryModel.returnMaterialToInventory(
        work_order_id,
        job_card_id,
        item_code,
        warehouse_id,
        return_qty,
        reason,
        req.user?.username || 'system'
      )

      res.status(200).json({
        success: true,
        message: 'Materials returned to inventory',
        data: result
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error returning materials',
        error: error.message
      })
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
}

export default InventoryController
