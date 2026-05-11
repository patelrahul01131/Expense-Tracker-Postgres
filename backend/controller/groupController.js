import pool from "../db/db.js";

const getGroupsController = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(400).json({ message: "No user found" });

    // Fetch all groups where ANY profile of this user is a member
    const result = await pool.query(
      `SELECT DISTINCT
          g.id,
          g.name,
          g.description,
          g.avatar_url,
          g.created_at,
          gm.role,
          (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count
        FROM groups g
        JOIN group_members gm ON g.id = gm.group_id
        JOIN profiles p ON gm.profile_id = p.id
        WHERE p.user_id = $1
        ORDER BY g.created_at DESC`,
      [userId],
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.log("getGroupsController error:", error);
    res.status(500).json({ message: "Error fetching groups", error });
  }
};

const createGroupController = async (req, res) => {
  try {
    const profileId = req.profile?.id;
    const { name, description } = req.body;

    if (!name)
      return res.status(400).json({ message: "Group name is required" });

    const groupResult = await pool.query(
      `INSERT INTO groups (name, description, created_by_profile_id) VALUES ($1, $2, $3) RETURNING *`,
      [name, description || null, profileId],
    );
    const group = groupResult.rows[0];

    const userId = req.user?.id;
    await pool.query(
      `INSERT INTO group_members (group_id, profile_id, user_id, role) VALUES ($1, $2, $3, 'admin')`,
      [group.id, profileId, userId],
    );

    res.status(201).json({ message: "Group created successfully", group });
  } catch (error) {
    console.log("createGroupController error:", error);
    res.status(500).json({ message: "Error creating group", error });
  }
};

// Get members of a group
const getGroupMembersController = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user?.id;

    // Verify requesting user is a member via any of their profiles
    const memberCheck = await pool.query(
      `SELECT gm.id FROM group_members gm
       JOIN profiles p ON gm.profile_id = p.id
       WHERE gm.group_id = $1 AND p.user_id = $2`,
      [groupId, userId],
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    const result = await pool.query(
      `SELECT 
          gm.id,
          gm.role,
          p.id AS profile_id,
          p.name AS profile_name,
          p.avatar_url,
          u.full_name,
          u.email
        FROM group_members gm
        JOIN profiles p ON gm.profile_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE gm.group_id = $1
        ORDER BY gm.id ASC`,
      [groupId],
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.log("getGroupMembersController error:", error);
    res.status(500).json({ message: "Error fetching members", error });
  }
};

// Invite a user to a group by their email
const inviteToGroupController = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { email } = req.body;
    const requestingUserId = req.user?.id;

    if (!email) return res.status(400).json({ message: "Email is required" });

    // Verify requester is admin of this group (via any of their profiles)
    const adminCheck = await pool.query(
      `SELECT gm.id FROM group_members gm
       JOIN profiles p ON gm.profile_id = p.id
       WHERE gm.group_id = $1 AND p.user_id = $2 AND gm.role = 'admin'`,
      [groupId, requestingUserId],
    );
    if (adminCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Only admins can invite members" });
    }

    // Find the target user by email
    const userResult = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [email],
    );
    if (userResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No user found with that email address" });
    }
    const targetUserId = userResult.rows[0].id;

    // Can't invite yourself
    if (targetUserId === requestingUserId) {
      return res
        .status(400)
        .json({ message: "You cannot invite yourself to a group" });
    }

    // Check: is any profile of this user already a member of this group?
    const existingMember = await pool.query(
      `SELECT gm.id FROM group_members gm
       JOIN profiles p ON gm.profile_id = p.id
       WHERE gm.group_id = $1 AND p.user_id = $2`,
      [groupId, targetUserId],
    );
    if (existingMember.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "This user is already a member of this group" });
    }

    // Get group name for notification
    const groupRes = await pool.query("SELECT name FROM groups WHERE id = $1", [
      groupId,
    ]);
    const groupName = groupRes.rows[0].name;

    // Send notification
    await pool.query(
      `INSERT INTO notifications (user_id, group_id, sender_id, type, data)
       VALUES ($1, $2, $3, 'group_invite', $4)`,
      [targetUserId, groupId, requestingUserId, { group_name: groupName }],
    );

    res.status(200).json({ message: "Invitation sent!" });
  } catch (error) {
    console.log("inviteToGroupController error:", error);
    res.status(500).json({ message: "Error inviting member", error });
  }
};

