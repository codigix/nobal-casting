class QCController {
  constructor(qcModel) {
    this.qcModel = qcModel
  }

  // ============= INSPECTIONS =============

  async createInspection(req, res) {
    try {
      const { reference_type, reference_id, checklist_id, inspection_date, inspector_id, quantity_inspected, quantity_passed, quantity_rejected, remarks } = req.body

      // Validation
      if (!reference_type || !reference_id || !checklist_id || !inspection_date || !quantity_inspected) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: reference_type, reference_id, checklist_id, inspection_date, quantity_inspected'
        })
      }

      const inspection = await this.qcModel.createInspection({
        reference_type,
        reference_id,
        checklist_id,
        inspection_date,
        inspector_id,
        quantity_inspected,
        quantity_passed,
        quantity_rejected,
        result: quantity_rejected > 0 ? 'fail' : 'pass',
        remarks
      })

      res.status(201).json({
        success: true,
        message: 'Inspection created successfully',
        data: inspection
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating inspection',
        error: error.message
      })
    }
  }

  async getInspections(req, res) {
    try {
      const { result, date_from, date_to } = req.query

      const inspections = await this.qcModel.getInspections({
        result,
        date_from,
        date_to
      })

      res.status(200).json({
        success: true,
        data: inspections,
        count: inspections.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching inspections',
        error: error.message
      })
    }
  }

  // ============= INSPECTION CHECKLISTS =============

  async createChecklist(req, res) {
    try {
      const { name, inspection_type, parameters, acceptance_criteria } = req.body

      // Validation
      if (!name || !inspection_type) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, inspection_type'
        })
      }

      const checklist = await this.qcModel.createChecklist({
        name,
        inspection_type,
        parameters,
        acceptance_criteria
      })

      res.status(201).json({
        success: true,
        message: 'Checklist created successfully',
        data: checklist
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating checklist',
        error: error.message
      })
    }
  }

  async getChecklists(req, res) {
    try {
      const checklists = await this.qcModel.getChecklists()

      res.status(200).json({
        success: true,
        data: checklists,
        count: checklists.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching checklists',
        error: error.message
      })
    }
  }

  // ============= REJECTION REASONS =============

  async recordRejectionReason(req, res) {
    try {
      const { inspection_id, reason_type, reason_description, quantity, severity, rework_possible } = req.body

      // Validation
      if (!inspection_id || !reason_type || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: inspection_id, reason_type, quantity'
        })
      }

      const reason = await this.qcModel.recordRejectionReason({
        inspection_id,
        reason_type,
        reason_description,
        quantity,
        severity,
        rework_possible
      })

      res.status(201).json({
        success: true,
        message: 'Rejection reason recorded successfully',
        data: reason
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error recording rejection reason',
        error: error.message
      })
    }
  }

  async getRejectionReasons(req, res) {
    try {
      const { inspection_id } = req.params

      if (!inspection_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameter: inspection_id'
        })
      }

      const reasons = await this.qcModel.getRejectionReasons(inspection_id)

      res.status(200).json({
        success: true,
        data: reasons,
        count: reasons.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching rejection reasons',
        error: error.message
      })
    }
  }

  // ============= CUSTOMER COMPLAINTS =============

  async createComplaint(req, res) {
    try {
      const { customer_id, complaint_date, complaint_type, description, priority, assigned_to_id } = req.body

      // Validation
      if (!customer_id || !complaint_date || !complaint_type || !description) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: customer_id, complaint_date, complaint_type, description'
        })
      }

      const complaint = await this.qcModel.createComplaint({
        customer_id,
        complaint_date,
        complaint_type,
        description,
        priority,
        assigned_to_id
      })

      res.status(201).json({
        success: true,
        message: 'Complaint created successfully',
        data: complaint
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating complaint',
        error: error.message
      })
    }
  }

  async getComplaints(req, res) {
    try {
      const { status, priority } = req.query

      const complaints = await this.qcModel.getComplaints({
        status,
        priority
      })

      res.status(200).json({
        success: true,
        data: complaints,
        count: complaints.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching complaints',
        error: error.message
      })
    }
  }

  async updateComplaintStatus(req, res) {
    try {
      const { complaint_id } = req.params
      const { status } = req.body

      if (!complaint_id || !status) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: complaint_id, status'
        })
      }

      const success = await this.qcModel.updateComplaintStatus(complaint_id, status)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Complaint not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Complaint status updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating complaint status',
        error: error.message
      })
    }
  }

  // ============= CAPA (Corrective and Preventive Action) =============

  async createCAPAAction(req, res) {
    try {
      const { complaint_id, inspection_id, action_type, root_cause, proposed_action, responsible_person_id, target_date } = req.body

      // Validation
      if (!root_cause || !proposed_action || !target_date) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: root_cause, proposed_action, target_date'
        })
      }

      // At least one of complaint_id or inspection_id should be provided
      if (!complaint_id && !inspection_id) {
        return res.status(400).json({
          success: false,
          message: 'At least one of complaint_id or inspection_id must be provided'
        })
      }

      const capa = await this.qcModel.createCAPAAction({
        complaint_id,
        inspection_id,
        action_type,
        root_cause,
        proposed_action,
        responsible_person_id,
        target_date
      })

      res.status(201).json({
        success: true,
        message: 'CAPA action created successfully',
        data: capa
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating CAPA action',
        error: error.message
      })
    }
  }

  async getCAPAActions(req, res) {
    try {
      const { status, action_type } = req.query

      const actions = await this.qcModel.getCAPAActions({
        status,
        action_type
      })

      res.status(200).json({
        success: true,
        data: actions,
        count: actions.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching CAPA actions',
        error: error.message
      })
    }
  }

  async updateCAPAStatus(req, res) {
    try {
      const { capa_id } = req.params
      const { status, completion_date } = req.body

      if (!capa_id || !status) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: capa_id, status'
        })
      }

      const success = await this.qcModel.updateCAPAStatus(capa_id, status, completion_date)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'CAPA action not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'CAPA status updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating CAPA status',
        error: error.message
      })
    }
  }

  // ============= QC ANALYTICS =============

  async getDashboard(req, res) {
    try {
      const { date } = req.query

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameter: date (YYYY-MM-DD format)'
        })
      }

      const dashboard = await this.qcModel.getQCDashboard(date)

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

  async getRejectionTrend(req, res) {
    try {
      const { date_from, date_to } = req.query

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: date_from, date_to (YYYY-MM-DD format)'
        })
      }

      const trends = await this.qcModel.getRejectionTrend(date_from, date_to)

      res.status(200).json({
        success: true,
        data: trends,
        count: trends.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching rejection trend',
        error: error.message
      })
    }
  }

  async getComplaintAnalysis(req, res) {
    try {
      const { date_from, date_to } = req.query

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: date_from, date_to (YYYY-MM-DD format)'
        })
      }

      const analysis = await this.qcModel.getComplaintAnalysis(date_from, date_to)

      res.status(200).json({
        success: true,
        data: analysis,
        count: analysis.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching complaint analysis',
        error: error.message
      })
    }
  }

  async getCAPAClosureRate(req, res) {
    try {
      const { date_from, date_to } = req.query

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: date_from, date_to (YYYY-MM-DD format)'
        })
      }

      const closure = await this.qcModel.getCAPAClosureRate(date_from, date_to)

      res.status(200).json({
        success: true,
        data: closure
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching CAPA closure rate',
        error: error.message
      })
    }
  }
}

export default QCController