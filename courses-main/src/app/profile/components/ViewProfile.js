'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../shared/lib/auth';
import styles from '../profile.module.css';

export default function ViewProfile() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }
    setIsLoading(false);
  }, [user, router]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Profile</h1>
        <button 
          onClick={() => router.push('/profile/edit')}
          className={styles.editButton}
        >
          Edit Profile
        </button>
      </div>

      <div className={styles.profileCard}>
        {user.avatar_url && (
          <div className={styles.avatarContainer}>
            <img 
              src={user.avatar_url} 
              alt="Profile" 
              className={styles.avatar}
            />
          </div>
        )}

        <div className={styles.profileInfo}>
          <div className={styles.infoRow}>
            <span className={styles.label}>Name:</span>
            <span className={styles.value}>
              {user.first_name} {user.last_name}
            </span>
          </div>
          
          {user.patronymic && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Patronymic:</span>
              <span className={styles.value}>{user.patronymic}</span>
            </div>
          )}
          
          <div className={styles.infoRow}>
            <span className={styles.label}>Email:</span>
            <span className={styles.value}>{user.email}</span>
          </div>
          
          {user.phone_number && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Phone:</span>
              <span className={styles.value}>{user.phone_number}</span>
            </div>
          )}
          
          {user.date_of_birth && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Date of Birth:</span>
              <span className={styles.value}>
                {formatDate(user.date_of_birth)}
              </span>
            </div>
          )}
          
          <div className={styles.infoRow}>
            <span className={styles.label}>Account Type:</span>
            <span className={styles.value}>
              {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
            </span>
          </div>
        </div>
      </div>
      
      <div className={styles.actions}>
        <button 
          onClick={() => router.push('/profile/edit/password')}
          className={styles.changePasswordButton}
        >
          Change Password
        </button>
      </div>
    </div>
  );
}
