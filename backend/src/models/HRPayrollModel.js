class HRPayrollModel {
  constructor(db) {
    this.db = db
  }

  // ============= EMPLOYEE MASTER =============

  async createEmployee(data) {
    try {
      const employee_id = `EMP-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO employee_master 
        (employee_id, first_name, last_name, email, phone, date_of_birth, gender, department, designation, joining_date, salary, bank_account, uan_number, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [employee_id, data.first_name, data.last_name, data.email, data.phone, data.date_of_birth,
         data.gender || 'male', data.department, data.designation, data.joining_date, 
         data.salary, data.bank_account, data.uan_number, data.status || 'active']
      )
      return { employee_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getEmployees(filters = {}) {
    try {
      let query = `SELECT * FROM employee_master WHERE 1=1`
      const params = []

      if (filters.status) {
        query += ' AND status = ?'
        params.push(filters.status)
      }
      if (filters.department) {
        query += ' AND department = ?'
        params.push(filters.department)
      }
      if (filters.search) {
        query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR employee_id LIKE ?)'
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`)
      }

      query += ' ORDER BY joining_date DESC'
      const [results] = await this.db.query(query, params)
      return results
    } catch (error) {
      throw error
    }
  }

  async getEmployee(employee_id) {
    try {
      const [results] = await this.db.query(
        `SELECT * FROM employee_master WHERE employee_id = ?`,
        [employee_id]
      )
      return results.length > 0 ? results[0] : null
    } catch (error) {
      throw error
    }
  }

  async updateEmployee(employee_id, data) {
    try {
      let query = 'UPDATE employee_master SET '
      const params = []
      const fields = []

      Object.entries(data).forEach(([key, value]) => {
        fields.push(`${key} = ?`)
        params.push(value)
      })

      query += fields.join(', ')
      query += ', updated_at = CURRENT_TIMESTAMP WHERE employee_id = ?'
      params.push(employee_id)

      const [result] = await this.db.query(query, params)
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  // ============= ATTENDANCE LOG =============

  async recordAttendance(data) {
    try {
      const attendance_id = `ATT-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO attendance_log 
        (attendance_id, employee_id, attendance_date, check_in_time, check_out_time, hours_worked, status, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [attendance_id, data.employee_id, data.attendance_date, data.check_in_time, 
         data.check_out_time, data.hours_worked, data.status || 'present', data.remarks]
      )
      return { attendance_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getAttendance(filters = {}) {
    try {
      let query = `SELECT a.*, e.first_name, e.last_name, e.email
                   FROM attendance_log a
                   LEFT JOIN employee_master e ON a.employee_id = e.employee_id
                   WHERE 1=1`
      const params = []

      if (filters.employee_id) {
        query += ' AND a.employee_id = ?'
        params.push(filters.employee_id)
      }
      if (filters.status) {
        query += ' AND a.status = ?'
        params.push(filters.status)
      }
      if (filters.date_from) {
        query += ' AND DATE(a.attendance_date) >= ?'
        params.push(filters.date_from)
      }
      if (filters.date_to) {
        query += ' AND DATE(a.attendance_date) <= ?'
        params.push(filters.date_to)
      }

      query += ' ORDER BY a.attendance_date DESC, a.check_in_time DESC'
      const [results] = await this.db.query(query, params)
      return results
    } catch (error) {
      throw error
    }
  }

  async updateAttendance(attendance_id, data) {
    try {
      let query = 'UPDATE attendance_log SET '
      const params = []
      const fields = []

      Object.entries(data).forEach(([key, value]) => {
        fields.push(`${key} = ?`)
        params.push(value)
      })

      query += fields.join(', ')
      query += ' WHERE attendance_id = ?'
      params.push(attendance_id)

      const [result] = await this.db.query(query, params)
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  // ============= SHIFT ALLOCATION =============

  async allocateShift(data) {
    try {
      const allocation_id = `SHIFT-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO shift_allocation 
        (allocation_id, employee_id, shift_no, shift_start_time, shift_end_time, allocation_date, end_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [allocation_id, data.employee_id, data.shift_no, data.shift_start_time,
         data.shift_end_time, data.allocation_date, data.end_date, data.status || 'active']
      )
      return { allocation_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getShiftAllocations(filters = {}) {
    try {
      let query = `SELECT s.*, e.first_name, e.last_name, e.department
                   FROM shift_allocation s
                   LEFT JOIN employee_master e ON s.employee_id = e.employee_id
                   WHERE 1=1`
      const params = []

      if (filters.employee_id) {
        query += ' AND s.employee_id = ?'
        params.push(filters.employee_id)
      }
      if (filters.status) {
        query += ' AND s.status = ?'
        params.push(filters.status)
      }
      if (filters.shift_no) {
        query += ' AND s.shift_no = ?'
        params.push(filters.shift_no)
      }

      query += ' ORDER BY s.allocation_date DESC'
      const [results] = await this.db.query(query, params)
      return results
    } catch (error) {
      throw error
    }
  }

  async updateShiftAllocation(allocation_id, data) {
    try {
      let query = 'UPDATE shift_allocation SET '
      const params = []
      const fields = []

      Object.entries(data).forEach(([key, value]) => {
        fields.push(`${key} = ?`)
        params.push(value)
      })

      query += fields.join(', ')
      query += ' WHERE allocation_id = ?'
      params.push(allocation_id)

      const [result] = await this.db.query(query, params)
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  // ============= PAYROLL =============

  async createPayroll(data) {
    try {
      const payroll_id = `PAY-${Date.now()}`
      const gross_salary = (data.basic_salary || 0) + (data.allowances || 0)
      const net_salary = gross_salary - (data.deductions || 0)

      const [result] = await this.db.query(
        `INSERT INTO payroll 
        (payroll_id, employee_id, payroll_date, basic_salary, allowances, deductions, gross_salary, net_salary, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [payroll_id, data.employee_id, data.payroll_date, data.basic_salary,
         data.allowances || 0, data.deductions || 0, gross_salary, net_salary, data.status || 'draft']
      )
      return { payroll_id, gross_salary, net_salary, ...data }
    } catch (error) {
      throw error
    }
  }

  async getPayrolls(filters = {}) {
    try {
      let query = `SELECT p.*, e.first_name, e.last_name, e.department, e.designation
                   FROM payroll p
                   LEFT JOIN employee_master e ON p.employee_id = e.employee_id
                   WHERE 1=1`
      const params = []

      if (filters.employee_id) {
        query += ' AND p.employee_id = ?'
        params.push(filters.employee_id)
      }
      if (filters.status) {
        query += ' AND p.status = ?'
        params.push(filters.status)
      }
      if (filters.date_from) {
        query += ' AND DATE(p.payroll_date) >= ?'
        params.push(filters.date_from)
      }
      if (filters.date_to) {
        query += ' AND DATE(p.payroll_date) <= ?'
        params.push(filters.date_to)
      }

      query += ' ORDER BY p.payroll_date DESC'
      const [results] = await this.db.query(query, params)
      return results
    } catch (error) {
      throw error
    }
  }

  async getPayroll(payroll_id) {
    try {
      const [results] = await this.db.query(
        `SELECT p.*, e.first_name, e.last_name, e.email, e.department, e.designation
         FROM payroll p
         LEFT JOIN employee_master e ON p.employee_id = e.employee_id
         WHERE p.payroll_id = ?`,
        [payroll_id]
      )
      return results.length > 0 ? results[0] : null
    } catch (error) {
      throw error
    }
  }

  async updatePayroll(payroll_id, data) {
    try {
      let query = 'UPDATE payroll SET '
      const params = []
      const fields = []

      // Recalculate salary if components changed
      if (data.basic_salary || data.allowances || data.deductions) {
        const [existing] = await this.db.query(
          'SELECT basic_salary, allowances, deductions FROM payroll WHERE payroll_id = ?',
          [payroll_id]
        )
        if (existing.length > 0) {
          const basic = data.basic_salary !== undefined ? data.basic_salary : existing[0].basic_salary
          const allow = data.allowances !== undefined ? data.allowances : existing[0].allowances
          const ded = data.deductions !== undefined ? data.deductions : existing[0].deductions

          data.gross_salary = basic + allow
          data.net_salary = data.gross_salary - ded
        }
      }

      Object.entries(data).forEach(([key, value]) => {
        fields.push(`${key} = ?`)
        params.push(value)
      })

      query += fields.join(', ')
      query += ', updated_at = CURRENT_TIMESTAMP WHERE payroll_id = ?'
      params.push(payroll_id)

      const [result] = await this.db.query(query, params)
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  // ============= HR ANALYTICS =============

  async getHRDashboard() {
    try {
      const [empStats] = await this.db.query(
        `SELECT 
          COUNT(*) as total_employees,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
          SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as on_leave,
          SUM(CASE WHEN status = 'terminated' THEN 1 ELSE 0 END) as terminated
         FROM employee_master`
      )

      const [attendanceToday] = await this.db.query(
        `SELECT 
          COUNT(*) as total_attendance,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) as leave_count
         FROM attendance_log
         WHERE attendance_date = CURDATE()`
      )

      const [pendingPayroll] = await this.db.query(
        `SELECT COUNT(*) as pending_payroll
         FROM payroll
         WHERE status IN ('draft', 'submitted')`
      )

      return {
        employees: empStats[0] || {},
        attendance_today: attendanceToday[0] || {},
        pending_payroll: pendingPayroll[0]?.pending_payroll || 0
      }
    } catch (error) {
      throw error
    }
  }

  async getAttendanceReport(date_from, date_to) {
    try {
      const [results] = await this.db.query(
        `SELECT 
          a.employee_id,
          e.first_name,
          e.last_name,
          e.department,
          COUNT(*) as total_days,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
          SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
          SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END) as leave_days,
          ROUND(SUM(a.hours_worked), 2) as total_hours
         FROM attendance_log a
         JOIN employee_master e ON a.employee_id = e.employee_id
         WHERE a.attendance_date BETWEEN ? AND ?
         GROUP BY a.employee_id, e.first_name, e.last_name, e.department
         ORDER BY e.department, e.first_name`,
        [date_from, date_to]
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getPayrollSummary(payroll_month) {
    try {
      const [results] = await this.db.query(
        `SELECT 
          e.department,
          COUNT(*) as employee_count,
          SUM(p.basic_salary) as total_basic,
          SUM(p.allowances) as total_allowances,
          SUM(p.deductions) as total_deductions,
          SUM(p.gross_salary) as total_gross,
          SUM(p.net_salary) as total_net,
          SUM(CASE WHEN p.status = 'paid' THEN 1 ELSE 0 END) as paid_count
         FROM payroll p
         JOIN employee_master e ON p.employee_id = e.employee_id
         WHERE DATE_FORMAT(p.payroll_date, '%Y-%m') = ?
         GROUP BY e.department
         ORDER BY e.department`,
        [payroll_month]
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getEmployeeTenure() {
    try {
      const [results] = await this.db.query(
        `SELECT 
          employee_id,
          first_name,
          last_name,
          joining_date,
          department,
          designation,
          DATEDIFF(CURDATE(), joining_date) as days_employed,
          ROUND(DATEDIFF(CURDATE(), joining_date) / 365.25, 1) as years_employed,
          salary
         FROM employee_master
         WHERE status = 'active'
         ORDER BY joining_date ASC`
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getDepartmentStats() {
    try {
      const [results] = await this.db.query(
        `SELECT 
          department,
          COUNT(*) as total_employees,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
          ROUND(AVG(salary), 2) as avg_salary,
          MIN(salary) as min_salary,
          MAX(salary) as max_salary
         FROM employee_master
         GROUP BY department
         ORDER BY total_employees DESC`
      )
      return results
    } catch (error) {
      throw error
    }
  }
}

export default HRPayrollModel