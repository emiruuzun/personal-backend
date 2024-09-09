const express = require("express");
const auth = require("./auth");
const leave = require("./leave");
const admin = require("./admin");

const router = express.Router();

router.use("/auth", auth);
router.use("/admin", admin);
router.use("/leave", leave);

module.exports = router;
