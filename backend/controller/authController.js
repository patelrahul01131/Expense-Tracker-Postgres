import pool from "../db/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const signupController = async (req, res) => {
  const { name, email, password } = req.body;
  console.log("from backend :", req.body);

  const hashedPassword = await bcrypt.hash(password, 10);

  const checkQuery = `SELECT * FROM users WHERE email = $1`;
  const checkValues = [email];

  try {
    const result = await pool.query(checkQuery, checkValues);
    if (result.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Error checking user", error });
  }

  const query = `INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3)`;
  const values = [name, email, hashedPassword];

  try {
    const result = await pool.query(query, values);
    res.status(201).json({ message: "User created successfully", result });
  } catch (error) {
    res.status(500).json({ message: "Error creating user", error });
  }
};

const loginController = async (req, res) => {
  const { email, password } = req.body;

  console.log("from backend :", req.body);

  const query = `SELECT * FROM users WHERE email = $1`;
  const values = [email];

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "User Not Found" });
    }
    const [user] = result.rows;
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid Email or password" });
    }

    // Check if user has at least one profile
    const profileResult = await pool.query(
      `SELECT id FROM profiles WHERE user_id = $1 LIMIT 1`,
      [user.id],
    );
    const hasProfile = profileResult.rows.length > 0;

    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    console.log("from backend JWT token :", token);
    res.status(200).json({
      message: "User Logged In Successfully",
      token,
      hasProfile,
    });
  } catch (error) {
    console.log("from backend :", error);
    return res.status(500).json({ message: "Error finding user", error });
  }
};

export { signupController, loginController };