const acceptGroupInviteController = async (req, res) => {
  const client = await pool.connect();
  try {
    const { notificationId, status } = req.body; // status: accepted or rejected
    const userId = req.user?.id;

    if (!notificationId || !status) {
      return res
        .status(400)
        .json({ message: "Notification ID and status are required" });
    }

    await client.query("BEGIN");

    // Get notification details
    const notifRes = await client.query(
      `SELECT * FROM notifications WHERE id = $1 AND user_id = $2 AND type = 'group_invite'`,
      [notificationId, userId],
    );

    if (notifRes.rows.length === 0) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    const notification = notifRes.rows[0];
    const groupId = notification.group_id;

    if (status === "accepted") {
      // Find or create default profile for this user
      let profileRes = await client.query(
        `SELECT id FROM profiles WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
        [userId],
      );

      let profileId;
      if (profileRes.rows.length === 0) {
        // Create a default profile if none exists
        const userRes = await client.query(
          "SELECT full_name FROM users WHERE id = $1",
          [userId],
        );
        const fullName = userRes.rows[0].full_name;
        const newProfile = await client.query(
          `INSERT INTO profiles (user_id, name, type) VALUES ($1, $2, 'personal') RETURNING id`,
          [userId, fullName],
        );
        profileId = newProfile.rows[0].id;
      } else {
        profileId = profileRes.rows[0].id;
      }

      // Check if already a member (safety)
      const memberCheck = await client.query(
        `SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2`,
        [groupId, userId],
      );

      if (memberCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO group_members (group_id, profile_id, user_id, role) VALUES ($1, $2, $3, 'member')`,
          [groupId, profileId, userId],
        );
      }
    }

    // Mark notification as read
    await client.query(
      `UPDATE notifications SET is_read = TRUE, status = $1 WHERE id = $2`,
      [status, notificationId],
    );

    await client.query("COMMIT");
    res.status(200).json({ message: `Invitation ${status}` });
  } catch (error) {
    await client.query("ROLLBACK");
    console.log("acceptGroupInviteController error:", error);
    res.status(500).json({ message: "Error processing invitation", error });
  } finally {
    client.release();
  }
};

// Remove a member from a group
const removeMemberController = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const requestingUserId = req.user?.id;

    // Check if requester is admin via any profile
    const adminCheck = await pool.query(
      `SELECT gm.id FROM group_members gm
       JOIN profiles p ON gm.profile_id = p.id
       WHERE gm.group_id = $1 AND p.user_id = $2 AND gm.role = 'admin'`,
      [groupId, requestingUserId],
    );

    // Check if removing own profile
    const selfCheck = await pool.query(
      `SELECT gm.id FROM group_members gm
       JOIN profiles p ON gm.profile_id = p.id
       WHERE gm.group_id = $1 AND gm.profile_id = $2 AND p.user_id = $3`,
      [groupId, memberId, requestingUserId],
    );
    const isSelf = selfCheck.rows.length > 0;

    if (!isSelf && adminCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Only admins can remove members" });
    }

    await pool.query(
      `DELETE FROM group_members WHERE group_id = $1 AND profile_id = $2`,
      [groupId, memberId],
    );

    res.status(200).json({ message: "Member removed" });
  } catch (error) {
    console.log("removeMemberController error:", error);
    res.status(500).json({ message: "Error removing member", error });
  }
};

// ── Group Expenses ──

const getGroupExpensesController = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user?.id;

    // Verify membership
    const memberCheck = await pool.query(
      `SELECT gm.profile_id FROM group_members gm
       JOIN profiles p ON gm.profile_id = p.id
       WHERE gm.group_id = $1 AND p.user_id = $2`,
      [groupId, userId],
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    const result = await pool.query(
      `SELECT 
          ge.id,
          ge.title,
          ge.total_amount,
          ge.expense_type,
          ge.expense_date,
          ge.notes,
          ge.split_type,
          ge.created_at,
          ge.paid_by_profile_id,
          p.name AS added_by_profile,
          p.avatar_url AS added_by_avatar,
          u.full_name AS added_by_name,
          c.name AS category_name,
          c.color AS category_color,
          (
            SELECT json_agg(json_build_object(
              'id', ges.id,
              'profile_id', ges.profile_id,
              'amount', ges.amount,
              'percent', ges.percent,
              'status', ges.status,
              'name', p_split.name,
              'full_name', u_split.full_name
            ))
            FROM group_expense_splits ges
            JOIN profiles p_split ON ges.profile_id = p_split.id
            JOIN users u_split ON p_split.user_id = u_split.id
            WHERE ges.expense_id = ge.id
          ) AS splits
        FROM group_expenses ge
        JOIN profiles p ON ge.paid_by_profile_id = p.id
        JOIN users u ON p.user_id = u.id
        LEFT JOIN categories c ON ge.category_id = c.id
        WHERE ge.group_id = $1
        ORDER BY ge.expense_date DESC, ge.created_at DESC`,
      [groupId],
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.log("getGroupExpensesController error:", error);
    res.status(500).json({ message: "Error fetching group expenses", error });
  }
};

const addGroupExpenseController = async (req, res) => {
  const client = await pool.connect();
  try {
    const { groupId } = req.params;
    const userId = req.user?.id;
    const profileId = req.profile?.id;
    const {
      title,
      amount,
      expense_type,
      expense_date,
      category_id,
      notes,
      split_type, // 'equal', 'percent', 'value', 'item'
      splits, // array of { profile_id, amount, percent }
    } = req.body;

    if (!title || !amount || !expense_date) {
      return res
        .status(400)
        .json({ message: "Title, amount, and date are required" });
    }

    // Verify membership
    const memberCheck = await pool.query(
      `SELECT gm.id FROM group_members gm
       JOIN profiles p ON gm.profile_id = p.id
       WHERE gm.group_id = $1 AND p.user_id = $2`,
      [groupId, userId],
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    await client.query("BEGIN");

    // 1. Insert the main expense
    const result = await client.query(
      `INSERT INTO group_expenses 
        (group_id, paid_by_profile_id, title, total_amount, expense_type, expense_date, category_id, notes, split_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        groupId,
        profileId,
        title,
        amount,
        expense_type || "expense",
        expense_date,
        category_id || null,
        notes || null,
        split_type || "equal",
      ],
    );
    const expense = result.rows[0];

    // 2. Insert splits
    if (splits && splits.length > 0) {
      for (const split of splits) {
        // Automatically mark the payer's share as paid
        const splitStatus = split.profile_id === profileId ? "paid" : "pending";

        await client.query(
          `INSERT INTO group_expense_splits (expense_id, profile_id, amount, percent, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            expense.id,
            split.profile_id,
            split.amount,
            split.percent || null,
            splitStatus,
          ],
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "Expense added with splits", expense });
  } catch (error) {
    await client.query("ROLLBACK");
    console.log("addGroupExpenseController error:", error);
    res.status(500).json({ message: "Error adding group expense", error });
  } finally {
    client.release();
  }
};

const getGroupBalancesController = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user?.id;

    // 1. Get all pending splits (who owes whom)
    const debtsResult = await pool.query(
      `SELECT 
          ge.paid_by_profile_id,
          ges.id AS split_id,
          ges.profile_id AS owes_profile_id,
          ges.amount,
          p1.name AS paid_by_name,
          p2.name AS owes_name,
          u1.full_name AS paid_by_full_name,
          u2.full_name AS owes_full_name
       FROM group_expenses ge
       JOIN group_expense_splits ges ON ge.id = ges.expense_id
       JOIN profiles p1 ON ge.paid_by_profile_id = p1.id
       JOIN profiles p2 ON ges.profile_id = p2.id
       JOIN users u1 ON p1.user_id = u1.id
       JOIN users u2 ON p2.user_id = u2.id
       WHERE ge.group_id = $1 
       AND ges.status = 'pending' 
       AND ges.profile_id != ge.paid_by_profile_id`,
      [groupId],
    );

    // 2. Get all settlements with full details
    const settlementsResult = await pool.query(
      `SELECT 
          gs.id, 
          gs.amount, 
          gs.status, 
          gs.confirmed, 
          gs.created_at, 
          u1.full_name AS from_name, 
          u2.full_name AS to_name
       FROM group_settlements gs
       JOIN profiles p1 ON gs.from_profile_id = p1.id
       JOIN users u1 ON p1.user_id = u1.id
       JOIN profiles p2 ON gs.to_profile_id = p2.id
       JOIN users u2 ON p2.user_id = u2.id
       WHERE gs.group_id = $1
       ORDER BY gs.created_at DESC`,
      [groupId],
    );

    // 3. Process balances (simplified)
    // In a real app, you'd use a debt simplification algorithm (Simplify Debts)
    // For now, let's just return raw debts
    res.status(200).json({
      debts: debtsResult.rows,
      settlements: settlementsResult.rows,
    });
  } catch (error) {
    console.log("getGroupBalancesController error:", error);
    res.status(500).json({ message: "Error fetching balances", error });
  }
};

