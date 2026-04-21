const pool = require('../config/db');
const XLSX = require('xlsx');
const fs = require('fs');

// ================= DATE HELPER (VERY IMPORTANT) =================
const parseDate = (value) => {
  if (!value) return null;

  // Excel serial number fix
  if (typeof value === "number") {
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

// ================= FORMAT DATE DD/MM/YYYY =================
const formatDate = (date) => {
  if (!date) return "";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};

// ================= BULK UPLOAD =================
const uploadAttendance = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No Excel file uploaded" });
  }

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      for (const row of sheet) {
        const studentId = row.student_id || row.StudentID || row.id;
        const classId = row.class_id || row.ClassID || null;

        const date = parseDate(row.date || row.Date);
        if (!studentId || !date) continue;

        let status = (row.status || "present").toLowerCase().trim();
        if (!["present", "absent", "late", "holiday"].includes(status)) {
          status = "present";
        }

        await client.query(
          `INSERT INTO attendance (student_id, class_id, date, status, remarks, created_by)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (student_id, date)
           DO UPDATE SET 
             status = EXCLUDED.status,
             remarks = EXCLUDED.remarks,
             class_id = EXCLUDED.class_id`,
          [
            studentId,
            classId,
            date,
            status,
            row.remarks || "",
            req.user.id,
          ]
        );
      }

      await client.query("COMMIT");

      res.json({
        success: true,
        message: "Attendance uploaded successfully",
      });

    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
      fs.unlinkSync(req.file.path);
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
};

// ================= GET ATTENDANCE =================
const getAllAttendance = async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.user.role === "student") {
      query = `
        SELECT a.*, c.name AS class_name
        FROM attendance a
        LEFT JOIN classes c ON c.id = a.class_id
        WHERE a.student_id = $1
        ORDER BY a.date DESC
      `;
      params = [req.user.id];
    } else {
      query = `
        SELECT 
          a.*,
          u.id AS student_id,
          u.name AS student_name,
          c.id AS class_id,
          c.name AS class_name
        FROM attendance a
        JOIN users u ON u.id = a.student_id
        LEFT JOIN classes c ON c.id = a.class_id
        ORDER BY a.date DESC
      `;
    }

    const { rows } = await pool.query(query, params);

    res.json({
      success: true,
      attendance: rows,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

// ================= UPDATE ATTENDANCE =================
const editAttendance = async (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE attendance 
       SET status=$1, remarks=$2 
       WHERE id=$3 
       RETURNING *`,
      [status, remarks, id]
    );

    res.json({
      success: true,
      record: rows[0],
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

// ================= ATTENDANCE SUMMARY =================
const getAttendanceSummary = async (req, res) => {
  try {
    const studentId = req.user.id;

    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status='present') AS present,
        COUNT(*) FILTER (WHERE status='absent') AS absent,
        COUNT(*) FILTER (WHERE status='late') AS late,
        COUNT(*) AS total
      FROM attendance
      WHERE student_id=$1
    `, [studentId]);

    res.json({
      success: true,
      summary: rows[0],
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

// ================= EXPORT ATTENDANCE (FIXED + COMPLETE DATA) =================
const exportAttendance = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id AS student_id,
        u.name AS student_name,
        c.id AS class_id,
        c.name AS class_name,
        a.date,
        a.status,
        a.remarks
      FROM attendance a
      JOIN users u ON u.id = a.student_id
      LEFT JOIN classes c ON c.id = a.class_id
      ORDER BY a.date DESC
    `);

    const rows = result.rows.map((r) => ({
      student_id: r.student_id,
      student_name: r.student_name,
      class_id: r.class_id,
      class_name: r.class_name,
      date: formatDate(r.date),   // ✅ FIXED DATE FORMAT
      status: r.status,
      remarks: r.remarks,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    const filePath = `uploads/attendance/export-${Date.now()}.xlsx`;
    XLSX.writeFile(workbook, filePath);

    res.download(filePath);

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

module.exports = {
  uploadAttendance,
  getAllAttendance,
  editAttendance,
  getAttendanceSummary,
  exportAttendance,
};