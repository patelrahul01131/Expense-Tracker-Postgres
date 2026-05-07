import pool from "../db/db.js";

const categoriesController = async (req, res) => {
  try {
    const query = "SELECT name , icon, color, id FROM categories";
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Error fetching categories", error });
  }
};

export default categoriesController;
