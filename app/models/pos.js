const pool = require("../../config/database");
const logger = require("../../config/logger");

module.exports = class posModel {
   static async getMartInfo(martCode, martGroup) {
      const logbase = `/posModel/getMartInfo: martCode(${martCode}), martGroup(${martGroup})`;
      try {
         const [rows] = await pool.query(` SELECT M_MOA_CODE, M_NAME, M_GROUP, SHOULD_DOWN_FILE, FILE_NAME FROM TBL_MOA_MART_SYNC WHERE M_MOA_CODE = ? AND M_GROUP = ? LIMIT 1 `, [
            martCode,
            martGroup,
         ]);
         if (rows[0]) {
            return rows[0];
         } else {
            return null;
         }
      } catch (error) {
         logger.writeLog("error", `${logbase} => ${JSON.stringify(error)}`);
         return null;
      }
   }
   static async getLastDate(martCode, martGroup) {
      const logbase = `/posModel/getLastDate: martCode(${martCode}), martGroup(${martGroup})`;
      try {
         const [rows] = await pool.query(` SELECT LAST_DATE_SYNC FROM TBL_MOA_MART_SYNC WHERE M_MOA_CODE = ? AND M_GROUP = ? LIMIT 1  `, [martCode, martGroup]);
         if (rows[0]) {
            return rows[0];
         } else {
            return null;
         }
      } catch (error) {
         logger.writeLog("error", `${logbase} => ${JSON.stringify(error)}`);
         return null;
      }
   }
   static async getQueryFile(martCode, martGroup) {
      const logbase = `/posModel/getQueryFile: martCode(${martCode}), martGroup(${martGroup})`;
      try {
         const [rows] = await pool.query(` SELECT FILE_NAME FROM TBL_MOA_MART_SYNC WHERE M_MOA_CODE = ? AND M_GROUP = ? LIMIT 1  `, [martCode, martGroup]);
         if (rows[0]) {
            return rows[0];
         } else {
            return null;
         }
      } catch (error) {
         logger.writeLog("error", `${logbase} => ${JSON.stringify(error)}`);
         return null;
      }
   }
   static async syncProduct(syncTime, martCode, martGroup, isLastFile, jsonData) {
      const logbase = `/posModel/syncProduct: syncTime(${syncTime}), martCode(${martCode}), martGroup(${martGroup}), isLastFile(${isLastFile}), jsonData(${jsonData?.length})`;

      const connection = await pool.getConnection();
      try {
         await connection.beginTransaction(); // Start transaction

         for (const pro of jsonData) {
            const [rows] = await connection.query(` SELECT P_BARCODE FROM TBL_MOA_PRD_MAIN WHERE P_BARCODE = ? LIMIT 1`, [pro.goods_bcode]);

            if (rows[0]) {
               logger.writeLog("info", `${logbase}: pro - UPDATE: ${pro.goods_bcode}`);

               await connection.query(
                  ` UPDATE TBL_MOA_PRD_MAIN
                                   SET P_NAME = ?, P_LIST_PRICE = ?, P_SALE_PRICE = ?, P_UNIT = ?, P_TAGS = ?, M_ID = ?, M_TIME = NOW()
                                   WHERE P_BARCODE = ?`,
                  [pro.goods_name, pro.goods_bprice, pro.goods_sprice, pro.goods_sspec, pro.goods_keyword, "SYSTEM", pro.goods_bcode]
               );
            } else {
               logger.writeLog("info", `${logbase}: pro - INSERT: ${pro.goods_bcode}`);

               await connection.query(
                  ` INSERT INTO TBL_MOA_PRD_MAIN 
                                   (M_MOA_CODE, P_BARCODE, P_CODE, P_NAME, P_LIST_PRICE, P_SALE_PRICE, P_UNIT, P_TAGS, C_ID, C_TIME) 
                                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                  [martCode, pro.goods_bcode, pro.goods_code, pro.goods_name, pro.goods_bprice, pro.goods_sprice, pro.goods_sspec, pro.goods_keyword, "SYSTEM"]
               );
            }
         }

         if (isLastFile === "Y") {
            await connection.query(
               ` UPDATE TBL_MOA_MART_SYNC
                             SET LAST_DATE_SYNC = ?
                             WHERE M_MOA_CODE = ? AND M_GROUP = ? LIMIT 1 `,
               [syncTime, martCode, martGroup]
            );
         }
         logger.writeLog("info", `${logbase}: Sync successfull`);
         await connection.commit(); // Commit transaction

         return true;
      } catch (error) {
         await connection.rollback(); // Rollback on error
         logger.writeLog("error", `${logbase}: Sync failed: ${JSON.stringify(error)}`);
         return false;
      } finally {
         connection.release(); // Release connection back to pool
      }
   }
};
