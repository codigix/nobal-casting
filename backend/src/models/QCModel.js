class QCModel {
  constructor(db) {
    this.db = db
  }

  // ============= INSPECTIONS =============

  async createInspection(data) {
    try {
      const inspection_id = `INS-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO inspection_result 
        (inspection_id, reference_type, reference_id, checklist_id, inspection_date, inspector_id, 
         quantity_inspected, quantity_passed, quantity_rejected, result, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [inspection_id, data.reference_type, data.reference_id, data.checklist_id, 
         data.inspection_date, data.inspector_id, data.quantity_inspected, 
         data.quantity_passed, data.quantity_rejected, data.result || 'pass', data.remarks]
      )
      return { inspection_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getInspections(filters = {}) {
    try {
      let query = `SELECT ir.*, ic.name as checklist_name
                   FROM inspection_result ir
                   LEFT JOIN inspection_checklist ic ON ir.checklist_id = ic.checklist_id
                   WHERE 1=1`
      const params = []

      if (filters.result) {
        query += ' AND ir.result = ?'
        params.push(filters.result)
      }
      if (filters.date_from) {
        query += ' AND DATE(ir.inspection_date) >= ?'
        params.push(filters.date_from)
      }
      if (filters.date_to) {
        query += ' AND DATE(ir.inspection_date) <= ?'
        params.push(filters.date_to)
      }

      query += ' ORDER BY ir.inspection_date DESC'
      const [results] = await this.db.query(query, params)
      return results
    } catch (error) {
      throw error
    }
  }

  // ============= INSPECTION CHECKLISTS =============

  async createChecklist(data) {
    try {
      const checklist_id = `CK-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO inspection_checklist 
        (checklist_id, name, inspection_type, parameters, acceptance_criteria)
        VALUES (?, ?, ?, ?, ?)`,
        [checklist_id, data.name, data.inspection_type, data.parameters, data.acceptance_criteria]
      )
      return { checklist_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getChecklists() {
    try {
      const [results] = await this.db.query(
        'SELECT * FROM inspection_checklist ORDER BY name'
      )
      return results
    } catch (error) {
      throw error
    }
  }

  // ============= REJECTION REASONS =============

  async recordRejectionReason(data) {
    try {
      const reason_id = `REA-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO rejection_reason 
        (reason_id, inspection_id, reason_type, reason_description, quantity, severity, rework_possible)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [reason_id, data.inspection_id, data.reason_type, data.reason_description, 
         data.quantity, data.severity || 'major', data.rework_possible]
      )
      return { reason_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getRejectionReasons(inspection_id) {
    try {
      const [results] = await this.db.query(
        'SELECT * FROM rejection_reason WHERE inspection_id = ? ORDER BY severity DESC',
        [inspection_id]
      )
      return results
    } catch (error) {
      throw error
    }
  }

  // ============= CUSTOMER COMPLAINTS =============

  async createComplaint(data) {
    try {
      const complaint_id = `CMP-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO customer_complaint 
        (complaint_id, customer_id, complaint_date, complaint_type, description, priority, status, assigned_to_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [complaint_id, data.customer_id, data.complaint_date, data.complaint_type, 
         data.description, data.priority || 'medium', 'open', data.assigned_to_id]
      )
      return { complaint_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getComplaints(filters = {}) {
    try {
      let query = 'SELECT * FROM customer_complaint WHERE 1=1'
      const params = []

      if (filters.status) {
        query += ' AND status = ?'
        params.push(filters.status)
      }
      if (filters.priority) {
        query += ' AND priority = ?'
        params.push(filters.priority)
      }

      query += ' ORDER BY complaint_date DESC'
      const [results] = await this.db.query(query, params)
      return results
    } catch (error) {
      throw error
    }
  }

  async updateComplaintStatus(complaint_id, status) {
    try {
      const [result] = await this.db.query(
        'UPDATE customer_complaint SET status = ? WHERE complaint_id = ?',
        [status, complaint_id]
      )
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  // ============= CAPA (Corrective and Preventive Action) =============

  async createCAPAAction(data) {
    try {
      const capa_id = `CAPA-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO capa_action 
        (capa_id, complaint_id, inspection_id, action_type, root_cause, proposed_action, 
         responsible_person_id, target_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [capa_id, data.complaint_id, data.inspection_id, data.action_type || 'corrective', 
         data.root_cause, data.proposed_action, data.responsible_person_id, 
         data.target_date, 'open']
      )
      return { capa_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getCAPAActions(filters = {}) {
    try {
      let query = 'SELECT * FROM capa_action WHERE 1=1'
      const params = []

      if (filters.status) {
        query += ' AND status = ?'
        params.push(filters.status)
      }
      if (filters.action_type) {
        query += ' AND action_type = ?'
        params.push(filters.action_type)
      }

      query += ' ORDER BY created_at DESC'
      const [results] = await this.db.query(query, params)
      return results
    } catch (error) {
      throw error
    }
  }

  async updateCAPAStatus(capa_id, status, completion_date = null) {
    try {
      let query = 'UPDATE capa_action SET status = ?'
      const params = [status]

      if (completion_date && status === 'completed') {
        query += ', completion_date = ?'
        params.push(completion_date)
      }

      query += ' WHERE capa_id = ?'
      params.push(capa_id)

      const [result] = await this.db.query(query, params)
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  // ============= QC ANALYTICS =============

  async getQCDashboard(date) {
    try {
      const [data] = await this.db.query(
        `SELECT 
         COUNT(*) as total_inspections,
         SUM(CASE WHEN result = 'pass' THEN 1 ELSE 0 END) as passed,
         SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) as failed,
         ROUND(SUM(quantity_rejected) / SUM(quantity_inspected) * 100, 2) as rejection_rate,
         COUNT(DISTINCT reference_id) as items_inspected
         FROM inspection_result
         WHERE DATE(inspection_date) = ?`,
        [date]
      )
      return data[0] || {}
    } catch (error) {
      throw error
    }
  }

  async getRejectionTrend(date_from, date_to) {
    try {
      const [results] = await this.db.query(
        `SELECT 
         DATE(inspection_date) as inspection_date,
         COUNT(*) as total_inspections,
         SUM(quantity_rejected) as total_rejected,
         ROUND(SUM(quantity_rejected) / SUM(quantity_inspected) * 100, 2) as rejection_rate
         FROM inspection_result
         WHERE inspection_date BETWEEN ? AND ?
         GROUP BY DATE(inspection_date)
         ORDER BY inspection_date`,
        [date_from, date_to]
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getComplaintAnalysis(date_from, date_to) {
    try {
      const [results] = await this.db.query(
        `SELECT 
         complaint_type,
         COUNT(*) as count,
         SUM(CASE WHEN status = 'resolved' OR status = 'closed' THEN 1 ELSE 0 END) as resolved
         FROM customer_complaint
         WHERE complaint_date BETWEEN ? AND ?
         GROUP BY complaint_type
         ORDER BY count DESC`,
        [date_from, date_to]
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getCAPAClosureRate(date_from, date_to) {
    try {
      const [data] = await this.db.query(
        `SELECT 
         COUNT(*) as total_capa,
         SUM(CASE WHEN status = 'verified' OR status = 'completed' THEN 1 ELSE 0 END) as closed,
         ROUND(SUM(CASE WHEN status = 'verified' OR status = 'completed' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as closure_rate
         FROM capa_action
         WHERE created_at BETWEEN ? AND ?`,
        [date_from, date_to]
      )
      return data[0] || {}
    } catch (error) {
      throw error
    }
  }
}

export default QCModel