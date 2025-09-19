const express = require("express");
const app = express();
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const ini = require("ini");
app.use(express.json());
// const pool = mysql.createPool({ host: "13.124.26.102", user: "moadev", password: "Ectus!2#", database: "test_moa_platform" });
const pool = mysql.createPool({ host: "127.0.0.1", user: "moadev", password: "Ectus!2#", database: "test_moa_platform" });
const SECRET_KEY = "!AWM321@";
const { importCSVtoMySQL } = require("./import.js");
const multer = require("multer");
const logger = require("./logger.js");
const AdmZip = require("adm-zip");
const appRoot = require("app-root-path");
const mime = require("mime-types");
const upload = multer({ storage: multer.memoryStorage() });
const expressBasicAuth = require("express-basic-auth");
const moment = require("moment");
// app.use('/poslog', express.static(path.join(__dirname, 'pos-logs')));
app.use(
   "/poslog",
   expressBasicAuth({
      users: { "pos-admin": "123456" }, // Replace with actual credentials
      challenge: true,
   }),
   express.static(path.join(__dirname, "pos-logs"))
);
// http://localhost:4100/poslog/baemin-logo.png

app.post("/api/importCSVtoMySQL", async (req, res) => {
   await importCSVtoMySQL("./products.csv", pool);
   return res.status(200).json({
      result: true,
      data: true,
      message: "Import success",
   });
});

app.post("/api/getMartInfo", async (req, res) => {
   try {
      const martCode = req.body.martCode;
      const martGroup = req.body.martGroup;
      if (martCode === undefined || martGroup === undefined) {
         return res.status(500).json({ result: false, data: null, message: "Mart code or mart group cannot null" });
      } else {
         const [rows] = await pool.query(` SELECT M_MOA_CODE, M_NAME, M_GROUP, SHOULD_DOWN_FILE, FILE_NAME FROM TBL_MOA_MART_SYNC WHERE M_MOA_CODE = ? AND M_GROUP = ? LIMIT 1 `, [
            martCode,
            martGroup,
         ]);
         if (rows[0]) {
            logger.writeLog("info", `/api/getMartInfo: ${JSON.stringify(req.body)} => Get Mart info success`);
            return res.status(200).json({
               result: true,
               data: rows[0],
               message: "Get Mart info success",
            });
         } else {
            logger.writeLog("error", `/api/getMartInfo: ${JSON.stringify(req.body)} => Mart info doesn't exist`);
            return res.status(500).json({
               result: false,
               data: null,
               message: "Mart info doesn't exist",
            });
         }
      }
   } catch (error) {
      logger.writeLog("error", `/api/getMartInfo: ${JSON.stringify(error)}`);
      return res.status(500).json({ result: false, data: null, message: error.message });
   }
});

app.post("/api/getLastDate", async (req, res) => {
   try {
      const martCode = req.body.martCode;
      const martGroup = req.body.martGroup;
      if (martCode === undefined || martGroup === undefined) {
         return res.status(500).json({ result: false, data: null, message: "Mart code or mart group cannot null" });
      } else {
         const [rows] = await pool.query(` SELECT LAST_DATE_SYNC FROM TBL_MOA_MART_SYNC WHERE M_MOA_CODE = ? AND M_GROUP = ? LIMIT 1 `, [martCode, martGroup]);
         if (rows[0]) {
            logger.writeLog("info", `/api/getLastDate: ${JSON.stringify(req.body)} => Get info success`);
            return res.status(200).json({
               result: true,
               data: rows[0],
               message: "Get info success",
            });
         } else {
            logger.writeLog("error", `/api/getLastDate: ${JSON.stringify(req.body)} => Info doesn't exist`);
            return res.status(500).json({
               result: false,
               data: null,
               message: "Info doesn't exist",
            });
         }
      }
   } catch (error) {
      logger.writeLog("error", `/api/getLastDate: ${JSON.stringify(error)}`);
      return res.status(500).json({ result: false, data: null, message: error.message });
   }
});

// Initialize multer
app.get("/api/getQueryFile/:martGroup/:martCode", async (req, res) => {
   try {
      //   const secretKey = req.headers["secret-key"];
      const martCode = req.params.martCode;
      const martGroup = req.params.martGroup;

      // Validate input
      if (martCode === undefined || martGroup === undefined) {
         return res.status(500).json({ result: false, data: null, message: "Mart code or mart group or key cannot be null" });
      }
      //    if (secretKey === undefined || martCode === undefined || martGroup === undefined) {
      //      return res.status(500).json({ result: false, data: null, message: "Mart code or mart group or key cannot be null" });
      //   }
      //   if (secretKey !== SECRET_KEY) {
      //      return res.status(500).json({ result: false, data: null, message: "Key is wrong" });
      //   }

      // Query to get the file name
      const [rows] = await pool.query(` SELECT FILE_NAME FROM TBL_MOA_MART_SYNC WHERE M_MOA_CODE = ? AND M_GROUP = ? LIMIT 1 `, [martCode, martGroup]);
      const fileName = rows[0] ? rows[0].FILE_NAME : "";

      logger.writeLog("info", `/api/getQueryFile: fileName: ${fileName}`);

      if (!fileName) {
         // If no file name found, return null
         return res.status(500).json({ result: false, data: null, message: "File info not found" });
      }

      const fileFullPath = appRoot + "/ftp-json/" + fileName;
      logger.writeLog("info", `/api/getQueryFile: fileFullPath: ${fileFullPath}`);

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
      // Handle any errors that may occur
      return res.status(500).json({ result: false, data: null, message: error.message });
   }
});

