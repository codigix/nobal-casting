import { v4 as uuidv4 } from 'uuid'

export class ItemModel {
  constructor(db) {
    this.db = db
  }

  async create(data) {
    try {
      const item_code = data.item_code || `ITEM-${Date.now()}`

      const fields = [
        'item_code', 'name', 'item_group', 'description', 'uom', 'hsn_code', 'gst_rate', 'is_active',
        'disabled', 'allow_alternative_item', 'maintain_stock', 'has_variants', 'opening_stock',
        'valuation_rate', 'valuation_method', 'standard_selling_rate', 'is_fixed_asset',
        'shelf_life_in_days', 'warranty_period_in_days', 'end_of_life', 'weight_per_unit',
        'weight_uom', 'allow_negative_stock', 'has_batch_no', 'has_serial_no',
        'automatically_create_batch', 'batch_number_series', 'has_expiry_date', 'retain_sample',
        'max_sample_quantity', 'default_purchase_uom', 'lead_time_days', 'minimum_order_qty',
        'safety_stock', 'is_customer_provided_item', 'default_sales_uom', 'max_discount_percentage',
        'grant_commission', 'allow_sales', 'cess_rate', 'inclusive_tax',
        'supply_raw_materials_for_purchase', 'include_item_in_manufacturing', 'no_of_cavities',
        'family_mould', 'mould_number'
      ]

      const values = [
        item_code, data.item_name || data.name, data.item_group, data.description, 
        data.uom || 'Nos', data.hsn_code, data.gst_rate || 0, data.disabled ? false : true,
        data.disabled || false, data.allow_alternative_item || false, data.maintain_stock !== false,
        data.has_variants || false, data.opening_stock || 0, data.valuation_rate || 0,
        data.valuation_method || 'FIFO', data.standard_selling_rate || 0, data.is_fixed_asset || false,
        data.shelf_life_in_days || null, data.warranty_period_in_days || null, data.end_of_life || null,
        data.weight_per_unit || null, data.weight_uom || null, data.allow_negative_stock || false,
        data.has_batch_no || false, data.has_serial_no || false, data.automatically_create_batch || false,
        data.batch_number_series || null, data.has_expiry_date || false, data.retain_sample || false,
        data.max_sample_quantity || null, data.default_purchase_uom || 'Nos', data.lead_time_days || 0,
        data.minimum_order_qty || 1, data.safety_stock || 0, data.is_customer_provided_item || false,
        data.default_sales_uom || 'Nos', data.max_discount_percentage || 0, data.grant_commission || false,
        data.allow_sales !== false, data.cess_rate || 0, data.inclusive_tax || false,
        data.supply_raw_materials_for_purchase || false, data.include_item_in_manufacturing || false,
        data.no_of_cavities || 1, data.family_mould || false, data.mould_number || null
      ]

      const placeholders = fields.map(() => '?').join(', ')
      const query = `INSERT INTO item (${fields.join(', ')}) VALUES (${placeholders})`

      await this.db.execute(query, values)

      await this.saveBarcode(item_code, data.barcode_list || [])
      await this.saveSuppliers(item_code, data.suppliers_list || [])
      await this.saveCustomerDetails(item_code, data.customer_details || [])
      await this.saveDimensionalParameters(item_code, data)

      return { item_code, status: 'created' }
    } catch (error) {
      throw new Error(`Failed to create item: ${error.message}`)
    }
  }