const settlePaymentController = async (req, res) => {
  const client = await pool.connect();
  try {
    const { groupId } = req.params;
    const { from_profile_id, to_profile_id, amount, split_id } = req.body;
    const userId = req.user?.id;

    if (!from_profile_id || !to_profile_id || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await client.query("BEGIN");

    // 1. Create the settlement record
    const settlementRes = await client.query(
      `INSERT INTO group_settlements (group_id, from_profile_id, to_profile_id, amount, status, confirmed)
       VALUES ($1, $2, $3, $4, 'pending', FALSE)
       RETURNING *`,
      [groupId, from_profile_id, to_profile_id, amount],
    );
    const settlement = settlementRes.rows[0];

    // 2. Get the target user ID (the one receiving the money)
    const targetProfileRes = await client.query(
      `SELECT user_id FROM profiles WHERE id = $1`,
      [to_profile_id],
    );
    const targetUserId = targetProfileRes.rows[0].user_id;

    // 3. Create a notification for the recipient
    await client.query(
      `INSERT INTO notifications (user_id, sender_id, group_id, type, data, status)
       VALUES ($1, $2, $3, 'settlement_request', $4, 'pending')`,
      [
        targetUserId,
        userId,
        groupId,
        JSON.stringify({
          settlement_id: settlement.id,
          amount,
          from_profile_id,
          split_id: split_id || null,
        }),
      ],
    );

    await client.query("COMMIT");
    res.status(201).json({
      message: "Settlement request sent. Waiting for confirmation.",
      settlement,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.log("settlePaymentController error:", error);
    res.status(500).json({ message: "Error settling payment", error });
  } finally {
    client.release();
  }
};

const confirmSettlementController = async (req, res) => {
  const client = await pool.connect();
  try {
    const { settlementId } = req.params;
    const { status } = req.body; // 'accepted' or 'rejected'
    const userId = req.user?.id;

    await client.query("BEGIN");

    // 0. Fetch settlement details
    const settlementInfo = await client.query(
      `SELECT s.*, n.data FROM group_settlements s 
       JOIN notifications n ON (n.data->>'settlement_id')::uuid = s.id
       WHERE s.id = $1`,
      [settlementId],
    );

    if (settlementInfo.rows.length === 0) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    const settlement = settlementInfo.rows[0];

    // Prevent re-processing
    if (settlement.status !== "pending") {
      return res.status(400).json({ message: "Settlement already processed" });
    }

    const splitId = settlement.data?.split_id;

    // 1. Update settlement
    const isConfirmed = status === "accepted";
    await client.query(
      `UPDATE group_settlements 
       SET confirmed = $1, confirmed_at = CURRENT_TIMESTAMP, status = $2 
       WHERE id = $3`,
      [isConfirmed, isConfirmed ? "completed" : "failed", settlementId],
    );

    // 2. If split_id exists, mark split as paid
    if (isConfirmed && splitId) {
      await client.query(
        `UPDATE group_expense_splits SET status = 'paid' WHERE id = $1`,
        [splitId],
      );
    }

    // 3. Update notification
    await client.query(
      `UPDATE notifications 
       SET status = $1, is_read = TRUE 
       WHERE (data->>'settlement_id')::uuid = $2`,
      [status, settlementId],
    );

    await client.query("COMMIT");
    res.status(200).json({ message: `Settlement ${status}` });
  } catch (error) {
    await client.query("ROLLBACK");
    console.log("confirmSettlementController error:", error);
    res.status(500).json({ message: "Error confirming settlement", error });
  } finally {
    client.release();
  }
};

const getNotificationsController = async (req, res) => {
  try {
    const userId = req.user?.id;
    const result = await pool.query(
      `SELECT n.*, u.full_name AS sender_name, g.name AS group_name
       FROM notifications n
       JOIN users u ON n.sender_id = u.id
       JOIN groups g ON n.group_id = g.id
       WHERE n.user_id = $1 AND n.is_read = FALSE
       ORDER BY n.created_at DESC`,
      [userId],
    );
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications" });
  }
};

const deleteGroupExpenseController = async (req, res) => {
  try {
    const { groupId, expenseId } = req.params;
    const userId = req.user?.id;
    const profileId = req.profile?.id;

    // Only the expense creator or an admin can delete
    const expenseCheck = await pool.query(
      `SELECT ge.id, ge.paid_by_profile_id FROM group_expenses ge
       WHERE ge.id = $1 AND ge.group_id = $2`,
      [expenseId, groupId],
    );
    if (expenseCheck.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const isOwner = expenseCheck.rows[0].paid_by_profile_id === profileId;
    const adminCheck = await pool.query(
      `SELECT gm.id FROM group_members gm
       JOIN profiles p ON gm.profile_id = p.id
       WHERE gm.group_id = $1 AND p.user_id = $2 AND gm.role = 'admin'`,
      [groupId, userId],
    );
    const isAdmin = adminCheck.rows.length > 0;

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "You can only delete your own expenses" });
    }

    await pool.query(`DELETE FROM group_expenses WHERE id = $1`, [expenseId]);
    res.status(200).json({ message: "Expense deleted" });
  } catch (error) {
    console.log("deleteGroupExpenseController error:", error);
    res.status(500).json({ message: "Error deleting expense", error });
  }
};

export {
  getGroupsController,
  createGroupController,
  getGroupMembersController,
  inviteToGroupController,
  acceptGroupInviteController,
  removeMemberController,
  getGroupExpensesController,
  addGroupExpenseController,
  deleteGroupExpenseController,
  getGroupBalancesController,
  settlePaymentController,
  confirmSettlementController,
  getNotificationsController,
};
