const express = require("express");
const { leaveSave, leaveGet } = require("../controller/leaveForm");
const { getAccessToRoute } = require("../middlewares/authorization/auth");

// api router
const router = express.Router();

router.post("/save", getAccessToRoute, leaveSave);
router.get("/leave-get", getAccessToRoute, leaveGet);

module.exports = router;
