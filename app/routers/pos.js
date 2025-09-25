const express = require("express");
const posRouter = express.Router();
const posController = require("../controllers/pos");
const { uploadService } = require("../services/upload");

posRouter.post("/v1/getMartInfo", posController.getMartInfo);
posRouter.post("/v1/getLastDate", posController.getLastDate);
posRouter.post("/v1/syncProduct", uploadService.single("martFile"), posController.syncProduct);
posRouter.post("/v1/sendLogFile", uploadService.single("file"), posController.sendLogFile);
posRouter.get("/v1/getQueryFile/:martGroup/:martCode", posController.getQueryFile);
module.exports = posRouter;
