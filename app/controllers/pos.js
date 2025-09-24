const logger = require("../../config/logger");
const AdmZip = require("adm-zip");
const appRoot = require("app-root-path");
const mime = require("mime-types");
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const posModel = require("../models/pos");

module.exports = class posController {
   static async getMartInfo(req, res, next) {
      const logbase = `/posController/getMartInfo: ${JSON.stringify(req.body)}`;
      try {
         const martCode = req.body.martCode;
         const martGroup = req.body.martGroup;
         if (martCode === undefined || martGroup === undefined) {
            return res.status(500).json({ result: false, data: null, message: "Mart code or mart group cannot null" });
         } else {
            const result = await posModel.getMartInfo(martCode, martGroup);
            if (result) {
               logger.writeLog("info", `${logbase} => Get Mart info success:  ${JSON.stringify(result)}`);
               return res.status(200).json({
                  result: true,
                  data: result,
                  message: "Get Mart info success",
               });
            } else {
               logger.writeLog("error", `${logbase} => Mart info doesn't exist`);
               return res.status(500).json({
                  result: false,
                  data: null,
                  message: "Mart info doesn't exist",
               });
            }
         }
      } catch (error) {
         logger.writeLog("error", `${logbase}: ${JSON.stringify(error)}`);
         return res.status(500).json({ result: false, data: null, message: error.message });
      }
   }
   static async getLastDate(req, res, next) {
      const logbase = `/posController/getLastDate: ${JSON.stringify(req.body)}`;
      try {
         const martCode = req.body.martCode;
         const martGroup = req.body.martGroup;
         if (martCode === undefined || martGroup === undefined) {
            return res.status(500).json({ result: false, data: null, message: "Mart code or mart group cannot null" });
         } else {
            const result = await posModel.getLastDate(martCode, martGroup);
            if (result) {
               logger.writeLog("info", `${logbase} => Get info success: ${JSON.stringify(result)}`);
               return res.status(200).json({
                  result: true,
                  data: result,
                  message: "Get info success",
               });
            } else {
               logger.writeLog("error", `${logbase} => Info doesn't exist`);
               return res.status(500).json({
                  result: false,
                  data: null,
                  message: "Info doesn't exist",
               });
            }
         }
      } catch (error) {
         logger.writeLog("error", `${logbase}: ${JSON.stringify(error)}`);
         return res.status(500).json({ result: false, data: null, message: error.message });
      }
   }

   static async getQueryFile(req, res, next) {
      const logbase = `/posController/getLastDate: ${JSON.stringify(req.params)}`;

      try {
         const martCode = req.params.martCode;
         const martGroup = req.params.martGroup;

         // Validate input
         if (martCode === undefined || martGroup === undefined) {
            return res.send(null);
         }

         // Query to get the file name
         const result = await posModel.getQueryFile(martCode, martGroup);

         if (!result) {
            // If no file name found, return null
            logger.writeLog("error", `${logbase} => File info not found`);
            return res.send(null);
         }

         const fileName = result.FILE_NAME;

         const fileFullPath = appRoot + "/public/query-files/" + fileName;
         logger.writeLog("info", `${logbase}: fileFullPath: ${fileFullPath}`);

         if (!fs.existsSync(fileFullPath)) {
            // If file doesn't exist, return blank
            return res.send(null);
         }

         const mimetype = mime.lookup(fileFullPath); // Get MIME type of the file

         if (!mimetype) {
            // If mime type is not found, return null
            return res.send(null);
         }

         // Set headers before sending the file
         res.setHeader("Content-disposition", "attachment; filename=" + fileName);
         res.setHeader("Content-type", mimetype);

         // Create file stream and pipe to response
         const filestream = fs.createReadStream(fileFullPath);
         filestream.pipe(res);
      } catch (error) {
         logger.writeLog("error", `${logbase}: ${JSON.stringify(error)}`);
         return res.send(null);
      }
   }
   static async syncProduct(req, res, next) {
      const logbase = `/posController/syncProduct: ${JSON.stringify(req.body)}`;

      try {
         const syncTime = moment().format("YYYY-MM-DD HH:mm:ss");
         const martCode = req.body.martCode;
         const martGroup = req.body.martGroup;
         const isLastFile = req.body.isLastFile;

         if (martCode === undefined || martGroup === undefined || isLastFile === undefined) {
            return res.status(500).json({ result: false, data: null, message: "Mart code or mart group or isLastFile cannot null" });
         }
         if (!req.file) {
            return res.status(500).json({ result: false, data: false, message: "Mart file cannot null" });
         }

         // parse JSON
         const jsonString = req.file.buffer.toString("utf-8");
         const jsonData = JSON.parse(jsonString);

         logger.writeLog("info", `${logbase} => length data of file sync: ${jsonData.length ?? 0}`);
         const result = await posModel.syncProduct(syncTime, martCode, martGroup, isLastFile, jsonData);
         if (result) {
            return res.status(200).json({ result: true, data: true, message: "Sync product success" });
         } else {
            return res.status(500).json({ result: false, data: false, error: "Sync product failed" });
         }
      } catch (error) {
         logger.writeLog("error", `${logbase}: ${JSON.stringify(error)}`);
         return res.status(500).json({ result: false, data: null, message: error.message });
      }
   }
   static async sendLogFile(req, res, next) {
      const logbase = `/posController/sendLogFile`;

      try {
         if (!req.file) {
            return res.status(500).json({ result: false, message: "File cannot null" });
         }

         if (!req.file.originalname.endsWith(".zip")) {
            return res.status(500).json({ result: false, message: "File is not .zip" });
         }

         const zip = new AdmZip(req.file.buffer); // <--  buffer
         const targetDirectory = path.join(__dirname, "../../public/pos-logs");

         // Create directory if it doesn't exist
         if (!fs.existsSync(targetDirectory)) {
            fs.mkdirSync(targetDirectory);
         }

         const zipEntries = zip.getEntries();
         const currentDate = moment().format("YYYY-MM-DD");
         zipEntries.forEach((entry) => {
            const entryName = entry.entryName;

            // Skip hidden files/folders
            if (entryName.startsWith(".") || entryName.startsWith("_")) {
               return;
            }

            // Add date prefix to filename
            const fileName = path.basename(entryName); // Just the filename
            const relativeDir = path.dirname(entryName); // Preserve subfolder if needed

            const newFileName = `${currentDate}-${fileName}`;
            const entryPath = path.join(targetDirectory, relativeDir, newFileName);
            const entryDir = path.dirname(entryPath);

            // Create directory if it doesn't exist
            if (!fs.existsSync(entryDir)) {
               fs.mkdirSync(entryDir, { recursive: true });
            }

            // Write file
            if (!entry.isDirectory) {
               fs.writeFileSync(entryPath, entry.getData());
            }
         });
         logger.writeLog("info", `${logbase}: Unzip and Save log successfull`);

         return res.status(200).json({ result: true, data: true, message: "Unzip and Save log successfull" });
      } catch (error) {
         logger.writeLog("error", `${logbase}: ${JSON.stringify(error)}`);
         return res.status(500).json({ result: false, data: false, message: error.message });
      }
   }
};
