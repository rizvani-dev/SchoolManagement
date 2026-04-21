import React from 'react';
import { FaTrash } from 'react-icons/fa';
import './announcement.css'

const AnnouncementList = ({ announcements, onDelete, canDelete = false }) => {
  return (
    <div className="announcements-list">
      {announcements.length === 0 ? (
        <div className="empty-state">
          No announcements available at the moment.
        </div>
      ) : (
        announcements.map((ann) => {
          const annDate = new Date(ann.date);
          
          return (
            <div key={ann.id} className="announcement-item">
              <div className="announcement-header">
                <div>
                  <h4 className="announcement-title">{ann.title}</h4>
                  <div className="announcement-meta">
                    <span>By: <strong>{ann.created_by_name || 'Admin'}</strong></span>
                    <span className="announcement-date">
                      {annDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                {canDelete && (
                  <button 
                    onClick={() => onDelete(ann.id)}
                    className="delete-btn"
                    title="Delete Announcement"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>

              <p className="announcement-description">{ann.description}</p>
            </div>
          );
        })
      )}
    </div>
  );
};

export default AnnouncementList;