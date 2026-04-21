import React, { useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../api/axiosInstance';
import './announcement.css'

const AnnouncementForm = ({ onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required");
      return;
    }

    setLoading(true);

    try {
      await API.post('/announcements', {
        title: title.trim(),
        description: description.trim()
      });

      toast.success("Announcement published successfully!");
      setTitle('');
      setDescription('');
      
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to publish announcement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="announcement-form-card">
      <h3>Create New Announcement</h3>
      <form onSubmit={handleSubmit} className='announcement-form-card'>
        <input
          type="text"
          placeholder="Announcement Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required 
        />

        <textarea
          placeholder="Write your announcement here..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows="5"
          required
        />

        <button type="submit" disabled={loading} className="publish-btn">
          {loading ? 'Publishing...' : 'Publish Announcement'}
        </button>
      </form>
    </div>
  );
};

export default AnnouncementForm;