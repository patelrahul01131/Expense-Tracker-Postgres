import express from "express";
import {
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
} from "../controller/groupController.js";
import authMiddleware from "../middleware/middleware.js";

const router = express.Router();

router.get("/", authMiddleware, getGroupsController);
router.post("/", authMiddleware, createGroupController);
router.get("/:groupId/members", authMiddleware, getGroupMembersController);
router.post("/:groupId/invite", authMiddleware, inviteToGroupController);
router.delete(
  "/:groupId/members/:memberId",
  authMiddleware,
  removeMemberController,
);

// Group Expenses
router.get("/:groupId/expenses", authMiddleware, getGroupExpensesController);
router.post("/:groupId/expenses", authMiddleware, addGroupExpenseController);
router.delete(
  "/:groupId/expenses/:expenseId",
  authMiddleware,
  deleteGroupExpenseController,
);

router.get("/:groupId/balances", authMiddleware, getGroupBalancesController);
router.post("/:groupId/settle", authMiddleware, settlePaymentController);
router.post("/settlements/:settlementId/confirm", authMiddleware, confirmSettlementController);
router.post("/accept-invite", authMiddleware, acceptGroupInviteController);
router.get("/notifications", authMiddleware, getNotificationsController);

export default router;
