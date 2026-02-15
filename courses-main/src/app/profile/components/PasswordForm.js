'use client';

import { useState } from 'react';
import styles from '../profile.module.css';

export default function PasswordForm({ onChangePassword }) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (formData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters long' });
      return false;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { success, error } = await onChangePassword(
        formData.currentPassword,
        formData.newPassword
      );
      
      if (success) {
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else if (error) {
        setMessage({ type: 'error', text: error });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}
      
      <div className={styles.formGroup}>
        <label htmlFor="currentPassword">Current Password *</label>
        <input
          type="password"
          id="currentPassword"
          name="currentPassword"
          value={formData.currentPassword}
          onChange={handleChange}
          required
          minLength="6"
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="newPassword">New Password *</label>
        <input
          type="password"
          id="newPassword"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          required
          minLength="6"
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="confirmPassword">Confirm New Password *</label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          minLength="6"
        />
      </div>

      <button 
        type="submit" 
        className={styles.submitButton}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Changing Password...' : 'Change Password'}
      </button>
    </form>
  );
}