app.post("/api/syncProduct", upload.single("martFile"), async (req, res) => {
   try {
      const martCode = req.body.martCode;
      const martGroup = req.body.martGroup;
      if (martCode === undefined || martGroup === undefined) {
         return res.status(500).json({ result: false, data: null, message: "Mart code or mart group cannot null" });
      }
      if (!req.file) {
         return res.status(500).json({ result: false, data: false, message: "Mart file cannot null" });
      }

      const jsonString = req.file.buffer.toString("utf-8");

      // parse JSON
      const jsonData = JSON.parse(jsonString);

      logger.writeLog("info", `/api/syncProduct: Mart file data ${jsonData.length ?? 0}`);

      const connection = await pool.getConnection(); // Get a dedicated connection
      try {
         await connection.beginTransaction(); // Start transaction

         for (const pro of jsonData) {
            const [rows] = await connection.query(` SELECT P_BARCODE FROM TBL_MOA_PRD_MAIN WHERE P_BARCODE = ? LIMIT 1`, [pro.goods_bcode]);

            if (rows[0]) {
               logger.writeLog("info", `/api/syncProduct: pro - UPDATE: ${pro.goods_bcode}`);

               await connection.query(
                  ` UPDATE TBL_MOA_PRD_MAIN
                     SET P_NAME = ?, P_LIST_PRICE = ?, P_SALE_PRICE = ?, P_UNIT = ?, P_TAGS = ?, M_ID = ?, M_TIME = NOW()
                     WHERE P_BARCODE = ?`,
                  [pro.goods_name, pro.goods_bprice, pro.goods_sprice, pro.goods_sspec, pro.goods_keyword, "SYSTEM", pro.goods_bcode]
               );
            } else {
               logger.writeLog("info", `/api/syncProduct: pro - INSERT: ${pro.goods_bcode}`);

               await connection.query(
                  ` INSERT INTO TBL_MOA_PRD_MAIN 
                     (M_MOA_CODE, P_BARCODE, P_CODE, P_NAME, P_LIST_PRICE, P_SALE_PRICE, P_UNIT, P_TAGS, C_ID, C_TIME) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                  [martCode, pro.goods_bcode, pro.goods_code, pro.goods_name, pro.goods_bprice, pro.goods_sprice, pro.goods_sspec, pro.goods_keyword, "SYSTEM"]
               );
            }
         }

         await connection.query(
            ` UPDATE TBL_MOA_MART_SYNC
                SET LAST_DATE_SYNC = IFNULL(LAST_DATE_SYNC, NOW()) + INTERVAL 10 MINUTE
                 WHERE M_MOA_CODE = ? AND M_GROUP = ? `,
            [martCode, martGroup]
         );

         await connection.commit(); // Commit transaction

         return res.status(200).json({ result: true, data: true, message: "Sync product success" });
      } catch (error) {
         await connection.rollback(); // Rollback on error
         logger.writeLog("error", `/api/syncProduct: transaction error: ${JSON.stringify(error)}`);
         return res.status(500).json({ result: false, data: false, error: error.message });
      } finally {
         connection.release(); // Release connection back to pool
      }
   } catch (error) {
      logger.writeLog("error", `/api/syncProduct: ${JSON.stringify(error)}`);
      return res.status(500).json({ result: false, data: null, message: error.message });
   }
});

app.post("/api/sendLogFile", upload.single("file"), async (req, res) => {
   try {
      if (!req.file) {
         return res.status(400).json({ result: false, message: "File cannot null" });
      }

      if (!req.file.originalname.endsWith(".zip")) {
         return res.status(400).json({ result: false, message: "File is not .zip" });
      }

      const zip = new AdmZip(req.file.buffer); // <--  buffer
      const targetDirectory = path.join(__dirname, "pos-logs");

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

      return res.status(200).json({ result: true, data: true, message: "Unzip and Save log successfull" });
   } catch (error) {
      return res.status(500).json({ result: false, data: false, message: error.message });
   }
});
app.listen(process.env.PORT, () => {
   console.log(`Server running at http://localhost:${process.env.PORT}`);
});
