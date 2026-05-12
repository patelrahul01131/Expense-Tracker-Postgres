import pool from "../db/db.js";
import Papa from "papaparse";

const getAllExpenseController = async (req, res) => {
  try {
    const currentPage = parseInt(req.query.currentPage) || 1;
    const limit = 10;
    const profileId = req.profile.id;

    // Get total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM expenses e
       JOIN categories c ON e.category_id = c.id
       WHERE e.profile_id = $1`,
      [profileId],
    );
    const total = parseInt(countResult.rows[0].count);

    const query = `SELECT 
        e.*, 
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color
      FROM expenses e
      JOIN categories c 
        ON e.category_id = c.id
      WHERE e.profile_id = $1
      ORDER BY e.expense_date DESC
      LIMIT $2 OFFSET $3`;

    const result = await pool.query(query, [
      profileId,
      limit,
      (currentPage - 1) * limit,
    ]);

    res.status(200).json({ data: result.rows, total, currentPage, limit });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Error fetching expenses", error });
  }
};

const addExpenseController = async (req, res) => {
  const profile_id = req.profile.id;
  try {
    const { amount, category, date, title, expenseType } = req.body;
    const query = `INSERT INTO expenses (amount, category_id, expense_date, title, expense_type, profile_id) VALUES ($1, $2, $3, $4, $5, $6)`;
    const result = await pool.query(query, [
      amount,
      category,
      date,
      title,
      expenseType,
      profile_id,
    ]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Error adding expense", error });
  }
};

const getStatesController = async (req, res) => {
  try {
    const profile_id = req.profile.id;
    const query = `WITH monthly AS (
  SELECT
    date_trunc('month', expense_date)::date AS month,
    SUM(CASE WHEN expense_type = 'income' THEN amount ELSE 0 END) AS income,
    SUM(CASE WHEN expense_type = 'expense' THEN amount ELSE 0 END) AS expense
  FROM expenses
  WHERE profile_id = $1
    AND expense_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
    AND expense_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY 1
)
SELECT
  -- current month
  COALESCE(
    (SELECT income FROM monthly WHERE month = date_trunc('month', CURRENT_DATE)::date),
    0
  ) AS current_income,

  COALESCE(
    (SELECT expense FROM monthly WHERE month = date_trunc('month', CURRENT_DATE)::date),
    0
  ) AS current_expense,

  COALESCE(
    (SELECT income FROM monthly WHERE month = date_trunc('month', CURRENT_DATE)::date),
    0
  ) -
  COALESCE(
    (SELECT expense FROM monthly WHERE month = date_trunc('month', CURRENT_DATE)::date),
    0
  ) AS current_balance,

  -- last month
  COALESCE(
    (SELECT income FROM monthly WHERE month = date_trunc('month', CURRENT_DATE)::date - INTERVAL '1 month'),
    0
  ) AS last_income,

  COALESCE(
    (SELECT expense FROM monthly WHERE month = date_trunc('month', CURRENT_DATE)::date - INTERVAL '1 month'),
    0
  ) AS last_expense,

  COALESCE(
    (SELECT income FROM monthly WHERE month = date_trunc('month', CURRENT_DATE)::date - INTERVAL '1 month'),
    0
  ) -
  COALESCE(
    (SELECT expense FROM monthly WHERE month = date_trunc('month', CURRENT_DATE)::date - INTERVAL '1 month'),
    0
  ) AS last_balance;`;

    const result = await pool.query(query, [profile_id]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Error fetching stats", error });
  }
};

const exportToCSVController = async (req, res) => {
  try {
    const profile_id = req.profile.id;
    const query = `SELECT 
      e.amount,
      e.expense_date,
      e.expense_type,
      e.notes,
      c.name AS category,
      g.name AS group_name
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.id
    LEFT JOIN "groups" g ON e.id = g.id
    WHERE e.profile_id = $1
ORDER BY e.expense_date DESC`;
    const result = await pool.query(query, [profile_id]);

    const csv = Papa.unparse(result.rows);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=expenses.csv");
    res.status(200).send(csv);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Error exporting expenses", error });
  }
};

export {
  getAllExpenseController,
  addExpenseController,
  getStatesController,
  exportToCSVController,
};
