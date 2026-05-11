import pool from "../db/db.js";
import bcrypt from "bcrypt";

// GET current user + active profile settings
const getSettingsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.profile?.id;

    const userResult = await pool.query(
      `SELECT id, full_name, email, created_at FROM users WHERE id = $1`,
      [userId]
    );

    let profileData = null;
    if (profileId) {
      const profileResult = await pool.query(
        `SELECT id, name, currency, avatar_url FROM profiles WHERE id = $1`,
        [profileId]
      );
      profileData = profileResult.rows[0] || null;
    }

    res.status(200).json({
      user: userResult.rows[0],
      profile: profileData,
    });
  } catch (error) {
    console.log("getSettingsController error:", error);
    res.status(500).json({ message: "Error fetching settings", error });
  } 
};

// PATCH profile settings (currency)
const updateProfileSettingsController = async (req, res) => {
  try {
    const profileId = req.profile?.id;
    const userId = req.user.id;
    const { currency } = req.body;

    if (!profileId) return res.status(400).json({ message: "No active profile" });
    if (!currency) return res.status(400).json({ message: "Currency is required" });

    const result = await pool.query(
      `UPDATE profiles SET currency = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [currency, profileId, userId]
    );

    res.status(200).json({ message: "Settings updated", profile: result.rows[0] });
  } catch (error) {
    console.log("updateProfileSettingsController error:", error);
    res.status(500).json({ message: "Error updating settings", error });
  }
};

// PATCH change password
const changePasswordController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new passwords are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const userResult = await pool.query(`SELECT password_hash FROM users WHERE id = $1`, [userId]);
    const user = userResult.rows[0];

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hashed, userId]);

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.log("changePasswordController error:", error);
    res.status(500).json({ message: "Error changing password", error });
  }
};

export { getSettingsController, updateProfileSettingsController, changePasswordController };
