class BuyingAnalyticsModel {
  /**
   * Get PO summary statistics
   */
  static async getPOSummary(db) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_pos,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_count,
          SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted_count,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
          ROUND(SUM(total_value), 2) as total_value,
          ROUND(AVG(total_value), 2) as avg_value,
          ROUND(MIN(total_value), 2) as min_value,
          ROUND(MAX(total_value), 2) as max_value
        FROM purchase_orders
        WHERE deleted_at IS NULL
      `;
      const result = await db.query(query);
      return result[0][0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get PO trends by date range
   */
  static async getPOTrends(db, startDate, endDate) {
    try {
      const query = `
        SELECT 
          DATE(order_date) as date,
          COUNT(*) as po_count,
          ROUND(SUM(total_value), 2) as total_value,
          ROUND(AVG(total_value), 2) as avg_value
        FROM purchase_orders
        WHERE order_date BETWEEN ? AND ? AND deleted_at IS NULL
        GROUP BY DATE(order_date)
        ORDER BY date ASC
      `;
      const result = await db.query(query, [startDate, endDate]);
      return result[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get top suppliers by PO value
   */
  static async getTopSuppliers(db, limit = 10) {
    try {
      const query = `
        SELECT 
          s.supplier_id,
          s.name as supplier_name,
          COUNT(po.po_id) as po_count,
          ROUND(SUM(po.total_value), 2) as total_value,
          ROUND(AVG(po.total_value), 2) as avg_po_value,
          ROUND(
            (COUNT(CASE WHEN po.status = 'completed' THEN 1 END) / COUNT(*)) * 100,
            2
          ) as completion_rate
        FROM suppliers s
        LEFT JOIN purchase_orders po ON s.supplier_id = po.supplier_id AND po.deleted_at IS NULL
        WHERE s.deleted_at IS NULL
        GROUP BY s.supplier_id, s.name
        ORDER BY total_value DESC
        LIMIT ?
      `;
      const result = await db.query(query, [limit]);
      return result[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get supplier performance metrics
   */
  static async getSupplierPerformance(db, supplierId) {
    try {
      const query = `
        SELECT 
          s.supplier_id,
          s.name as supplier_name,
          COUNT(DISTINCT po.po_id) as total_pos,
          COUNT(DISTINCT CASE WHEN po.status = 'completed' THEN po.po_id END) as completed_pos,
          COUNT(DISTINCT CASE WHEN po.status = 'draft' THEN po.po_id END) as draft_pos,
          ROUND(
            (COUNT(DISTINCT CASE WHEN po.status = 'completed' THEN po.po_id END) / 
             COUNT(DISTINCT po.po_id)) * 100,
            2
          ) as completion_rate,
          COUNT(DISTINCT pr.grn_id) as grn_count,
          ROUND(
            (COUNT(DISTINCT CASE WHEN pr.status = 'accepted' THEN pr.grn_id END) / 
             NULLIF(COUNT(DISTINCT pr.grn_id), 0)) * 100,
            2
          ) as acceptance_rate,
          ROUND(SUM(po.total_value), 2) as total_po_value,
          ROUND(AVG(po.total_value), 2) as avg_po_value,
          DATEDIFF(NOW(), MAX(po.order_date)) as days_since_last_po,
          s.rating
        FROM suppliers s
        LEFT JOIN purchase_orders po ON s.supplier_id = po.supplier_id AND po.deleted_at IS NULL
        LEFT JOIN purchase_receipts pr ON po.po_id = pr.po_id AND pr.deleted_at IS NULL
        WHERE s.supplier_id = ? AND s.deleted_at IS NULL
        GROUP BY s.supplier_id, s.name, s.rating
      `;
      const result = await db.query(query, [supplierId]);
      return result[0][0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get item-wise PO summary
   */
  static async getItemPOSummary(db, limit = 20) {
    try {
      const query = `
        SELECT 
          i.item_id,
          i.name as item_name,
          i.item_code,
          COUNT(DISTINCT po.po_id) as po_count,
          ROUND(SUM(pol.quantity), 2) as total_qty,
          ROUND(AVG(pol.rate), 2) as avg_rate,
          ROUND(MIN(pol.rate), 2) as min_rate,
          ROUND(MAX(pol.rate), 2) as max_rate,
          ROUND(SUM(pol.quantity * pol.rate), 2) as total_value
        FROM items i
        LEFT JOIN purchase_order_items pol ON i.item_id = pol.item_id
        LEFT JOIN purchase_orders po ON pol.po_id = po.po_id AND po.deleted_at IS NULL
        WHERE i.deleted_at IS NULL
        GROUP BY i.item_id, i.name, i.item_code
        HAVING po_count > 0
        ORDER BY total_value DESC
        LIMIT ?
      `;
      const result = await db.query(query, [limit]);
      return result[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get receipt analytics
   */
  static async getReceiptAnalytics(db, startDate, endDate) {
    try {
      const query = `
        SELECT 
          DATE(receipt_date) as date,
          COUNT(*) as grn_count,
          SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_count,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
          ROUND(
            (SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) / COUNT(*)) * 100,
            2
          ) as acceptance_rate
        FROM purchase_receipts
        WHERE receipt_date BETWEEN ? AND ? AND deleted_at IS NULL
        GROUP BY DATE(receipt_date)
        ORDER BY date ASC
      `;
      const result = await db.query(query, [startDate, endDate]);
      return result[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get invoice payment analytics
   */
  static async getInvoicePaymentAnalytics(db) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_invoices,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_count,
          SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted_count,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
          ROUND(SUM(CASE WHEN status = 'paid' THEN net_amount ELSE 0 END), 2) as paid_amount,
          ROUND(SUM(CASE WHEN status IN ('draft', 'submitted') THEN net_amount ELSE 0 END), 2) as pending_amount,
          ROUND(AVG(net_amount), 2) as avg_invoice_value,
          ROUND(SUM(net_amount), 2) as total_invoice_value,
          ROUND(
            AVG(DATEDIFF(
              CASE WHEN payment_date IS NOT NULL THEN payment_date ELSE NOW() END,
              invoice_date
            )),
            2
          ) as avg_days_to_pay
        FROM purchase_invoices
        WHERE deleted_at IS NULL
      `;
      const result = await db.query(query);
      return result[0][0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get aging analysis (invoices not yet paid)
   */
  static async getAgingAnalysis(db) {
    try {
      const query = `
        SELECT 
          SUM(CASE WHEN DATEDIFF(NOW(), invoice_date) <= 30 THEN net_amount ELSE 0 END) as current,
          SUM(CASE WHEN DATEDIFF(NOW(), invoice_date) > 30 AND DATEDIFF(NOW(), invoice_date) <= 60 THEN net_amount ELSE 0 END) as thirty_to_sixty,
          SUM(CASE WHEN DATEDIFF(NOW(), invoice_date) > 60 AND DATEDIFF(NOW(), invoice_date) <= 90 THEN net_amount ELSE 0 END) as sixty_to_ninety,
          SUM(CASE WHEN DATEDIFF(NOW(), invoice_date) > 90 THEN net_amount ELSE 0 END) as above_ninety,
          ROUND(SUM(net_amount), 2) as total_pending
        FROM purchase_invoices
        WHERE status IN ('draft', 'submitted') AND deleted_at IS NULL
      `;
      const result = await db.query(query);
      return result[0][0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get cost analysis by supplier and period
   */
  static async getCostAnalysis(db, periodType = 'month') {
    try {
      let dateFormat;
      if (periodType === 'month') {
        dateFormat = '%Y-%m';
      } else if (periodType === 'quarter') {
        dateFormat = '%Y-Q';
      } else {
        dateFormat = '%Y';
      }

      const query = `
        SELECT 
          DATE_FORMAT(po.order_date, '${dateFormat}') as period,
          s.supplier_id,
          s.name as supplier_name,
          COUNT(po.po_id) as po_count,
          ROUND(SUM(po.total_value), 2) as period_value,
          ROUND(AVG(po.total_value), 2) as avg_po_value
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.supplier_id
        WHERE po.deleted_at IS NULL AND s.deleted_at IS NULL
        GROUP BY DATE_FORMAT(po.order_date, '${dateFormat}'), s.supplier_id, s.name
        ORDER BY period DESC, period_value DESC
      `;
      const result = await db.query(query);
      return result[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get purchase by category/item group
   */
  static async getPurchaseByCategory(db) {
    try {
      const query = `
        SELECT 
          ig.group_id,
          ig.name as category_name,
          COUNT(DISTINCT po.po_id) as po_count,
          COUNT(DISTINCT pol.item_id) as item_count,
          ROUND(SUM(pol.quantity), 2) as total_qty,
          ROUND(SUM(pol.quantity * pol.rate), 2) as total_value,
          ROUND(AVG(pol.rate), 2) as avg_rate
        FROM item_groups ig
        LEFT JOIN items i ON ig.group_id = i.group_id AND i.deleted_at IS NULL
        LEFT JOIN purchase_order_items pol ON i.item_id = pol.item_id
        LEFT JOIN purchase_orders po ON pol.po_id = po.po_id AND po.deleted_at IS NULL
        WHERE ig.deleted_at IS NULL
        GROUP BY ig.group_id, ig.name
        HAVING po_count > 0
        ORDER BY total_value DESC
      `;
      const result = await db.query(query);
      return result[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get overdue POs
   */
  static async getOverduePOs(db) {
    try {
      const query = `
        SELECT 
          po.po_id,
          po.po_number,
          s.name as supplier_name,
          po.expected_date,
          DATEDIFF(NOW(), po.expected_date) as days_overdue,
          po.status,
          ROUND(po.total_value, 2) as po_value
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.supplier_id
        WHERE po.expected_date < NOW() 
        AND po.status NOT IN ('completed', 'cancelled')
        AND po.deleted_at IS NULL
        ORDER BY po.expected_date ASC
      `;
      const result = await db.query(query);
      return result[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get pending GRNs against POs
   */
  static async getPendingGRNs(db) {
    try {
      const query = `
        SELECT 
          po.po_id,
          po.po_number,
          s.name as supplier_name,
          po.order_date,
          ROUND(po.total_value, 2) as po_value,
          COUNT(DISTINCT pr.grn_id) as grn_count,
          ROUND(
            SUM(CASE WHEN pol.quantity > COALESCE(pr_items.total_received, 0) 
              THEN pol.quantity - COALESCE(pr_items.total_received, 0) 
              ELSE 0 END),
            2
          ) as pending_qty
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.supplier_id
        JOIN purchase_order_items pol ON po.po_id = pol.po_id
        LEFT JOIN purchase_receipts pr ON po.po_id = pr.po_id AND pr.deleted_at IS NULL
        LEFT JOIN (
          SELECT po_id, item_id, SUM(received_qty) as total_received
          FROM purchase_receipt_items
          GROUP BY po_id, item_id
        ) pr_items ON po.po_id = pr_items.po_id AND pol.item_id = pr_items.item_id
        WHERE po.status IN ('submitted', 'to_receive', 'partially_received')
        AND po.deleted_at IS NULL
        GROUP BY po.po_id, po.po_number, s.name, po.order_date, po.total_value
        ORDER BY po.order_date ASC
      `;
      const result = await db.query(query);
      return result[0];
    } catch (error) {
      throw error;
    }
  }
}

export default BuyingAnalyticsModel;