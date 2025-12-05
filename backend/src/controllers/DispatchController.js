class DispatchController {
  constructor(dispatchModel) {
    this.dispatchModel = dispatchModel
  }

  // ============= DISPATCH ORDERS =============

  async createDispatchOrder(req, res) {
    try {
      const { sales_order_id, dispatch_date, expected_delivery_date, shipping_address, carrier } = req.body

      // Validation
      if (!sales_order_id || !dispatch_date || !expected_delivery_date || !shipping_address) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: sales_order_id, dispatch_date, expected_delivery_date, shipping_address'
        })
      }

      const dispatchOrder = await this.dispatchModel.createDispatchOrder({
        sales_order_id,
        dispatch_date,
        expected_delivery_date,
        shipping_address,
        carrier
      })

      res.status(201).json({
        success: true,
        message: 'Dispatch order created successfully',
        data: dispatchOrder
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating dispatch order',
        error: error.message
      })
    }
  }

  async getDispatchOrders(req, res) {
    try {
      const { status, search, date_from, date_to } = req.query

      const orders = await this.dispatchModel.getDispatchOrders({
        status,
        search,
        date_from,
        date_to
      })

      res.status(200).json({
        success: true,
        data: orders,
        count: orders.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching dispatch orders',
        error: error.message
      })
    }
  }

  async getDispatchOrder(req, res) {
    try {
      const { dispatch_id } = req.params

      const order = await this.dispatchModel.getDispatchOrder(dispatch_id)

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Dispatch order not found'
        })
      }

      res.status(200).json({
        success: true,
        data: order
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching dispatch order',
        error: error.message
      })
    }
  }

  async updateDispatchOrder(req, res) {
    try {
      const { dispatch_id } = req.params
      const data = req.body

      const success = await this.dispatchModel.updateDispatchOrder(dispatch_id, data)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Dispatch order not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Dispatch order updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating dispatch order',
        error: error.message
      })
    }
  }

  // ============= DISPATCH ITEMS =============

  async addDispatchItem(req, res) {
    try {
      const { dispatch_id, item_code, quantity, packed_quantity, batch_number } = req.body

      // Validation
      if (!dispatch_id || !item_code || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: dispatch_id, item_code, quantity'
        })
      }

      const item = await this.dispatchModel.addDispatchItem({
        dispatch_id,
        item_code,
        quantity,
        packed_quantity,
        batch_number
      })

      res.status(201).json({
        success: true,
        message: 'Dispatch item added successfully',
        data: item
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error adding dispatch item',
        error: error.message
      })
    }
  }

  async getDispatchItems(req, res) {
    try {
      const { dispatch_id } = req.params

      if (!dispatch_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameter: dispatch_id'
        })
      }

      const items = await this.dispatchModel.getDispatchItems(dispatch_id)

      res.status(200).json({
        success: true,
        data: items,
        count: items.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching dispatch items',
        error: error.message
      })
    }
  }

  async updateDispatchItem(req, res) {
    try {
      const { item_id } = req.params
      const data = req.body

      const success = await this.dispatchModel.updateDispatchItem(item_id, data)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Item updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating item',
        error: error.message
      })
    }
  }

  async deleteDispatchItem(req, res) {
    try {
      const { item_id } = req.params

      const success = await this.dispatchModel.deleteDispatchItem(item_id)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Item deleted successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting item',
        error: error.message
      })
    }
  }

  // ============= DELIVERY CHALLANS =============

  async createChallan(req, res) {
    try {
      const { dispatch_id, challan_date, signed_by } = req.body

      // Validation
      if (!dispatch_id || !challan_date) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: dispatch_id, challan_date'
        })
      }

      const challan = await this.dispatchModel.createChallan({
        dispatch_id,
        challan_date,
        signed_by
      })

      res.status(201).json({
        success: true,
        message: 'Delivery challan created successfully',
        data: challan
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating challan',
        error: error.message
      })
    }
  }

  async getChallan(req, res) {
    try {
      const { challan_id } = req.params

      const challan = await this.dispatchModel.getChallan(challan_id)

      if (!challan) {
        return res.status(404).json({
          success: false,
          message: 'Challan not found'
        })
      }

      res.status(200).json({
        success: true,
        data: challan
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching challan',
        error: error.message
      })
    }
  }

  async getChallansByDispatch(req, res) {
    try {
      const { dispatch_id } = req.params

      if (!dispatch_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameter: dispatch_id'
        })
      }

      const challans = await this.dispatchModel.getChallansByDispatch(dispatch_id)

      res.status(200).json({
        success: true,
        data: challans,
        count: challans.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching challans',
        error: error.message
      })
    }
  }

  async updateChallanStatus(req, res) {
    try {
      const { challan_id } = req.params
      const { status } = req.body

      if (!challan_id || !status) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: challan_id, status'
        })
      }

      const success = await this.dispatchModel.updateChallanStatus(challan_id, status)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Challan not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Challan status updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating challan status',
        error: error.message
      })
    }
  }

  // ============= SHIPMENT TRACKING =============

  async createTracking(req, res) {
    try {
      const { dispatch_id, current_location, status, update_date } = req.body

      // Validation
      if (!dispatch_id || !current_location || !status) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: dispatch_id, current_location, status'
        })
      }

      const tracking = await this.dispatchModel.createTracking({
        dispatch_id,
        current_location,
        status,
        update_date
      })

      res.status(201).json({
        success: true,
        message: 'Tracking record created successfully',
        data: tracking
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating tracking record',
        error: error.message
      })
    }
  }

  async getTracking(req, res) {
    try {
      const { dispatch_id } = req.params

      if (!dispatch_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameter: dispatch_id'
        })
      }

      const tracking = await this.dispatchModel.getTracking(dispatch_id)

      res.status(200).json({
        success: true,
        data: tracking,
        count: tracking.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching tracking records',
        error: error.message
      })
    }
  }

  async getLatestTracking(req, res) {
    try {
      const { dispatch_id } = req.params

      if (!dispatch_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameter: dispatch_id'
        })
      }

      const tracking = await this.dispatchModel.getLatestTracking(dispatch_id)

      res.status(200).json({
        success: true,
        data: tracking
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching latest tracking',
        error: error.message
      })
    }
  }

  async updateTracking(req, res) {
    try {
      const { tracking_id } = req.params
      const data = req.body

      const success = await this.dispatchModel.updateTracking(tracking_id, data)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Tracking record not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Tracking record updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating tracking record',
        error: error.message
      })
    }
  }

  // ============= DISPATCH ANALYTICS =============

  async getDashboard(req, res) {
    try {
      const dashboard = await this.dispatchModel.getDispatchDashboard()

      res.status(200).json({
        success: true,
        data: dashboard
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching dashboard',
        error: error.message
      })
    }
  }

  async getDispatchPerformance(req, res) {
    try {
      const { date_from, date_to } = req.query

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: date_from, date_to'
        })
      }

      const performance = await this.dispatchModel.getDispatchPerformance(date_from, date_to)

      res.status(200).json({
        success: true,
        data: performance,
        count: performance.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching performance report',
        error: error.message
      })
    }
  }

  async getDeliveryStatus(req, res) {
    try {
      const report = await this.dispatchModel.getDeliveryStatusReport()

      res.status(200).json({
        success: true,
        data: report,
        count: report.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching delivery status report',
        error: error.message
      })
    }
  }

  async getCarrierPerformance(req, res) {
    try {
      const { date_from, date_to } = req.query

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: date_from, date_to'
        })
      }

      const performance = await this.dispatchModel.getCarrierPerformance(date_from, date_to)

      res.status(200).json({
        success: true,
        data: performance,
        count: performance.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching carrier performance',
        error: error.message
      })
    }
  }

  async getAverageDeliveryTime(req, res) {
    try {
      const { date_from, date_to } = req.query

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: date_from, date_to'
        })
      }

      const times = await this.dispatchModel.getAverageDeliveryTime(date_from, date_to)

      res.status(200).json({
        success: true,
        data: times
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching delivery times',
        error: error.message
      })
    }
  }
}

export default DispatchController