  async saveBarcode(item_code, barcodes) {
    try {
      for (const barcode of barcodes) {
        if (barcode.barcode) {
          await this.db.execute(
            `INSERT INTO item_barcode (barcode_id, item_code, barcode, barcode_name, barcode_type) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              `BARCODE-${Date.now()}-${Math.random()}`,
              item_code,
              barcode.barcode,
              barcode.barcode_name || '',
              barcode.barcode_type || ''
            ]
          )
        }
      }
    } catch (error) {
      console.error('Error saving barcodes:', error.message)
    }
  }

  async saveSuppliers(item_code, suppliers) {
    try {
      for (const supplier of suppliers) {
        if (supplier.supplier_name) {
          await this.db.execute(
            `INSERT INTO item_supplier (item_supplier_id, item_code, supplier_id, supplier_name, supplier_code) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              `SUPP-${Date.now()}-${Math.random()}`,
              item_code,
              supplier.supplier_id || null,
              supplier.supplier_name,
              supplier.supplier_code || ''
            ]
          )
        }
      }
    } catch (error) {
      console.error('Error saving suppliers:', error.message)
    }
  }

  async saveCustomerDetails(item_code, customers) {
    try {
      for (const customer of customers) {
        if (customer.customer_name) {
          await this.db.execute(
            `INSERT INTO item_customer_detail (customer_detail_id, item_code, customer_name, customer_group, ref_code) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              `CUST-${Date.now()}-${Math.random()}`,
              item_code,
              customer.customer_name,
              customer.customer_group || '',
              customer.ref_code || ''
            ]
          )
        }
      }
    } catch (error) {
      console.error('Error saving customer details:', error.message)
    }
  }

  async saveDimensionalParameters(item_code, data) {
    try {
      const types = [
        'gdc_dimensional_parameters',
        'pdi_dimensional_parameters',
        'visual_parameters',
        'machining_dimensional_parameters',
        'machining_process_parameters'
      ]

      for (const type of types) {
        const params = data[type] || []
        for (const param of params) {
          if (param.name || param.parameter) {
            await this.db.execute(
              `INSERT INTO item_dimension_parameter (parameter_id, item_code, parameter_type, name, parameter, value, status) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                `PARAM-${Date.now()}-${Math.random()}`,
                item_code,
                type,
                param.name || '',
                param.parameter || '',
                param.value || '',
                param.status || ''
              ]
            )
          }
        }
      }
    } catch (error) {
      console.error('Error saving dimensional parameters:', error.message)
    }
  }

  async getById(item_code) {
    try {
      const [items] = await this.db.execute(
        `SELECT * FROM item WHERE item_code = ?`,
        [item_code]
      )

      if (items.length === 0) return null

      const itemData = items[0]

      const [barcodes] = await this.db.execute(
        `SELECT barcode, barcode_name, barcode_type FROM item_barcode WHERE item_code = ?`,
        [item_code]
      )

      const [suppliers] = await this.db.execute(
        `SELECT supplier_id, supplier_name, supplier_code FROM item_supplier WHERE item_code = ?`,
        [item_code]
      )

      const [customers] = await this.db.execute(
        `SELECT customer_name, customer_group, ref_code FROM item_customer_detail WHERE item_code = ?`,
        [item_code]
      )

      const [dimensions] = await this.db.execute(
        `SELECT parameter_type, name, parameter, value, status FROM item_dimension_parameter WHERE item_code = ?`,
        [item_code]
      )

      const [stock] = await this.db.execute(
        `SELECT warehouse_code, qty FROM stock WHERE item_code = ?`,
        [item_code]
      )

      const groupedDimensions = {
        gdc_dimensional_parameters: [],
        pdi_dimensional_parameters: [],
        visual_parameters: [],
        machining_dimensional_parameters: [],
        machining_process_parameters: []
      }

      for (const dim of dimensions) {
        if (groupedDimensions[dim.parameter_type]) {
          groupedDimensions[dim.parameter_type].push({
            name: dim.name,
            parameter: dim.parameter,
            value: dim.value,
            status: dim.status
          })
        }
      }

      return {
        ...itemData,
        barcode_list: barcodes,
        suppliers_list: suppliers,
        customer_details: customers,
        ...groupedDimensions,
        stock
      }
    } catch (error) {
      throw new Error(`Failed to fetch item: ${error.message}`)
    }
  }

  async getAll(filters = {}) {
    try {
      let query = `SELECT * FROM item WHERE is_active = 1`
      const params = []

      if (filters.item_group) {
        query += ` AND item_group = ?`
        params.push(filters.item_group)
      }

      if (filters.search) {
        query += ` AND (name LIKE ? OR item_code LIKE ?)`
        const searchTerm = `%${filters.search}%`
        params.push(searchTerm, searchTerm)
      }

      const limit = filters.limit || 100
      const offset = filters.offset || 0
      query += ` ORDER BY name LIMIT ${limit} OFFSET ${offset}`

      const [items] = await this.db.execute(query, params)
      return items
    } catch (error) {
      throw new Error(`Failed to fetch items: ${error.message}`)
    }
  }

  async getItemGroups() {
    try {
      const [groups] = await this.db.execute(
        `SELECT DISTINCT item_group FROM item WHERE is_active = 1 ORDER BY item_group`
      )
      return groups.map(g => g.item_group)
    } catch (error) {
      throw new Error(`Failed to fetch item groups: ${error.message}`)
    }
  }

  async update(item_code, data) {
    try {
      const updateFields = []
      const params = []

      const allowedFields = [
        'name', 'item_group', 'description', 'uom', 'hsn_code', 'gst_rate', 'is_active',
        'disabled', 'allow_alternative_item', 'maintain_stock', 'has_variants', 'opening_stock',
        'valuation_rate', 'valuation_method', 'standard_selling_rate', 'is_fixed_asset',
        'shelf_life_in_days', 'warranty_period_in_days', 'end_of_life', 'weight_per_unit',
        'weight_uom', 'allow_negative_stock', 'has_batch_no', 'has_serial_no',
        'automatically_create_batch', 'batch_number_series', 'has_expiry_date', 'retain_sample',
        'max_sample_quantity', 'default_purchase_uom', 'lead_time_days', 'minimum_order_qty',
        'safety_stock', 'is_customer_provided_item', 'default_sales_uom', 'max_discount_percentage',
        'grant_commission', 'allow_sales', 'cess_rate', 'inclusive_tax',
        'supply_raw_materials_for_purchase', 'include_item_in_manufacturing', 'no_of_cavities',
        'family_mould', 'mould_number'
      ]

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updateFields.push(`${field} = ?`)
          params.push(data[field])
        }
      }

      if (updateFields.length === 0) return { success: true }

      params.push(item_code)
      const query = `UPDATE item SET ${updateFields.join(', ')}, updated_at = NOW() WHERE item_code = ?`

      const [result] = await this.db.execute(query, params)

      if (data.barcode_list) {
        await this.db.execute('DELETE FROM item_barcode WHERE item_code = ?', [item_code])
        await this.saveBarcode(item_code, data.barcode_list)
      }

      if (data.suppliers_list) {
        await this.db.execute('DELETE FROM item_supplier WHERE item_code = ?', [item_code])
        await this.saveSuppliers(item_code, data.suppliers_list)
      }

      if (data.customer_details) {
        await this.db.execute('DELETE FROM item_customer_detail WHERE item_code = ?', [item_code])
        await this.saveCustomerDetails(item_code, data.customer_details)
      }

      if (data.gdc_dimensional_parameters || data.pdi_dimensional_parameters || 
          data.visual_parameters || data.machining_dimensional_parameters || 
          data.machining_process_parameters) {
        await this.db.execute('DELETE FROM item_dimension_parameter WHERE item_code = ?', [item_code])
        await this.saveDimensionalParameters(item_code, data)
      }

      return { affectedRows: result.affectedRows }
    } catch (error) {
      throw new Error(`Failed to update item: ${error.message}`)
    }
  }

  async getStockInfo(item_code) {
    try {
      const [stock] = await this.db.execute(
        `SELECT warehouse_code, qty FROM stock WHERE item_code = ?`,
        [item_code]
      )
      return stock
    } catch (error) {
      throw new Error(`Failed to fetch stock info: ${error.message}`)
    }
  }

  async getTotalStock(item_code) {
    try {
      const [result] = await this.db.execute(
        `SELECT SUM(qty) as total_qty FROM stock WHERE item_code = ?`,
        [item_code]
      )
      return result[0] || { total_qty: 0 }
    } catch (error) {
      throw new Error(`Failed to calculate total stock: ${error.message}`)
    }
  }

  async delete(item_code) {
    try {
      // Only soft delete by marking as inactive
      await this.db.execute(
        `UPDATE item SET is_active = 0, updated_at = NOW() WHERE item_code = ?`,
        [item_code]
      )
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete item: ${error.message}`)
    }
  }
}