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
  addDailyWorkRecord,
  updateDailyWorkRecord,
  getDailyWorkRecords,
  deleteDailyWorkRecord,
  getWorkRecordsByDateRange,
  getLastLeaveByUserId,
  deleteCompany,
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
router.post("/daily-work-record/add", addDailyWorkRecord);
router.post("/daily-work-record/update/:id", updateDailyWorkRecord);
router.get("/daily-work-records", getDailyWorkRecords);
router.get("/daily-work-record/delete/:id", deleteDailyWorkRecord);
router.get("/work-records-by-date-range", getWorkRecordsByDateRange);
router.post("/leaves/last", getLastLeaveByUserId);
router.get("/company/delete/:id", deleteCompany);

module.exports = router;
