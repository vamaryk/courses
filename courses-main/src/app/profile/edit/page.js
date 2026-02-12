'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../shared/lib/auth';
import ProfileForm from '../components/ProfileForm';
import PasswordForm from '../components/PasswordForm';
import styles from '../profile.module.css';

export default function EditProfilePage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }
    
    // Set initial user data
    setUserData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      patronymic: user.patronymic || '',
      email: user.email || '',
      phone_number: user.phone_number || '',
      date_of_birth: user.date_of_birth ? new Date(user.date_of_birth).toISOString().split('T')[0] : '',
      avatar_url: user.avatar_url || ''
    });
    
    setIsLoading(false);
  }, [user, router]);

  const handleProfileUpdate = async (updatedData) => {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setMessage({ type: 'success', text: 'Profile updated successfully' });
      refreshUser(); // Refresh user data in auth context
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handlePasswordChange = async (currentPassword, newPassword) => {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setMessage({ type: 'success', text: 'Password changed successfully' });
      return { success: true };
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: error.message });
      return { success: false, error: error.message };
    }
  };

  if (isLoading || !userData) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <button 
        onClick={() => router.back()} 
        className={styles.backButton}
      >
        ← Back to Profile
      </button>
      
      <h1 className={styles.title}>Edit Profile</h1>
      
      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'profile' ? styles.active : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Edit Profile
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'password' ? styles.active : ''}`}
          onClick={() => setActiveTab('password')}
        >
          Change Password
        </button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'profile' ? (
          <ProfileForm 
            userData={userData} 
            onUpdate={handleProfileUpdate} 
          />
        ) : (
          <PasswordForm onChangePassword={handlePasswordChange} />
        )}
      </div>
    </div>
  );
}
