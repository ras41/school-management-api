require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");

const app = express();
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.get("/", (req, res) => {
  res.send("School API is running! ;)");
});

// app.get("/addSchool", (req, res) => {
//   res.send("addSchool route is running! ;)");
// });

// app.get("/listSchools", (req, res) => {
//   res.send("listSchools route is running! ;)");
// });

app.post("/addSchool", (req, res) => {
  const { name, address, latitude, longitude } = req.body;

  if (!name || !address || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res
      .status(400)
      .json({ error: "Latitude and Longitude must be numbers." });
  }

  const sql =
    "INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)";
  const values = [name, address, latitude, longitude];

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error("Error inserting school:", err);
      return res.status(500).json({ error: "Database error." });
    }
    res.json({
      message: "School added successfully.",
      schoolId: results.insertId,
    });
  });
});

const haversine = require("haversine-distance");

// GET /listSchools?latitude=...&longitude=...
app.get("/listSchools", (req, res) => {
  const userLat = parseFloat(req.query.latitude);
  const userLong = parseFloat(req.query.longitude);

  if (isNaN(userLat) || isNaN(userLong)) {
    return res.status(400).json({
      error: "Valid latitude and longitude are required as query parameters.",
    });
  }

  const sql = "SELECT * FROM schools";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ error: "Database error." });
    }

    const userLocation = { lat: userLat, lon: userLong };

    // Add distance to each school and sort
    const schoolsWithDistance = results.map((school) => {
      const schoolLocation = { lat: school.latitude, lon: school.longitude };
      const distanceMeters = haversine(userLocation, schoolLocation);
      const distanceKm = distanceMeters / 1000;
      return {
        ...school,
        distance_km: parseFloat(distanceKm.toFixed(2)),
      };
    });

    // Sort by distance
    schoolsWithDistance.sort((a, b) => a.distance_km - b.distance_km);

    res.json(schoolsWithDistance);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
