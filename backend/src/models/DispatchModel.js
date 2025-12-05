class DispatchModel {
  constructor(db) {
    this.db = db
  }

  // ============= DISPATCH ORDERS =============

  async createDispatchOrder(data) {
    try {
      const dispatch_id = `DISP-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO dispatch_order 
        (dispatch_id, sales_order_id, dispatch_date, expected_delivery_date, status, shipping_address, carrier)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [dispatch_id, data.sales_order_id, data.dispatch_date, data.expected_delivery_date,
         data.status || 'pending', data.shipping_address, data.carrier]
      )
      return { dispatch_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getDispatchOrders(filters = {}) {
    try {
      let query = `SELECT d.*, s.so_id as sales_order_no, c.name as customer_name
                   FROM dispatch_order d
                   LEFT JOIN sales_order s ON d.sales_order_id = s.sales_order_id
                   LEFT JOIN customer c ON s.customer_id = c.customer_id
                   WHERE 1=1`
      const params = []

      if (filters.status) {
        query += ' AND d.status = ?'
        params.push(filters.status)
      }
      if (filters.search) {
        query += ' AND (d.dispatch_id LIKE ? OR s.so_id LIKE ? OR c.name LIKE ?)'
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`)
      }
      if (filters.date_from) {
        query += ' AND DATE(d.dispatch_date) >= ?'
        params.push(filters.date_from)
      }
      if (filters.date_to) {
        query += ' AND DATE(d.dispatch_date) <= ?'
        params.push(filters.date_to)
      }

      query += ' ORDER BY d.dispatch_date DESC'
      const [results] = await this.db.query(query, params)
      return results
    } catch (error) {
      throw error
    }
  }

  async getDispatchOrder(dispatch_id) {
    try {
      const [results] = await this.db.query(
        `SELECT d.*, s.so_id as sales_order_no, c.name as customer_name
         FROM dispatch_order d
         LEFT JOIN sales_order s ON d.sales_order_id = s.sales_order_id
         LEFT JOIN customer c ON s.customer_id = c.customer_id
         WHERE d.dispatch_id = ?`,
        [dispatch_id]
      )
      return results.length > 0 ? results[0] : null
    } catch (error) {
      throw error
    }
  }

  async updateDispatchOrder(dispatch_id, data) {
    try {
      let query = 'UPDATE dispatch_order SET '
      const params = []
      const fields = []

      Object.entries(data).forEach(([key, value]) => {
        fields.push(`${key} = ?`)
        params.push(value)
      })

      query += fields.join(', ')
      query += ', updated_at = CURRENT_TIMESTAMP WHERE dispatch_id = ?'
      params.push(dispatch_id)

      const [result] = await this.db.query(query, params)
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  // ============= DISPATCH ITEMS =============

  async addDispatchItem(data) {
    try {
      const [result] = await this.db.query(
        `INSERT INTO dispatch_item 
        (dispatch_id, item_code, quantity, packed_quantity, batch_number)
        VALUES (?, ?, ?, ?, ?)`,
        [data.dispatch_id, data.item_code, data.quantity, data.packed_quantity || data.quantity, data.batch_number]
      )
      return { item_id: result.insertId, ...data }
    } catch (error) {
      throw error
    }
  }

  async getDispatchItems(dispatch_id) {
    try {
      const [results] = await this.db.query(
        `SELECT di.*, i.name as item_name, i.unit as item_unit
         FROM dispatch_item di
         LEFT JOIN item i ON di.item_code = i.item_code
         WHERE di.dispatch_id = ?`,
        [dispatch_id]
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async updateDispatchItem(item_id, data) {
    try {
      let query = 'UPDATE dispatch_item SET '
      const params = []
      const fields = []

      Object.entries(data).forEach(([key, value]) => {
        fields.push(`${key} = ?`)
        params.push(value)
      })

      query += fields.join(', ')
      query += ' WHERE id = ?'
      params.push(item_id)

      const [result] = await this.db.query(query, params)
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  async deleteDispatchItem(item_id) {
    try {
      const [result] = await this.db.query(
        'DELETE FROM dispatch_item WHERE id = ?',
        [item_id]
      )
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  // ============= DELIVERY CHALLANS =============

  async createChallan(data) {
    try {
      const challan_id = `CHL-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO delivery_challan 
        (challan_id, dispatch_id, challan_date, status, signed_by)
        VALUES (?, ?, ?, ?, ?)`,
        [challan_id, data.dispatch_id, data.challan_date, data.status || 'generated', data.signed_by]
      )
      return { challan_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getChallan(challan_id) {
    try {
      const [results] = await this.db.query(
        `SELECT c.*, d.dispatch_id, d.sales_order_id, d.shipping_address
         FROM delivery_challan c
         LEFT JOIN dispatch_order d ON c.dispatch_id = d.dispatch_id
         WHERE c.challan_id = ?`,
        [challan_id]
      )
      return results.length > 0 ? results[0] : null
    } catch (error) {
      throw error
    }
  }

  async getChallansByDispatch(dispatch_id) {
    try {
      const [results] = await this.db.query(
        `SELECT * FROM delivery_challan WHERE dispatch_id = ? ORDER BY challan_date DESC`,
        [dispatch_id]
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async updateChallanStatus(challan_id, status) {
    try {
      const [result] = await this.db.query(
        'UPDATE delivery_challan SET status = ? WHERE challan_id = ?',
        [status, challan_id]
      )
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  // ============= SHIPMENT TRACKING =============

  async createTracking(data) {
    try {
      const tracking_id = `TRK-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO shipment_tracking 
        (tracking_id, dispatch_id, current_location, status, update_date)
        VALUES (?, ?, ?, ?, ?)`,
        [tracking_id, data.dispatch_id, data.current_location, data.status, data.update_date || new Date()]
      )
      return { tracking_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getTracking(dispatch_id) {
    try {
      const [results] = await this.db.query(
        `SELECT t.*, d.dispatch_id, d.tracking_number as dispatch_tracking_number
         FROM shipment_tracking t
         LEFT JOIN dispatch_order d ON t.dispatch_id = d.dispatch_id
         WHERE t.dispatch_id = ?
         ORDER BY t.update_date DESC`,
        [dispatch_id]
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getLatestTracking(dispatch_id) {
    try {
      const [results] = await this.db.query(
        `SELECT * FROM shipment_tracking WHERE dispatch_id = ? ORDER BY update_date DESC LIMIT 1`,
        [dispatch_id]
      )
      return results.length > 0 ? results[0] : null
    } catch (error) {
      throw error
    }
  }

  async updateTracking(tracking_id, data) {
    try {
      let query = 'UPDATE shipment_tracking SET '
      const params = []
      const fields = []

      Object.entries(data).forEach(([key, value]) => {
        fields.push(`${key} = ?`)
        params.push(value)
      })

      query += fields.join(', ')
      query += ' WHERE tracking_id = ?'
      params.push(tracking_id)

      const [result] = await this.db.query(query, params)
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  // ============= DISPATCH ANALYTICS =============

  async getDispatchDashboard() {
    try {
      const [stats] = await this.db.query(
        `SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready,
          SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
         FROM dispatch_order`
      )

      const [overdue] = await this.db.query(
        `SELECT COUNT(*) as overdue_orders
         FROM dispatch_order
         WHERE status != 'delivered' AND status != 'cancelled' AND expected_delivery_date < CURDATE()`
      )

      return {
        summary: stats[0] || {},
        overdue: overdue[0]?.overdue_orders || 0
      }
    } catch (error) {
      throw error
    }
  }

  async getDispatchPerformance(date_from, date_to) {
    try {
      const [results] = await this.db.query(
        `SELECT 
          DATE(dispatch_date) as dispatch_date,
          COUNT(*) as orders_dispatched,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
         FROM dispatch_order
         WHERE dispatch_date BETWEEN ? AND ?
         GROUP BY DATE(dispatch_date)
         ORDER BY dispatch_date DESC`,
        [date_from, date_to]
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getDeliveryStatusReport() {
    try {
      const [results] = await this.db.query(
        `SELECT 
          d.dispatch_id,
          d.sales_order_id,
          s.so_id as sales_order_no,
          c.name as customer_name,
          d.dispatch_date,
          d.expected_delivery_date,
          d.shipped_date,
          d.status,
          DATEDIFF(COALESCE(d.shipped_date, CURDATE()), d.dispatch_date) as days_in_transit,
          CASE 
            WHEN d.status = 'delivered' AND d.shipped_date <= d.expected_delivery_date THEN 'On-time'
            WHEN d.status = 'delivered' AND d.shipped_date > d.expected_delivery_date THEN 'Late'
            WHEN d.status != 'delivered' AND CURDATE() > d.expected_delivery_date THEN 'Overdue'
            ELSE 'In Progress'
          END as delivery_status
         FROM dispatch_order d
         LEFT JOIN sales_order s ON d.sales_order_id = s.sales_order_id
         LEFT JOIN customer c ON s.customer_id = c.customer_id
         ORDER BY d.dispatch_date DESC`
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getCarrierPerformance(date_from, date_to) {
    try {
      const [results] = await this.db.query(
        `SELECT 
          carrier,
          COUNT(*) as shipments,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN shipped_date <= expected_delivery_date THEN 1 ELSE 0 END) as on_time,
          ROUND(SUM(CASE WHEN shipped_date <= expected_delivery_date THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as on_time_percentage
         FROM dispatch_order
         WHERE dispatch_date BETWEEN ? AND ? AND carrier IS NOT NULL
         GROUP BY carrier
         ORDER BY shipments DESC`,
        [date_from, date_to]
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getAverageDeliveryTime(date_from, date_to) {
    try {
      const [results] = await this.db.query(
        `SELECT 
          AVG(DATEDIFF(shipped_date, dispatch_date)) as avg_transit_time,
          MIN(DATEDIFF(shipped_date, dispatch_date)) as min_transit_time,
          MAX(DATEDIFF(shipped_date, dispatch_date)) as max_transit_time,
          COUNT(*) as total_shipments
         FROM dispatch_order
         WHERE shipped_date IS NOT NULL AND dispatch_date BETWEEN ? AND ?`,
        [date_from, date_to]
      )
      return results[0] || {}
    } catch (error) {
      throw error
    }
  }
}

export default DispatchModel