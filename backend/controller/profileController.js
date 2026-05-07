import pool from "../db/db.js";

const createProfileController = async (req, res) => {
  try {
    const { name, avatar_url, currency } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Profile name is required" });
    }

    // Check if a profile with the SAME NAME already exists for this user (unique per user)
    const existing = await pool.query(
      `SELECT id FROM profiles WHERE user_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
      [userId, name.trim()],
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({
        message:
          "A profile with this name already exists. Please choose a different name.",
      });
    }

    const result = await pool.query(
      `INSERT INTO profiles (user_id, name, avatar_url, currency) VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, name.trim(), avatar_url || null, currency || "USD"],
    );
    if (!result.rows || result.rows.length === 0) {
      return res
        .status(400)
        .json({ message: "Profile not created", profile: null });
    }

    res.status(201).json({
      message: "Profile created successfully",
      profile: result.rows[0],
    });
  } catch (error) {
    console.log("createProfileController error:", error);
    res.status(500).json({ message: "Error creating profile", error });
  }
};

const getProfileController = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT * FROM profiles WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId],
    );
    if (!result.rows || result.rows.length === 0) {
      return res.status(400).json({ message: "No profile found" });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    console.log("getProfileController error:", error);
    res.status(500).json({ message: "Error fetching profiles", error });
  }
};

const updateProfileController = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, avatar_url, currency } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Profile name is required" });
    }

    // Verify ownership
    const ownerCheck = await pool.query(
      `SELECT id FROM profiles WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    if (ownerCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Profile not found or unauthorized" });
    }

    // Check if another profile with same name exists for this user (excluding current)
    const nameCheck = await pool.query(
      `SELECT id FROM profiles WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id != $3`,
      [userId, name.trim(), id],
    );
    if (nameCheck.rows.length > 0) {
      return res.status(400).json({
        message:
          "A profile with this name already exists. Please choose a different name.",
      });
    }

    const result = await pool.query(
      `UPDATE profiles SET name = $1, avatar_url = $2, currency = $3 WHERE id = $4 AND user_id = $5 RETURNING *`,
      [name.trim(), avatar_url || null, currency || "USD", id, userId],
    );

    res.status(200).json({
      message: "Profile updated successfully",
      profile: result.rows[0],
    });
  } catch (error) {
    console.log("updateProfileController error:", error);
    res.status(500).json({ message: "Error updating profile", error });
  }
};

export {
  createProfileController,
  getProfileController,
  updateProfileController,
};
