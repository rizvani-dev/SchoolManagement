import React from "react";
import { FaEdit, FaTrash, FaUser } from "react-icons/fa";
import "./userTable.css";

const UserTable = ({ users, onEdit, onDelete, onAddUser, loading }) => {
  return (
    <div className="user-table-container">
      {/* HEADER */}
      <div className="user-table-header">
        <h2 className="user-table-title">Users Management</h2>

        <button
          onClick={onAddUser}
          className="add-user-btn"
        >
          <FaUser /> Add New User
        </button>
      </div>

      {/* TABLE */}
      <div className="user-table-wrapper">
        <table className="user-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Class</th>
              <th>Bio</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="loading-row">Loading users...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-row">No users found</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      backgroundColor: u.role === 'teacher' ? '#dbeafe' : '#d1fae5',
                      color: u.role === 'teacher' ? '#1e40af' : '#166534'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{u.class_id || "-"}</td>
                  <td>{u.bio ? u.bio.substring(0, 40) + "..." : "-"}</td>

                  <td className="actions">
                    <button onClick={() => onEdit(u)} title="Edit">
                      <FaEdit color="#3b82f6" />
                    </button>
                    <button onClick={() => onDelete(u.id)} title="Delete">
                      <FaTrash color="#ef4444" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserTable;