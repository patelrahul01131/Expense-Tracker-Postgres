import pool from "../db/db.js";

const getGroupsController = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(400).json({ message: "No user found" });

    // Fetch all groups where this user is a member
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
        WHERE gm.user_id = $1
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
    const userId = req.user?.id;
    const { name, description } = req.body;
    const groupResult = await pool.query(
      `INSERT INTO groups (name, description, created_by_user_id) VALUES ($1, $2, $3) RETURNING *`,
      [name, description || null, userId],
    );
    const group = groupResult.rows[0];

    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [group.id, userId],
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

    // Verify membership at user level
    const memberCheck = await pool.query(
      `SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId],
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    const result = await pool.query(
      `SELECT 
          gm.id AS membership_id,
          gm.role,
          u.id AS user_id,
          u.id AS profile_id, -- Keep profile_id for frontend compatibility, using user_id
          u.id AS id,         -- Added 'id' field for frontend compatibility
          u.full_name,
          u.full_name AS profile_name,
          u.email,
          (SELECT avatar_url FROM profiles WHERE user_id = u.id ORDER BY created_at ASC LIMIT 1) AS avatar_url
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = $1
        ORDER BY gm.joined_at ASC`,
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

    // Verify requester is admin of this group (via user level)
    const adminCheck = await pool.query(
      `SELECT id FROM group_members 
       WHERE group_id = $1 AND user_id = $2 AND role = 'admin'`,
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

    // Check: is user already a member of this group?
    const existingMember = await pool.query(
      `SELECT id FROM group_members 
       WHERE group_id = $1 AND user_id = $2`,
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
      // Check if already a member (safety)
      const memberCheck = await client.query(
        `SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2`,
        [groupId, userId],
      );

      if (memberCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')`,
          [groupId, userId],
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

    // Check if requester is admin via user level
    const adminCheck = await pool.query(
      `SELECT id FROM group_members 
       WHERE group_id = $1 AND user_id = $2 AND role = 'admin'`,
      [groupId, requestingUserId],
    );

    // Check if removing own user
    const isSelf = memberId === requestingUserId;

    if (!isSelf && adminCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Only admins can remove members" });
    }

    await pool.query(
      `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`,
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
      `SELECT id FROM group_members 
       WHERE group_id = $1 AND user_id = $2`,
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
          ge.paid_by_user_id AS paid_by_profile_id, -- Keep field name for frontend
          u.full_name AS added_by_name,
          u.full_name AS added_by_profile,
          (SELECT avatar_url FROM profiles WHERE user_id = u.id ORDER BY created_at ASC LIMIT 1) AS added_by_avatar,
          c.name AS category_name,
          c.color AS category_color,
          COALESCE((
            SELECT json_agg(json_build_object(
              'id', ges.id,
              'profile_id', ges.user_id, -- Return user_id as profile_id
              'user_id', ges.user_id,
              'amount', ges.amount,
              'percent', ges.percent,
              'status', ges.status,
              'name', u_split.full_name,
              'full_name', u_split.full_name
            ))
            FROM group_expense_splits ges
            JOIN users u_split ON ges.user_id = u_split.id
            WHERE ges.expense_id = ge.id
          ), '[]'::json) AS splits
        FROM group_expenses ge
        JOIN users u ON ge.paid_by_user_id = u.id
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
      `SELECT id FROM group_members 
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId],
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    if (!splits || !Array.isArray(splits) || splits.length === 0) {
      return res
        .status(400)
        .json({
          message:
            "Split details are required. Every expense must be shared with at least one person (including yourself).",
        });
    }

    await client.query("BEGIN");

    // 1. Insert the main expense
    const result = await client.query(
      `INSERT INTO group_expenses 
        (group_id, paid_by_user_id, title, total_amount, expense_type, expense_date, category_id, notes, split_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        groupId,
        userId,
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
        // Resolve user_id if profile_id was passed
        let targetUserId = split.user_id || split.profile_id;

        // If it's a profile_id, it might need resolution.
        // But in our new system, profile_id IS user_id in the frontend.
        // We check if it exists in users table first.
        const userCheck = await client.query(
          "SELECT id FROM users WHERE id = $1",
          [targetUserId],
        );

        if (userCheck.rows.length === 0) {
          // Maybe it's a real legacy profile_id
          const profileRes = await client.query(
            "SELECT user_id FROM profiles WHERE id = $1",
            [targetUserId],
          );
          if (profileRes.rows.length > 0) {
            targetUserId = profileRes.rows[0].user_id;
          } else {
            // Not found in users or profiles, skip
            continue;
          }
        }

        const splitStatus = targetUserId === userId ? "paid" : "pending";

        await client.query(
          `INSERT INTO group_expense_splits (expense_id, user_id, amount, percent, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            expense.id,
            targetUserId,
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
    // 1. Get aggregated pending debts for individual display (grouped by pair)
    const debtsResult = await pool.query(
      `SELECT 
          ge.paid_by_user_id AS paid_by_profile_id,
          ges.user_id AS owes_profile_id,
          SUM(ges.amount) as amount,
          u1.full_name AS paid_by_name,
          u2.full_name AS owes_name,
          u1.full_name AS paid_by_full_name,
          u2.full_name AS owes_full_name
       FROM group_expenses ge
       JOIN group_expense_splits ges ON ge.id = ges.expense_id
       JOIN users u1 ON ge.paid_by_user_id = u1.id
       JOIN users u2 ON ges.user_id = u2.id
       WHERE ge.group_id = $1 
       AND ges.status = 'pending' 
       AND ges.user_id != ge.paid_by_user_id
       GROUP BY ge.paid_by_user_id, ges.user_id, u1.full_name, u2.full_name`,
      [groupId],
    );

    // 2. Get total paid in expenses per user
    const paidInExpenses = await pool.query(
      `SELECT paid_by_user_id as pid, SUM(total_amount) as amount
       FROM group_expenses WHERE group_id = $1 GROUP BY paid_by_user_id`,
      [groupId],
    );

    // 3. Get total shares of expenses per user
    const sharesOfExpenses = await pool.query(
      `SELECT user_id as pid, SUM(amount) as amount
       FROM group_expense_splits ges
       JOIN group_expenses ge ON ges.expense_id = ge.id
       WHERE ge.group_id = $1 GROUP BY user_id`,
      [groupId],
    );

    // 4. Get total settlements paid/received per user
    const settlementsPaid = await pool.query(
      `SELECT from_user_id as pid, SUM(amount) as amount
       FROM group_settlements WHERE group_id = $1 AND status = 'completed' GROUP BY from_user_id`,
      [groupId],
    );
    const settlementsRecv = await pool.query(
      `SELECT to_user_id as pid, SUM(amount) as amount
       FROM group_settlements WHERE group_id = $1 AND status = 'completed' GROUP BY to_user_id`,
      [groupId],
    );

    // 5. Build net balances map
    const netBalances = {};
    const membersRes = await pool.query(
      `SELECT user_id as pid FROM group_members WHERE group_id = $1`,
      [groupId],
    );
    membersRes.rows.forEach((m) => (netBalances[m.pid] = 0));

    paidInExpenses.rows.forEach(
      (r) =>
        (netBalances[r.pid] = (netBalances[r.pid] || 0) + Number(r.amount)),
    );
    sharesOfExpenses.rows.forEach(
      (r) =>
        (netBalances[r.pid] = (netBalances[r.pid] || 0) - Number(r.amount)),
    );
    settlementsPaid.rows.forEach(
      (r) =>
        (netBalances[r.pid] = (netBalances[r.pid] || 0) + Number(r.amount)),
    );
    settlementsRecv.rows.forEach(
      (r) =>
        (netBalances[r.pid] = (netBalances[r.pid] || 0) - Number(r.amount)),
    );

    // Convert net balances into the "debts" format the frontend expects for netting
    const settlementsResult = await pool.query(
      `SELECT 
          gs.id, 
          gs.amount, 
          gs.status, 
          gs.confirmed, 
          gs.created_at, 
          gs.from_user_id,
          gs.to_user_id,
          u1.full_name AS from_name, 
          u2.full_name AS to_name
       FROM group_settlements gs
       JOIN users u1 ON gs.from_user_id = u1.id
       JOIN users u2 ON gs.to_user_id = u2.id
       WHERE gs.group_id = $1
       ORDER BY gs.created_at DESC`,
      [groupId],
    );

    res.status(200).json({
      debts: debtsResult.rows,
      settlements: settlementsResult.rows,
      netBalances,
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

    // Resolve the actual user IDs
    let effectiveFromId = from_profile_id;
    let effectiveToId = to_profile_id;

    // Check if they are user IDs first
    const fromUserCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [from_profile_id],
    );
    if (fromUserCheck.rows.length === 0) {
      const fromRes = await pool.query(
        "SELECT user_id FROM profiles WHERE id = $1",
        [from_profile_id],
      );
      if (fromRes.rows.length > 0) effectiveFromId = fromRes.rows[0].user_id;
    }

    const toUserCheck = await pool.query("SELECT id FROM users WHERE id = $1", [
      to_profile_id,
    ]);
    if (toUserCheck.rows.length === 0) {
      const toRes = await pool.query(
        "SELECT user_id FROM profiles WHERE id = $1",
        [to_profile_id],
      );
      if (toRes.rows.length > 0) effectiveToId = toRes.rows[0].user_id;
    }

    await client.query("BEGIN");

    // Check for existing pending settlement
    const existing = await client.query(
      `SELECT id FROM group_settlements 
       WHERE group_id = $1 AND from_user_id = $2 AND to_user_id = $3 AND status = 'pending'`,
      [groupId, effectiveFromId, effectiveToId],
    );
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message:
          "A settlement request is already pending between these members",
      });
    }

    // 1. Create the settlement record
    const settlementRes = await client.query(
      `INSERT INTO group_settlements (group_id, from_user_id, to_user_id, amount, status, confirmed, split_id)
       VALUES ($1, $2, $3, $4, 'pending', FALSE, $5)
       RETURNING *`,
      [groupId, effectiveFromId, effectiveToId, amount, split_id],
    );
    const settlement = settlementRes.rows[0];

    // 2. Create notification for the recipient
    await client.query(
      `INSERT INTO notifications (user_id, group_id, sender_id, type, data)
       VALUES ($1, $2, $3, 'settlement_request', $4)`,
      [
        effectiveToId,
        groupId,
        userId,
        JSON.stringify({ settlement_id: settlement.id, amount, split_id }),
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

    const splitId = settlement.split_id;

    // 1. Update settlement
    const isConfirmed = status === "accepted";
    await client.query(
      `UPDATE group_settlements 
       SET confirmed = $1, confirmed_at = CURRENT_TIMESTAMP, status = $2 
       WHERE id = $3`,
      [isConfirmed, isConfirmed ? "completed" : "failed", settlementId],
    );

    // 2. Handle split status updates
    if (isConfirmed) {
      if (splitId) {
        // Specific split settlement
        await client.query(
          `UPDATE group_expense_splits SET status = 'paid' WHERE id = $1`,
          [splitId],
        );
      } else {
        // Overall settlement: Auto-apply to pending splits to clear "Pending" statuses
        let availableFunds = Number(settlement.amount);

        // 1. Mark reciprocal splits (where recipient owes sender) as paid (Netting)
        const reciprocalSplits = await client.query(
          `SELECT ges.id, ges.amount 
           FROM group_expense_splits ges
           JOIN group_expenses ge ON ges.expense_id = ge.id
           WHERE ge.group_id = $1 
             AND ges.user_id = $2 
             AND ge.paid_by_user_id = $3 
             AND ges.status = 'pending'`,
          [settlement.group_id, settlement.to_user_id, settlement.from_user_id],
        );

        for (const split of reciprocalSplits.rows) {
          await client.query(
            `UPDATE group_expense_splits SET status = 'paid' WHERE id = $1`,
            [split.id],
          );
          availableFunds += Number(split.amount);
        }

        // 2. Mark direct splits (where sender owes recipient) as paid
        const directSplits = await client.query(
          `SELECT ges.id, ges.amount 
           FROM group_expense_splits ges
           JOIN group_expenses ge ON ges.expense_id = ge.id
           WHERE ge.group_id = $1 
             AND ges.user_id = $2 
             AND ge.paid_by_user_id = $3 
             AND ges.status = 'pending'
           ORDER BY ge.expense_date ASC, ge.created_at ASC`,
          [settlement.group_id, settlement.from_user_id, settlement.to_user_id],
        );

        for (const split of directSplits.rows) {
          if (availableFunds <= 0.01) break;
          const splitAmt = Number(split.amount);

          if (availableFunds >= splitAmt - 0.01) {
            await client.query(
              `UPDATE group_expense_splits SET status = 'paid' WHERE id = $1`,
              [split.id],
            );
            availableFunds -= splitAmt;
          }
        }
      }
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

const markNotificationReadController = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.id;

    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
      [notificationId, userId],
    );

    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Error updating notification" });
  }
};

const deleteGroupExpenseController = async (req, res) => {
  try {
    const { groupId, expenseId } = req.params;
    const userId = req.user?.id;
    const profileId = req.profile?.id;

    // Only the expense creator or an admin can delete
    const expenseCheck = await pool.query(
      `SELECT id, paid_by_user_id FROM group_expenses 
       WHERE id = $1 AND group_id = $2`,
      [expenseId, groupId],
    );
    if (expenseCheck.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const isOwner = expenseCheck.rows[0].paid_by_user_id === userId;
    const adminCheck = await pool.query(
      `SELECT id FROM group_members 
       WHERE group_id = $1 AND user_id = $2 AND role = 'admin'`,
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

const remindPaymentController = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { from_profile_id, to_profile_id, amount } = req.body;
    const userId = req.user?.id;

    if (!from_profile_id || !to_profile_id || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Resolve the debtor's user ID (from_profile_id might be a profile ID or user ID)
    let targetDebtorId = from_profile_id;
    const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [
      from_profile_id,
    ]);
    if (userCheck.rows.length === 0) {
      const profileRes = await pool.query(
        "SELECT user_id FROM profiles WHERE id = $1",
        [from_profile_id],
      );
      if (profileRes.rows.length > 0)
        targetDebtorId = profileRes.rows[0].user_id;
    }

    // Create notification for the debtor
    await pool.query(
      `INSERT INTO notifications (user_id, group_id, sender_id, type, data)
       VALUES ($1, $2, $3, 'payment_reminder', $4)`,
      [
        targetDebtorId,
        groupId,
        userId,
        JSON.stringify({ amount, message: "Please settle your pending debt" }),
      ],
    );

    res.status(200).json({ message: "Reminder sent successfully" });
  } catch (error) {
    console.log("remindPaymentController error:", error);
    res.status(500).json({ message: "Error sending reminder", error });
  }
};

export {
  inviteToGroupController,
  removeMemberController,
  getGroupExpensesController,
  addGroupExpenseController,
  deleteGroupExpenseController,
  getGroupBalancesController,
  settlePaymentController,
  confirmSettlementController,
  getNotificationsController,
  acceptGroupInviteController,
  getGroupsController,
  createGroupController,
  getGroupMembersController,
  remindPaymentController,
  markNotificationReadController,
};
