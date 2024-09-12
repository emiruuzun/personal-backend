const express = require("express");
const {
  getAccessToRoute,
  getAdminAccess,
} = require("../middlewares/authorization/auth");
const {
  getAllUserAdmin,
  deleteUserAdmin,
  toggleBlockUser,
  announcement,
  getAllLeave,
  statusUpdate,
  register,
  companyRegister,
  companyGetAll,
} = require("../controller/admin");

const router = express.Router();

router.use([getAccessToRoute, getAdminAccess]);
router.post("/register", register);
router.get("/alluser", getAllUserAdmin);
router.get("/deleteUserAdmin/:id", deleteUserAdmin);
router.get("/blokUser/:id", toggleBlockUser);
router.post("/announcement", announcement);
router.get("/leave/getAllleave", getAllLeave);
router.post("/leave/status-update", statusUpdate);
router.post("/company-register", companyRegister);
router.get("/company-gelAll", companyGetAll);

module.exports = router;
