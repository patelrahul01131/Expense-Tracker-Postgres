import pool from "../db/db.js";

// Returns monthly income vs expense for a configurable number of months
const getAnalyticsController = async (req, res) => {
  try {
    const profile_id = req.profile?.id;
    if (!profile_id) {
      return res.status(400).json({ message: "No active profile" });
    }

    // months param: 1, 3, 6, 12 — default 6
    const months = Math.min(parseInt(req.query.months) || 6, 24);

    const cashFlowQuery = `
      SELECT
        TO_CHAR(date_trunc('month', expense_date), 'Mon ''YY') AS name,
        COALESCE(ROUND(SUM(amount) FILTER (WHERE expense_type = 'income')::numeric, 2), 0) AS income,
        COALESCE(ROUND(SUM(amount) FILTER (WHERE expense_type = 'expense')::numeric, 2), 0) AS expense
      FROM expenses
      WHERE profile_id = $1
        AND expense_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' * ($2 - 1)
      GROUP BY date_trunc('month', expense_date)
      ORDER BY date_trunc('month', expense_date) ASC
    `;

    const categoryQuery = `
      SELECT
        c.name,
        ROUND(SUM(e.amount)::numeric, 2) AS value,
        c.color
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.profile_id = $1
        AND e.expense_type = 'expense'
        AND e.expense_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' * ($2 - 1)
      GROUP BY c.name, c.color
      ORDER BY value DESC
      LIMIT 8
    `;

    const [cashFlow, categories] = await Promise.all([
      pool.query(cashFlowQuery, [profile_id, months]),
      pool.query(categoryQuery, [profile_id, months]),
    ]);

    res.status(200).json({
      cashFlow: cashFlow.rows,
      categories: categories.rows,
    });
  } catch (error) {
    console.log("getAnalyticsController error:", error);
    res.status(500).json({ message: "Error fetching analytics", error });
  }
};

export { getAnalyticsController };
