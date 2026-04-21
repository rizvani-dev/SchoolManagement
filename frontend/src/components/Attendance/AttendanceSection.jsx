import React, { useEffect, useState } from "react";
import API from "../../api/axiosInstance";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { FaDownload, FaFilter, FaSync } from "react-icons/fa";
import "./attendance.css";

const AttendanceSection = () => {
  const [attendance, setAttendance] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  const [summary, setSummary] = useState({
    present: 0,
    absent: 0,
    late: 0,
    total: 0,
  });

  const [filters, setFilters] = useState({
    status: "all",
    fromDate: "",
    toDate: "",
  });

  // ================= FETCH DATA =================
  const fetchAttendance = async () => {
    try {
      const res = await API.get("/attendance");
      const data = res.data.attendance || [];

      setAttendance(data);
      setFilteredData(data);

      calculateSummary(data);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateSummary = (data) => {
    const summaryData = {
      present: 0,
      absent: 0,
      late: 0,
      total: data.length,
    };

    data.forEach((item) => {
      summaryData[item.status] = (summaryData[item.status] || 0) + 1;
    });

    setSummary(summaryData);
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // ================= FILTER LOGIC =================
  useEffect(() => {
    let filtered = [...attendance];

    if (filters.status !== "all") {
      filtered = filtered.filter((a) => a.status === filters.status);
    }

    if (filters.fromDate) {
      filtered = filtered.filter(
        (a) => new Date(a.date) >= new Date(filters.fromDate)
      );
    }

    if (filters.toDate) {
      filtered = filtered.filter(
        (a) => new Date(a.date) <= new Date(filters.toDate)
      );
    }

    setFilteredData(filtered);
    calculateSummary(filtered);
  }, [filters, attendance]);

  // ================= EXPORT =================
const exportAttendance = async () => {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch("http://localhost:5000/api/attendance/export", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const blob = await res.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance.xlsx";
    a.click();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
  }
};
  // ================= CHART DATA =================
  const chartData = [
    { name: "Present", value: summary.present },
    { name: "Absent", value: summary.absent },
    { name: "Late", value: summary.late },
  ];

  return (
    <div className="attendance-section">

      {/* ================= HEADER ================= */}
      <div className="attendance-header">
        <h3>📊 Attendance Analytics</h3>

        <div className="attendance-actions">
          <button onClick={fetchAttendance}>
            <FaSync /> Refresh
          </button>

          <button onClick={exportAttendance}>
            <FaDownload /> Export
          </button>
        </div>
      </div>

      {/* ================= SUMMARY CARDS ================= */}
      <div className="attendance-cards">
        <div className="card present">
          <h4>Present</h4>
          <p>{summary.present}</p>
        </div>

        <div className="card absent">
          <h4>Absent</h4>
          <p>{summary.absent}</p>
        </div>

        <div className="card late">
          <h4>Late</h4>
          <p>{summary.late}</p>
        </div>

        <div className="card total">
          <h4>Total</h4>
          <p>{summary.total}</p>
        </div>
      </div>

      {/* ================= FILTERS ================= */}
      <div className="filters">
        <FaFilter />

        <select
          value={filters.status}
          onChange={(e) =>
            setFilters({ ...filters, status: e.target.value })
          }
        >
          <option value="all">All</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="late">Late</option>
        </select>

        <input
          type="date"
          onChange={(e) =>
            setFilters({ ...filters, fromDate: e.target.value })
          }
        />

        <input
          type="date"
          onChange={(e) =>
            setFilters({ ...filters, toDate: e.target.value })
          }
        />
      </div>

      {/* ================= CHARTS ================= */}
      <div className="charts-container">

        {/* PIE CHART */}
        <div className="chart-box">
          <h4>Attendance Ratio</h4>

          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                outerRadius={90}
                label
              />
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* BAR CHART */}
        <div className="chart-box">
          <h4>Performance Overview</h4>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="attendance-table">
        <h4>Attendance Records</h4>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Remarks</th>
            </tr>
          </thead>

          <tbody>
            {filteredData.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.date).toLocaleDateString()}</td>
                <td className={item.status}>{item.status}</td>
                <td>{item.remarks || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <p className="no-data">No attendance found</p>
        )}
      </div>
    </div>
  );
};

export default AttendanceSection;