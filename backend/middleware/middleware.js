import jwt from "jsonwebtoken";
import pool from "../db/db.js";

const authMiddleware = async (req, res, next) => {
  const token = req.headers.token;
  if (!token) {
    return res.status(401).json({ message: "Token not found" });
  }

  let verifyToken;
  try {
    verifyToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const { email } = verifyToken;
  try {
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "User Not Found" });
    }
    const [user] = result.rows;
    req.user = user;

    // Check if client sent an explicit active profile id
    const requestedProfileId = req.headers["x-profile-id"];

    let profileResult;
    if (requestedProfileId) {
      // Verify the requested profile belongs to this user
      profileResult = await pool.query(
        `SELECT * FROM profiles WHERE id = $1 AND user_id = $2`,
        [requestedProfileId, user.id],
      );
    }

    // Fallback to first profile if none requested or not found
    if (!profileResult || profileResult.rows.length === 0) {
      profileResult = await pool.query(
        `SELECT * FROM profiles WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
        [user.id],
      );
    }

    const [profile] = profileResult.rows;
    req.profile = profile;
    next();
  } catch (error) {
    console.log("authMiddleware error:", error);
    return res.status(500).json({ message: "Error finding user", error });
  }
};

export default authMiddleware;
