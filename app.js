const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
app.use(express.json());
const expressBasicAuth = require("express-basic-auth");
const dotenv = require("dotenv");
dotenv.config();

app.use(
   cors({
      origin: true, // edit later
      credentials: true,
   })
);
app.use(express.urlencoded({ extended: true, limit: "1000mb" })); // application/x-www-form-urlencoded
app.use(express.json({ limit: "1000mb" })); // application/json

// Get file log of POS
app.use(
   "/pos-logs",
   expressBasicAuth({
      users: { [process.env.LOG_USER]: process.env.LOG_PASSWORD },
      challenge: true,
   }),
   express.static(path.join(__dirname, "public/pos-logs"))
);

// ROUTER
const posRouter = require("./app/routers/pos.js");
app.use("/api/pos", posRouter);

app.listen(process.env.PORT, () => {
   console.log(`Server running at http://localhost:${process.env.PORT}`);
});
