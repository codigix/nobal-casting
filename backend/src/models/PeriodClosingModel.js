
export class PeriodClosingModel {
  static async checkLock(db, date) {
    try {
      const [rows] = await db.execute(
        'SELECT closing_id FROM period_closing WHERE closing_date >= ?',
        [date]
      );
      if (rows.length > 0) {
        throw new Error('This period has been closed for inventory audit.');
      }
      return true;
    } catch (error) {
      if (error.message === 'This period has been closed for inventory audit.') {
        throw error;
      }
      throw new Error('Failed to check period lock: ' + error.message);
    }
  }

  static async closePeriod(db, closingDate, closedBy, remarks) {
    try {
      const closing_id = 'PC-' + Date.now();
      await db.execute(
        'INSERT INTO period_closing (closing_id, closing_date, closed_by, remarks) VALUES (?, ?, ?, ?)',
        [closing_id, closingDate, closedBy, remarks]
      );
      return { closing_id, closing_date: closingDate };
    } catch (error) {
      throw new Error('Failed to close period: ' + error.message);
    }
  }

  static async getAll(db) {
    try {
      const [rows] = await db.execute('SELECT * FROM period_closing ORDER BY closing_date DESC');
      return rows;
    } catch (error) {
      throw new Error('Failed to fetch period closings: ' + error.message);
    }
  }
}
