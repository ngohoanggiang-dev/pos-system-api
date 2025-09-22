const csv = require("csv-parser");
const path = require("path");
const fs = require("fs");

async function importCSVtoMySQL(csvFilePath, pool) {
    try {
        const rows = [];
        await new Promise((resolve, reject) => {
            fs.createReadStream(path.resolve(csvFilePath))
                .pipe(csv())
                .on("data", (row) => {
                    rows.push(row);
                })
                .on("end", () => {
                    console.log(" CSV file read:", rows.length, "line");
                    resolve();
                })
                .on("error", reject);
        });

        if (rows.length === 0) {
            console.log("CSV empty");
            return;
        }

        const columns = Object.keys(rows[0]);
        console.log("Column :", columns);

        const placeholders = columns.map(() => "?").join(", ");
        const sql = ` INSERT INTO TBL_MOA_PRD_MAIN (${columns.join(", ")}) VALUES (${placeholders})`;
        function normalizeValue(value) {
            if (value === "\\N" || value === "\\\\N" || value === "" || value === undefined) {
                return null;
            }
            return value;
        }

        for (const row of rows) {
            const values = columns.map((col) => normalizeValue(row[col]));
            await pool.query(sql, values);
        }
        console.log(" Import into TBL_MOA_PRD_MAIN!");
    } catch (err) {
        console.error("error:", err);
    }
}
module.exports = {
    importCSVtoMySQL
}