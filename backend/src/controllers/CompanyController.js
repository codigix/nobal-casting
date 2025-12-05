export async function getCompanyInfo(req, res) {
  try {
    const db = req.app.locals.db

    const [rows] = await db.execute(
      'SELECT company_id, name as company_name, display_name, country, currency FROM company LIMIT 1'
    )

    if (!rows || rows.length === 0) {
      return res.json({ success: true, data: null })
    }

    res.json({ success: true, data: rows[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}
