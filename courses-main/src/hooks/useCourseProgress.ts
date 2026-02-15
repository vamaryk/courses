import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { progressApi } from '@/shared/api/progress';

interface UseCourseProgressProps {
  courseId: number;
  chapterId?: number;
  subchapterId?: number;
  contentBlockId?: number;
  onProgressUpdate?: (progress: number) => void;
  onCourseComplete?: () => void;
}

export const useCourseProgress = ({
  courseId,
  chapterId,
  subchapterId,
  contentBlockId,
  onProgressUpdate,
  onCourseComplete,
}: UseCourseProgressProps) => {
  const location = useLocation();
  const trackingInterval = useRef<number>();
  const lastTrackedTime = useRef<number>(Date.now());
  const progressId = useRef<number>();
  const isMounted = useRef(true);

  // Track when user views a new content block
  useEffect(() => {
    if (!courseId) return;

    const trackView = async () => {
      try {
        const progress = await progressApi.trackView(
          courseId,
          chapterId,
          subchapterId,
          contentBlockId
        );
        
        if (progress) {
          progressId.current = progress.id;
          lastTrackedTime.current = Date.now();
          
          // Update progress if callback provided
          if (onProgressUpdate && progress.progress_percentage) {
            onProgressUpdate(progress.progress_percentage);
          }
          
          // Check if course is completed
          if (progress.progress_percentage === 100 && onCourseComplete) {
            onCourseComplete();
          }
        }
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    };

    trackView();

    // Set up interval to track time spent
    trackingInterval.current = window.setInterval(async () => {
      if (!progressId.current) return;
      
      const now = Date.now();
      const timeSpent = Math.floor((now - lastTrackedTime.current) / 1000); // in seconds
      lastTrackedTime.current = now;

      if (timeSpent > 0) {
        try {
          await progressApi.updateTimeSpent(progressId.current, timeSpent);
        } catch (error) {
          console.error('Error updating time spent:', error);
        }
      }
    }, 30000); // Update every 30 seconds

    // Clean up interval on unmount or when dependencies change
    return () => {
      if (trackingInterval.current) {
        clearInterval(trackingInterval.current);
      }
      
      // Send final time update
      if (progressId.current) {
        const finalTimeSpent = Math.floor((Date.now() - lastTrackedTime.current) / 1000);
        if (finalTimeSpent > 0) {
          progressApi.updateTimeSpent(progressId.current, finalTimeSpent).catch(console.error);
        }
      }
    };
  }, [courseId, chapterId, subchapterId, contentBlockId, onProgressUpdate, onCourseComplete]);

  // Mark content as completed when user navigates away
  useEffect(() => {
    return () => {
      if (progressId.current) {
        const timeSpent = Math.floor((Date.now() - lastTrackedTime.current) / 1000);
        if (timeSpent > 0) {
          progressApi.updateTimeSpent(progressId.current, timeSpent).catch(console.error);
        }
      }
    };
  }, [location.pathname]);

  // Mark current content as completed
  const markAsCompleted = async () => {
    if (!progressId.current) return false;
    
    try {
      const updatedProgress = await progressApi.markAsCompleted(progressId.current);
      
      if (onProgressUpdate && updatedProgress.progress_percentage) {
        onProgressUpdate(updatedProgress.progress_percentage);
      }
      
      if (updatedProgress.progress_percentage === 100 && onCourseComplete) {
        onCourseComplete();
      }
      
      return true;
    } catch (error) {
      console.error('Error marking as completed:', error);
      return false;
    }
  };

  return {
    markAsCompleted,
  };
};
