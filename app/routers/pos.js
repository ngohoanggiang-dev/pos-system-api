const express = require("express");
const posRouter = express.Router();
const posController = require("../controllers/pos");
const { uploadService } = require("../services/upload");

posRouter.post("/api/getMartInfo", posController.getMartInfo);
posRouter.post("/api/getLastDate", posController.getLastDate);
posRouter.post("/api/syncProduct", uploadService.single("martFile"), posController.syncProduct);
posRouter.post("/api/sendLogFile", uploadService.single("file"), posController.sendLogFile);
posRouter.get("/api/getQueryFile/:martGroup/:martCode", posController.getQueryFile);
module.exports = posRouter;
