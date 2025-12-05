import BuyingAnalyticsModel from '../models/BuyingAnalyticsModel.js';

class BuyingAnalyticsController {
  /**
   * GET /api/buying/analytics/summary
   * Get overall buying module statistics
   */
  static async getSummary(req, res) {
    try {
      const { db } = req.app.locals;
      const summary = await BuyingAnalyticsModel.getPOSummary(db);
      const invoiceAnalytics = await BuyingAnalyticsModel.getInvoicePaymentAnalytics(db);
      
      res.json({
        success: true,
        data: {
          purchase_orders: summary,
          invoices: invoiceAnalytics
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching buying summary',
        error: error.message
      });
    }
  }

  /**
   * GET /api/buying/analytics/po-trends
   * Get PO trends over a date range
   */
  static async getPOTrends(req, res) {
    try {
      const { db } = req.app.locals;
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate query parameters are required'
        });
      }

      const trends = await BuyingAnalyticsModel.getPOTrends(db, startDate, endDate);
      
      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching PO trends',
        error: error.message
      });
    }
  }

  /**
   * GET /api/buying/analytics/top-suppliers
   * Get top suppliers by PO value
   */
  static async getTopSuppliers(req, res) {
    try {
      const { db } = req.app.locals;
      const limit = req.query.limit || 10;
      const suppliers = await BuyingAnalyticsModel.getTopSuppliers(db, limit);
      
      res.json({
        success: true,
        data: suppliers
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching top suppliers',
        error: error.message
      });
    }
  }

  /**
   * GET /api/buying/analytics/supplier/:supplierId
   * Get detailed performance metrics for a specific supplier
   */
  static async getSupplierPerformance(req, res) {
    try {
      const { db } = req.app.locals;
      const { supplierId } = req.params;
      
      if (!supplierId) {
        return res.status(400).json({
          success: false,
          message: 'Supplier ID is required'
        });
      }

      const performance = await BuyingAnalyticsModel.getSupplierPerformance(db, supplierId);
      
      if (!performance) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found'
        });
      }

      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching supplier performance',
        error: error.message
      });
    }
  }

  /**
   * GET /api/buying/analytics/items
   * Get item-wise PO summary
   */
  static async getItemPOSummary(req, res) {
    try {
      const { db } = req.app.locals;
      const limit = req.query.limit || 20;
      const items = await BuyingAnalyticsModel.getItemPOSummary(db, limit);
      
      res.json({
        success: true,
        data: items
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching item PO summary',
        error: error.message
      });
    }
  }

  /**
   * GET /api/buying/analytics/receipts
   * Get receipt (GRN) analytics
   */
  static async getReceiptAnalytics(req, res) {
    try {
      const { db } = req.app.locals;
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate query parameters are required'
        });
      }

      const analytics = await BuyingAnalyticsModel.getReceiptAnalytics(db, startDate, endDate);
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching receipt analytics',
        error: error.message
      });
    }
  }

  /**
   * GET /api/buying/analytics/invoices
   * Get invoice payment analytics
   */
  static async getInvoiceAnalytics(req, res) {
    try {
      const { db } = req.app.locals;
      const analytics = await BuyingAnalyticsModel.getInvoicePaymentAnalytics(db);
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching invoice analytics',
        error: error.message
      });
    }
  }

  /**
   * GET /api/buying/analytics/aging
   * Get aging analysis for unpaid invoices
   */
  static async getAgingAnalysis(req, res) {
    try {
      const { db } = req.app.locals;
      const aging = await BuyingAnalyticsModel.getAgingAnalysis(db);
      
      res.json({
        success: true,
        data: aging
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching aging analysis',
        error: error.message
      });
    }
  }

  /**
   * GET /api/buying/analytics/cost-analysis
   * Get cost analysis by supplier and period
   */
  static async getCostAnalysis(req, res) {
    try {
      const { db } = req.app.locals;
      const periodType = req.query.period || 'month'; // month, quarter, year
      const analysis = await BuyingAnalyticsModel.getCostAnalysis(db, periodType);
      
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching cost analysis',
        error: error.message
      });
    }
  }

  /**
   * GET /api/buying/analytics/category
   * Get purchase by category/item group
   */
  static async getPurchaseByCategory(req, res) {
    try {
      const { db } = req.app.locals;
      const data = await BuyingAnalyticsModel.getPurchaseByCategory(db);
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching purchase by category',
        error: error.message
      });
    }
  }

  /**
   * GET /api/buying/analytics/overdue-pos
   * Get overdue purchase orders
   */
  static async getOverduePOs(req, res) {
    try {
      const { db } = req.app.locals;
      const pos = await BuyingAnalyticsModel.getOverduePOs(db);
      
      res.json({
        success: true,
        data: pos
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching overdue POs',
        error: error.message
      });
    }
  }

  /**
   * GET /api/buying/analytics/pending-grns
   * Get pending GRNs
   */
  static async getPendingGRNs(req, res) {
    try {
      const { db } = req.app.locals;
      const grns = await BuyingAnalyticsModel.getPendingGRNs(db);
      
      res.json({
        success: true,
        data: grns
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching pending GRNs',
        error: error.message
      });
    }
  }
}

export default BuyingAnalyticsController;