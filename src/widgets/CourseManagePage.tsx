import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import CoverUpload from "@/components/dashboard/CoverUpload";
import CourseHeaderCard from "@/components/dashboard/CourseHeaderCard";
import CoursePriceCard from "@/components/dashboard/CoursePriceCard";
import CourseDurationCard from "@/components/dashboard/CourseDurationCard";
import CategorizationCard from "@/components/dashboard/CategorizationCard";
import ChaptersCard from "@/components/dashboard/ChaptersCard";
import OutcomesCard from "@/components/dashboard/OutcomesCard";
import FooterActions from "@/components/dashboard/FooterActions";
import { coursesApi, type Course, type CreateCourseData, type UpdateCourseData, type Chapter } from '@/shared/api/courses';
import { getCoverImageUrl } from '@/shared/utils/courseTransform';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface CourseFormData {
  title: string;
  description: string;
  isPublic: boolean;
  coverImage: string | null;
  price: number;
   hoursPractice: number;
   hoursTheory: number;
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
    price: 0,
    hoursPractice: 0,
    hoursTheory: 0,
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
        price: typeof course.price === 'number' ? course.price : 0,
        hoursPractice: typeof (course as any).hoursPractice === 'number' && (course as any).hoursPractice >= 0
          ? (course as any).hoursPractice
          : 0,
        hoursTheory: typeof (course as any).hoursTheory === 'number' && (course as any).hoursTheory >= 0
          ? (course as any).hoursTheory
          : 0,
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

      const coverFile = coverImageFileRef.current;

      const courseData: CreateCourseData | UpdateCourseData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        isPublic: saveAsDraft ? false : formData.isPublic,
        coverImage: coverFile ? formData.coverImage : formData.coverImage,
        price: formData.price,
        hoursPractice: formData.hoursPractice,
        hoursTheory: formData.hoursTheory,
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

        if (coverFile) {
          try {
            const uploadResult = await coursesApi.uploadCourseCover(newCourse.id, coverFile);
            coverImageFileRef.current = null;
            setFormData(prev => ({ ...prev, coverImage: uploadResult.url }));
          } catch (uploadErr) {
            console.error('Error uploading cover:', uploadErr);
            toast.error('Курс создан, но не удалось загрузить обложку');
          }
        }

        toast.success(saveAsDraft ? 'Курс сохранен как черновик' : 'Курс успешно создан');
        
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
        if (coverFile) {
          try {
            const uploadResult = await coursesApi.uploadCourseCover(courseId, coverFile);
            coverImageFileRef.current = null;
            courseData.coverImage = uploadResult.url;
          } catch (uploadErr) {
            console.error('Error uploading cover:', uploadErr);
            toast.error('Не удалось загрузить обложку');
          }
        }

        await coursesApi.updateCourse(courseId, courseData as UpdateCourseData);
        toast.success(saveAsDraft ? 'Курс сохранен как черновик' : 'Курс успешно обновлен');
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

  const handleDeleteCourse = async () => {
    if (!courseId || isCreatePage) return;
    try {
      await coursesApi.deleteCourse(courseId);
      toast.success('Курс удалён');
      navigate('/courses');
    } catch (err) {
      console.error('Error deleting course:', err);
      toast.error('Не удалось удалить курс');
    } finally {
      setDeleteDialogOpen(false);
    }
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
      {/* Main Content Area */}
      <div className="px-4 sm:px-6 lg:px-[20px] mb-5">
        {/* Page Content */}
        <main>
          {/* Cover Upload Section */}
          <CoverUpload
            coverImage={getCoverImageUrl(formData.coverImage) || formData.coverImage}
            onCoverImageChange={(file) => {
              coverImageFileRef.current = file;
              if (file) {
                const previewUrl = URL.createObjectURL(file);
                setFormData({ ...formData, coverImage: previewUrl });
              } else {
                setFormData({ ...formData, coverImage: null });
              }
            }}
          />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {/* Left Column */}
            <div className="space-y-4">
              <CourseHeaderCard
                title={formData.title}
                description={formData.description}
                onTitleChange={(title) => setFormData({ ...formData, title })}
                onDescriptionChange={(description) => setFormData({ ...formData, description })}
              />
              <CoursePriceCard
                price={formData.price}
                onPriceChange={(price) => setFormData({ ...formData, price })}
              />
              <CourseDurationCard
                hoursPractice={formData.hoursPractice}
                hoursTheory={formData.hoursTheory}
                onHoursPracticeChange={(hoursPractice) =>
                  setFormData((prev) => ({ ...prev, hoursPractice }))
                }
                onHoursTheoryChange={(hoursTheory) =>
                  setFormData((prev) => ({ ...prev, hoursTheory }))
                }
              />
              <ChaptersCard
                chapters={chapters}
                courseId={course?.id || courseId}
                onChaptersChange={setChapters}
                isCreatePage={isCreatePage}
              />
              {!isCreatePage && (
                <div className="border rounded-xl p-4 bg-white">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Опасная зона
                  </h3>
                  <Button
                    variant="outline"
                    className="inline-flex px-4 py-2 text-sm bg-primary/10 rounded-xl border-2 border-primary cursor-pointer hover:bg-red-400"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    Удалить курс
                  </Button>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
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

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены, что хотите удалить курс?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя будет отменить. Все материалы курса (главы, подглавы и блоки) будут удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Нет</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              onClick={handleDeleteCourse}
            >
              Да
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default CourseManagePage;