'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '../../shared/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import styles from './profile.module.css';

// Import the ViewProfile component with SSR disabled to avoid hydration issues
const ViewProfile = dynamic(
  () => import('./components/ViewProfile'),
  { ssr: false }
);

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      router.push('/auth/signin');
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className={styles.loading}>
        Redirecting to login...
      </div>
    );
  }

  return <ViewProfile />;
}
