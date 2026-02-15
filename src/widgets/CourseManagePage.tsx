import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Header from "@/widgets/navigation/Header/Header";
import MenuSidebar from "@/widgets/navigation/MenuSidebar/MenuSidebar";
import CoverUpload from "@/components/dashboard/CoverUpload";
import CourseHeaderCard from "@/components/dashboard/CourseHeaderCard";
import CategorizationCard from "@/components/dashboard/CategorizationCard";
import ChaptersCard from "@/components/dashboard/ChaptersCard";
import OutcomesCard from "@/components/dashboard/OutcomesCard";
import FooterActions from "@/components/dashboard/FooterActions";
import { coursesApi, type Course, type CreateCourseData, type UpdateCourseData, type Chapter } from '@/shared/api/courses';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';

interface CourseFormData {
  title: string;
  description: string;
  isPublic: boolean;
  coverImage: string | null;
  tags: string[];
  specialty: string | null;
  targetAudience: string | null;
  aboutCourse: string | null;
  courseSkills: string[];
  courseTools: string[];
  certificateText: string | null;
  jobTitle: string | null;
}

function CourseManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isCreatePage = location.pathname === '/courses/create';
  const courseId = id ? parseInt(id) : 0;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    isPublic: false,
    coverImage: null,
    tags: [],
    specialty: null,
    targetAudience: null,
    aboutCourse: null,
    courseSkills: [],
    courseTools: [],
    certificateText: null,
    jobTitle: null,
  });

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const coverImageFileRef = useRef<File | null>(null);

  useEffect(() => {
    if (isCreatePage) {
      // Страница создания нового курса
      setLoading(false);
    } else if (courseId && courseId > 0) {
      // Страница редактирования существующего курса
      fetchCourse();
    } else {
      setLoading(false);
    }
  }, [courseId, isCreatePage]);

  // Check if user is authorized to edit this course
  useEffect(() => {
    if (!isCreatePage && course && user) {
      if (course.author_id !== user.id) {
        setError('У вас нет прав для редактирования этого курса');
        toast.error('У вас нет прав для редактирования этого курса');
        navigate('/courses');
      }
    }
  }, [course, user, isCreatePage, navigate]);

  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title || '',
        description: course.description || '',
        isPublic: course.is_public || false,
        coverImage: course.cover_image || null,
        tags: course.tags || [],
        specialty: course.specialty || null,
        targetAudience: course.target_audience || null,
        aboutCourse: course.about_course || null,
        courseSkills: course.course_skills || [],
        courseTools: course.course_tools || [],
        certificateText: course.certificate_text || null,
        jobTitle: course.job_title || null,
      });
      // Ensure chapters array exists and is properly formatted
      const courseChapters = course.chapters || [];
      setChapters(courseChapters.map(ch => ({
        ...ch,
        order: ch.order || 0,
        title: ch.title || '',
      })));
    }
  }, [course]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      setError(null);
      const courseData = await coursesApi.getCourse(courseId);
      setCourse(courseData);
    } catch (err) {
      console.error('Error fetching course:', err);
      setError('Ошибка при загрузке курса');
      toast.error('Ошибка при загрузке курса');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (saveAsDraft: boolean = false) => {
    if (!formData.title.trim()) {
      toast.error('Название курса обязательно');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Upload cover image if there's a new file
      let coverImageUrl = formData.coverImage;
      if (coverImageFileRef.current) {
        // Convert file to base64 for storage
        coverImageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.onerror = reject;
          reader.readAsDataURL(coverImageFileRef.current!);
        });
      }

      const courseData: CreateCourseData | UpdateCourseData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        isPublic: saveAsDraft ? false : formData.isPublic,
        coverImage: coverImageUrl,
        tags: formData.tags,
        specialty: formData.specialty,
        targetAudience: formData.targetAudience,
        aboutCourse: formData.aboutCourse,
        courseSkills: formData.courseSkills,
        courseTools: formData.courseTools,
        certificateText: formData.certificateText,
        jobTitle: formData.jobTitle,
      };

      if (isCreatePage) {
        const newCourse = await coursesApi.createCourse(courseData as CreateCourseData);
        toast.success(saveAsDraft ? 'Курс сохранен как черновик' : 'Курс успешно создан');
        
        // Save chapters if any were created locally
        if (chapters.length > 0) {
          try {
            const savedChapters = await Promise.all(
              chapters.map((chapter, index) => 
                coursesApi.createChapter(newCourse.id, {
                  title: chapter.title || `Глава ${index + 1}`,
                  order: chapter.order || index + 1,
                })
              )
            );
            setChapters(savedChapters);
          } catch (chapterError) {
            console.error('Error creating chapters:', chapterError);
            toast.error('Курс создан, но возникла ошибка при создании глав');
          }
        }
        
        navigate(`/courses/${newCourse.id}/manage`);
      } else {
        await coursesApi.updateCourse(courseId, courseData as UpdateCourseData);
        toast.success(saveAsDraft ? 'Курс сохранен как черновик' : 'Курс успешно обновлен');
        // Refresh course data
        await fetchCourse();
      }
    } catch (err: unknown) {
      console.error('Error saving course:', err);
      const errorMessage =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: unknown } } }).response?.data?.error === 'string'
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Ошибка при сохранении курса'
          : err instanceof Error
            ? err.message
            : 'Ошибка при сохранении курса';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () => {
    handleSave(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (error && !isCreatePage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MenuSidebar />
      {/* Main Content Area */}
      <div className="mt-[4em] lg:ml-[100px] md:ml-[100px] sm:ml-0">
        {/* Page Content */}
        <main className="max-w-7xl mx-auto px-8 pb-12">
          {/* Cover Upload Section */}
          <CoverUpload
            coverImage={formData.coverImage}
            onCoverImageChange={(file) => {
              coverImageFileRef.current = file;
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  setFormData({ ...formData, coverImage: reader.result as string });
                };
                reader.readAsDataURL(file);
              } else {
                setFormData({ ...formData, coverImage: null });
              }
            }}
          />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Left Column */}
            <div className="space-y-6">
              <CourseHeaderCard
                title={formData.title}
                description={formData.description}
                onTitleChange={(title) => setFormData({ ...formData, title })}
                onDescriptionChange={(description) => setFormData({ ...formData, description })}
              />
              <ChaptersCard
                chapters={chapters}
                courseId={course?.id || courseId}
                onChaptersChange={setChapters}
                isCreatePage={isCreatePage}
              />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <CategorizationCard
                specialty={formData.specialty}
                tags={formData.tags}
                targetAudience={formData.targetAudience}
                aboutCourse={formData.aboutCourse}
                onSpecialtyChange={(specialty) => setFormData({ ...formData, specialty })}
                onTagsChange={(tags) => setFormData({ ...formData, tags })}
                onTargetAudienceChange={(targetAudience) => setFormData({ ...formData, targetAudience })}
                onAboutCourseChange={(aboutCourse) => setFormData({ ...formData, aboutCourse })}
              />
              <OutcomesCard
                skills={formData.courseSkills}
                tools={formData.courseTools}
                certificateText={formData.certificateText}
                jobTitle={formData.jobTitle}
                onSkillsChange={(courseSkills) => setFormData({ ...formData, courseSkills })}
                onToolsChange={(courseTools) => setFormData({ ...formData, courseTools })}
                onCertificateTextChange={(certificateText) => setFormData({ ...formData, certificateText })}
                onJobTitleChange={(jobTitle) => setFormData({ ...formData, jobTitle })}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <FooterActions
            onSave={() => handleSave(false)}
            onSaveDraft={handleSaveDraft}
            saving={saving}
            isPublic={formData.isPublic}
            onIsPublicChange={(isPublic) => setFormData({ ...formData, isPublic })}
          />
        </main>
      </div>
    </div>
  );
}

export default CourseManagePage;