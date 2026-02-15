import { Star, Users, BarChart2 } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Link } from 'react-router-dom';

interface CourseCardProps {
  id: number;
  title: string;
  description: string;
  author?: {
    id: number;
    name: string;
    email: string;
  };
  rating: number;
  price: number;
  category: string;
  language: string;
  authorId?: string; // ID of the course author for permission checks
}

export const CourseCard = ({ course }: { course: CourseCardProps }) => {
  const { user } = useAuth();
  const isAuthorOrAdmin = user && (user.role === 'admin' || (course.authorId && user.id === course.authorId.toString()));
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
      {/* Course Image */}
      <div className="aspect-video bg-gray-100 relative">
        <div className="absolute top-2 left-2 flex gap-2">
          <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
            {course.category}
          </span>
          <span className="px-2 py-1 bg-cyan-600 text-white text-xs rounded-full">
            {course.language}
          </span>
        </div>
      </div>

      {/* Course Content */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {course.title}
        </h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {course.description}
        </p>
        
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                <Users className="w-3 h-3 text-gray-500" />
              </div>
              <span className="text-xs text-gray-500">
                {course.author?.name || 'Автор не указан'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium">{course.rating}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-lg font-bold text-gray-900">{course.price} ₽</span>
            <div className="flex items-center gap-2">
              {isAuthorOrAdmin && (
                <Link 
                  to={`/courses/${course.id}/statistics`}
                  className="p-1.5 text-gray-500 hover:text-purple-600 transition-colors"
                  title="Статистика курса"
                  onClick={(e) => e.stopPropagation()}
                >
                  <BarChart2 className="w-4 h-4" />
                </Link>
              )}
              <Link 
                to={`/courses/${course.id}`}
                className="text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                Подробнее
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
