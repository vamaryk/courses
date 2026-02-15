'use client';

import { useState, useEffect } from 'react';
import styles from '../profile.module.css';

export default function ProfileForm({ userData, onUpdate }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    patronymic: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    avatar_url: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userData) {
      setFormData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        patronymic: userData.patronymic || '',
        email: userData.email || '',
        phone_number: userData.phone_number || '',
        date_of_birth: userData.date_of_birth || '',
        avatar_url: userData.avatar_url || ''
      });
    }
  }, [userData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onUpdate(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="first_name">First Name *</label>
        <input
          type="text"
          id="first_name"
          name="first_name"
          value={formData.first_name}
          onChange={handleChange}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="last_name">Last Name *</label>
        <input
          type="text"
          id="last_name"
          name="last_name"
          value={formData.last_name}
          onChange={handleChange}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="patronymic">Patronymic</label>
        <input
          type="text"
          id="patronymic"
          name="patronymic"
          value={formData.patronymic}
          onChange={handleChange}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="email">Email *</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="phone_number">Phone Number</label>
        <input
          type="tel"
          id="phone_number"
          name="phone_number"
          value={formData.phone_number}
          onChange={handleChange}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="date_of_birth">Date of Birth</label>
        <input
          type="date"
          id="date_of_birth"
          name="date_of_birth"
          value={formData.date_of_birth}
          onChange={handleChange}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="avatar_url">Avatar URL</label>
        <input
          type="url"
          id="avatar_url"
          name="avatar_url"
          value={formData.avatar_url}
          onChange={handleChange}
          placeholder="https://example.com/avatar.jpg"
        />
      </div>

      <button 
        type="submit" 
        className={styles.submitButton}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
