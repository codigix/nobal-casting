class HRPayrollController {
  constructor(hrPayrollModel) {
    this.hrPayrollModel = hrPayrollModel
  }

  // ============= EMPLOYEE MASTER =============

  async createEmployee(req, res) {
    try {
      const { first_name, last_name, email, phone, date_of_birth, gender, department, designation, joining_date, salary, bank_account, uan_number } = req.body

      // Validation
      if (!first_name || !email || !department || !designation || !joining_date) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: first_name, email, department, designation, joining_date'
        })
      }

      const employee = await this.hrPayrollModel.createEmployee({
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        gender,
        department,
        designation,
        joining_date,
        salary,
        bank_account,
        uan_number
      })

      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: employee
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating employee',
        error: error.message
      })
    }
  }

  async getEmployees(req, res) {
    try {
      const { status, department, search } = req.query

      const employees = await this.hrPayrollModel.getEmployees({
        status,
        department,
        search
      })

      res.status(200).json({
        success: true,
        data: employees,
        count: employees.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching employees',
        error: error.message
      })
    }
  }

  async getEmployee(req, res) {
    try {
      const { employee_id } = req.params

      const employee = await this.hrPayrollModel.getEmployee(employee_id)

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        })
      }

      res.status(200).json({
        success: true,
        data: employee
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching employee',
        error: error.message
      })
    }
  }

  async updateEmployee(req, res) {
    try {
      const { employee_id } = req.params
      const data = req.body

      const success = await this.hrPayrollModel.updateEmployee(employee_id, data)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Employee updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating employee',
        error: error.message
      })
    }
  }

  // ============= ATTENDANCE LOG =============

  async recordAttendance(req, res) {
    try {
      const { employee_id, attendance_date, check_in_time, check_out_time, hours_worked, status, remarks } = req.body

      // Validation
      if (!employee_id || !attendance_date) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: employee_id, attendance_date'
        })
      }

      const attendance = await this.hrPayrollModel.recordAttendance({
        employee_id,
        attendance_date,
        check_in_time,
        check_out_time,
        hours_worked,
        status,
        remarks
      })

      res.status(201).json({
        success: true,
        message: 'Attendance recorded successfully',
        data: attendance
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error recording attendance',
        error: error.message
      })
    }
  }

  async getAttendance(req, res) {
    try {
      const { employee_id, status, date_from, date_to } = req.query

      const attendance = await this.hrPayrollModel.getAttendance({
        employee_id,
        status,
        date_from,
        date_to
      })

      res.status(200).json({
        success: true,
        data: attendance,
        count: attendance.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching attendance',
        error: error.message
      })
    }
  }

  async updateAttendance(req, res) {
    try {
      const { attendance_id } = req.params
      const data = req.body

      const success = await this.hrPayrollModel.updateAttendance(attendance_id, data)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Attendance record not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Attendance updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating attendance',
        error: error.message
      })
    }
  }

  // ============= SHIFT ALLOCATION =============

  async allocateShift(req, res) {
    try {
      const { employee_id, shift_no, shift_start_time, shift_end_time, allocation_date, end_date } = req.body

      // Validation
      if (!employee_id || !shift_no || !shift_start_time || !shift_end_time || !allocation_date) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: employee_id, shift_no, shift_start_time, shift_end_time, allocation_date'
        })
      }

      const allocation = await this.hrPayrollModel.allocateShift({
        employee_id,
        shift_no,
        shift_start_time,
        shift_end_time,
        allocation_date,
        end_date
      })

      res.status(201).json({
        success: true,
        message: 'Shift allocated successfully',
        data: allocation
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error allocating shift',
        error: error.message
      })
    }
  }

  async getShiftAllocations(req, res) {
    try {
      const { employee_id, status, shift_no } = req.query

      const allocations = await this.hrPayrollModel.getShiftAllocations({
        employee_id,
        status,
        shift_no
      })

      res.status(200).json({
        success: true,
        data: allocations,
        count: allocations.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching shift allocations',
        error: error.message
      })
    }
  }

  async updateShiftAllocation(req, res) {
    try {
      const { allocation_id } = req.params
      const data = req.body

      const success = await this.hrPayrollModel.updateShiftAllocation(allocation_id, data)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Shift allocation not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Shift allocation updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating shift allocation',
        error: error.message
      })
    }
  }

  // ============= PAYROLL =============

  async createPayroll(req, res) {
    try {
      const { employee_id, payroll_date, basic_salary, allowances, deductions } = req.body

      // Validation
      if (!employee_id || !payroll_date || !basic_salary) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: employee_id, payroll_date, basic_salary'
        })
      }

      const payroll = await this.hrPayrollModel.createPayroll({
        employee_id,
        payroll_date,
        basic_salary,
        allowances,
        deductions
      })

      res.status(201).json({
        success: true,
        message: 'Payroll created successfully',
        data: payroll
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating payroll',
        error: error.message
      })
    }
  }

  async getPayrolls(req, res) {
    try {
      const { employee_id, status, date_from, date_to } = req.query

      const payrolls = await this.hrPayrollModel.getPayrolls({
        employee_id,
        status,
        date_from,
        date_to
      })

      res.status(200).json({
        success: true,
        data: payrolls,
        count: payrolls.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching payrolls',
        error: error.message
      })
    }
  }

  async getPayroll(req, res) {
    try {
      const { payroll_id } = req.params

      const payroll = await this.hrPayrollModel.getPayroll(payroll_id)

      if (!payroll) {
        return res.status(404).json({
          success: false,
          message: 'Payroll not found'
        })
      }

      res.status(200).json({
        success: true,
        data: payroll
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching payroll',
        error: error.message
      })
    }
  }

  async updatePayroll(req, res) {
    try {
      const { payroll_id } = req.params
      const data = req.body

      const success = await this.hrPayrollModel.updatePayroll(payroll_id, data)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Payroll not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Payroll updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating payroll',
        error: error.message
      })
    }
  }

  // ============= HR ANALYTICS =============

  async getDashboard(req, res) {
    try {
      const dashboard = await this.hrPayrollModel.getHRDashboard()

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

  async getAttendanceReport(req, res) {
    try {
      const { date_from, date_to } = req.query

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: date_from, date_to'
        })
      }

      const report = await this.hrPayrollModel.getAttendanceReport(date_from, date_to)

      res.status(200).json({
        success: true,
        data: report,
        count: report.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching attendance report',
        error: error.message
      })
    }
  }

  async getPayrollSummary(req, res) {
    try {
      const { payroll_month } = req.query

      if (!payroll_month) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameter: payroll_month (YYYY-MM format)'
        })
      }

      const summary = await this.hrPayrollModel.getPayrollSummary(payroll_month)

      res.status(200).json({
        success: true,
        data: summary,
        count: summary.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching payroll summary',
        error: error.message
      })
    }
  }

  async getEmployeeTenure(req, res) {
    try {
      const tenure = await this.hrPayrollModel.getEmployeeTenure()

      res.status(200).json({
        success: true,
        data: tenure,
        count: tenure.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching employee tenure',
        error: error.message
      })
    }
  }

  async getDepartmentStats(req, res) {
    try {
      const stats = await this.hrPayrollModel.getDepartmentStats()

      res.status(200).json({
        success: true,
        data: stats,
        count: stats.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching department statistics',
        error: error.message
      })
    }
  }
}

export default HRPayrollController