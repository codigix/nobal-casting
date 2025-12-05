export class TaxTemplateModel {
  static async getAll(db) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM taxes_and_charges_template WHERE is_active = true ORDER BY name'
      )
      return rows
    } catch (error) {
      throw new Error('Failed to fetch tax templates: ' + error.message)
    }
  }

  static async getById(db, templateId) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM taxes_and_charges_template WHERE template_id = ?',
        [templateId]
      )
      if (!rows[0]) return null

      const template = rows[0]

      const [taxItems] = await db.execute(
        'SELECT * FROM tax_item WHERE template_id = ?',
        [templateId]
      )

      return {
        ...template,
        items: taxItems
      }
    } catch (error) {
      throw new Error('Failed to fetch tax template: ' + error.message)
    }
  }

  static async create(db, data) {
    try {
      const { template_id, name } = data

      await db.execute(
        'INSERT INTO taxes_and_charges_template (template_id, name, is_active) VALUES (?, ?, true)',
        [template_id, name]
      )

      return this.getById(db, template_id)
    } catch (error) {
      throw new Error('Failed to create tax template: ' + error.message)
    }
  }

  static async update(db, templateId, data) {
    try {
      const { name } = data

      await db.execute(
        'UPDATE taxes_and_charges_template SET name = ? WHERE template_id = ?',
        [name, templateId]
      )

      return this.getById(db, templateId)
    } catch (error) {
      throw new Error('Failed to update tax template: ' + error.message)
    }
  }

  static async delete(db, templateId) {
    try {
      await db.execute(
        'DELETE FROM tax_item WHERE template_id = ?',
        [templateId]
      )

      await db.execute(
        'DELETE FROM taxes_and_charges_template WHERE template_id = ?',
        [templateId]
      )

      return true
    } catch (error) {
      throw new Error('Failed to delete tax template: ' + error.message)
    }
  }

  static async addTaxItem(db, data) {
    try {
      const { tax_item_id, template_id, tax_head, rate } = data

      await db.execute(
        'INSERT INTO tax_item (tax_item_id, template_id, tax_head, rate) VALUES (?, ?, ?, ?)',
        [tax_item_id, template_id, tax_head, rate]
      )

      return this.getById(db, template_id)
    } catch (error) {
      throw new Error('Failed to add tax item: ' + error.message)
    }
  }

  static async removeTaxItem(db, taxItemId, templateId) {
    try {
      await db.execute(
        'DELETE FROM tax_item WHERE tax_item_id = ?',
        [taxItemId]
      )

      return this.getById(db, templateId)
    } catch (error) {
      throw new Error('Failed to remove tax item: ' + error.message)
    }
  }
}
