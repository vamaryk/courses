import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  FileText,
  Code,
  Eye,
  EyeOff,
  Settings,
  ChevronRight,
  ChevronDown,
  X
} from 'lucide-react';
import { coursesApi, type Course, type ContentBlock } from '@/shared/api/courses';
import { useAuth } from '@/app/providers/AuthProvider'; 
import { ChapterEditModal } from '@/components/ChapterEditModal';
import { SubchapterEditModal } from '@/components/SubchapterEditModal';
import { ChapterCreateModal } from '@/components/ChapterCreateModal';
import { SubchapterCreateModal } from '@/components/SubchapterCreateModal';
import RichTextEditor from '@/components/RichTextEditor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


function CourseManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const courseId = parseInt(id || '0');

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [isAuthor, setIsAuthor] = useState(false);

  // State for inline course editing
  const [isCourseEditing, setIsCourseEditing] = useState(false);
  const [editedCourseTitle, setEditedCourseTitle] = useState('');
  const [editedCourseDescription, setEditedCourseDescription] = useState('');
  const [editedCourseIsPublic, setEditedCourseIsPublic] = useState(false);
  const [courseEditLoading, setCourseEditLoading] = useState(false);
  const [courseEditError, setCourseEditError] = useState<string | null>(null);

  // State for Chapter Edit Modal
  const [isChapterEditModalOpen, setIsChapterEditModalOpen] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<number | null>(null);
  const [editingChapterInitialTitle, setEditingChapterInitialTitle] = useState('');
  const [editingChapterInitialOrder, setEditingChapterInitialOrder] = useState(0);

  // State for Subchapter Edit Modal
  const [isSubchapterEditModalOpen, setIsSubchapterEditModalOpen] = useState(false);
  const [editingSubchapterId, setEditingSubchapterId] = useState<number | null>(null);
  const [editingSubchapterInitialTitle, setEditingSubchapterInitialTitle] = useState('');
  const [editingSubchapterInitialOrder, setEditingSubchapterInitialOrder] = useState(0);

  // State for Chapter Create Modal
  const [isChapterCreateModalOpen, setIsChapterCreateModalOpen] = useState(false);
  const [chapterCreateLoading, setChapterCreateLoading] = useState(false);

  // State for Subchapter Create Modal
  const [isSubchapterCreateModalOpen, setIsSubchapterCreateModalOpen] = useState(false);
  const [creatingSubchapterChapterId, setCreatingSubchapterChapterId] = useState<number | null>(null);
  const [subchapterCreateLoading, setSubchapterCreateLoading] = useState(false);

  // State for Content Block Editing (Right Panel)
  const [editingContentBlock, setEditingContentBlock] = useState<ContentBlock | null>(null);
  const [editedContentBlockType, setEditedContentBlockType] = useState<'theory' | 'task'>('theory');
  const [editedContentBlockContent, setEditedContentBlockContent] = useState('');
  const [editedContentBlockAnswer, setEditedContentBlockAnswer] = useState<string | undefined>(undefined);
  const [editedContentBlockOrder, setEditedContentBlockOrder] = useState(0);
  const [contentBlockEditLoading, setContentBlockEditLoading] = useState(false);
  const [contentBlockEditError, setContentBlockEditError] = useState<string | null>(null);


  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId]); // Remove isAuthenticated dependency

  const fetchCourse = async () => {
    try {
      setLoading(true);
      setError(null);
      const courseData = await coursesApi.getCourse(courseId);
      setCourse(courseData);

      // Initialize inline course editing state
      setEditedCourseTitle(courseData.title);
      setEditedCourseDescription(courseData.description || '');
      setEditedCourseIsPublic(Boolean(courseData.is_public));

      // Разворачиваем все главы по умолчанию
      if (courseData.chapters) {
        const chapterIds = courseData.chapters.map(ch => ch.id);
        setExpandedChapters(new Set(chapterIds));
      }

      // Проверяем права на редактирование
      if (user) {
        setIsAuthor(courseData.author_id === user.id);
      }
    } catch (err) {
      setError('Ошибка при загрузке курса');
    } finally {
      setLoading(false);
    }
  };

  const toggleChapter = (chapterId: number) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const handleToggleCourseEditing = () => {
    setIsCourseEditing(prev => !prev);
    // Reset form data if cancelling edit
    if (isCourseEditing && course) {
      setEditedCourseTitle(course.title);
      setEditedCourseDescription(course.description || '');
      setEditedCourseIsPublic(Boolean(course.is_public));
      setCourseEditError(null);
    }
  };

  const handleSaveCourse = async () => {
    if (!courseId) {
      setCourseEditError('ID курса не указан');
      return;
    }
    if (!editedCourseTitle.trim()) {
      setCourseEditError('Название курса обязательно');
      return;
    }

    try {
      setCourseEditLoading(true);
      setCourseEditError(null);

      await coursesApi.updateCourse(courseId, {
        title: editedCourseTitle.trim(),
        description: editedCourseDescription.trim(),
        isPublic: editedCourseIsPublic,
      });

      fetchCourse(); // Re-fetch course data to update UI
      setIsCourseEditing(false); // Exit edit mode
    } catch (err) {
      console.error('Error updating course:', err);
      setCourseEditError('Ошибка при обновлении курса');
    } finally {
      setCourseEditLoading(false);
    }
  };

  const handleCreateChapter = () => {
    if (isChapterCreateModalOpen || chapterCreateLoading) return; // Prevent double clicks
    setChapterCreateLoading(true);
    setIsChapterCreateModalOpen(true);
  };

  const handleCreateSubchapter = (chapterId: number) => {
    if (isSubchapterCreateModalOpen || subchapterCreateLoading) return; // Prevent double clicks
    setSubchapterCreateLoading(true);
    setCreatingSubchapterChapterId(chapterId);
    setIsSubchapterCreateModalOpen(true);
  };

  const handleEditChapter = (chapterId: number) => {
    if (!course?.chapters) return; // Ensure chapters exist
    const chapterToEdit = course.chapters.find(ch => ch.id === chapterId);
    if (chapterToEdit) {
      setEditingChapterId(chapterId);
      setEditingChapterInitialTitle(chapterToEdit.title);
      setEditingChapterInitialOrder(chapterToEdit.order);
      setIsChapterEditModalOpen(true);
    }
  };

  const handleChapterEditSuccess = () => {
    fetchCourse(); // Re-fetch course data to update UI
    setIsChapterEditModalOpen(false);
  };

  const handleDeleteChapter = async (chapterId: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту главу? Это действие нельзя отменить.')) {
      return;
    }

    try {
      await coursesApi.deleteChapter(chapterId);
      fetchCourse(); // Re-fetch course data to update UI
    } catch (err) {
      // Error handled by UI
    }
  };

  const handleEditSubchapter = (subchapterId: number) => {
    if (!course?.chapters) return; // Ensure chapters exist
    let subchapterToEdit = null;
    for (const chapter of course.chapters) {
      const found = chapter.subchapters?.find(sub => sub.id === subchapterId);
      if (found) {
        subchapterToEdit = found;
        break;
      }
    }

    if (subchapterToEdit) {
      setEditingSubchapterId(subchapterId);
      setEditingSubchapterInitialTitle(subchapterToEdit.title);
      setEditingSubchapterInitialOrder(subchapterToEdit.order);
      setIsSubchapterEditModalOpen(true);
    }
  };
  const handleSubchapterEditSuccess = () => {
    fetchCourse(); // Re-fetch course data to update UI
    setIsSubchapterEditModalOpen(false);
  };

  const handleDeleteSubchapter = async (subchapterId: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту подглаву? Это действие нельзя отменить.')) {
      return;
    }

    try {
      await coursesApi.deleteSubchapter(subchapterId);
      fetchCourse(); // Re-fetch course data to update UI
    } catch (err) {
      // Error handled by UI
    }
  };

  const handleCreateContentBlock = async (subchapterId: number) => {
    try {
      // Находим максимальный порядок среди существующих блоков контента в этой подглаве
      const chapter = course?.chapters?.find(ch =>
        ch.subchapters?.some(sub => sub.id === subchapterId)
      );
      const subchapter = chapter?.subchapters?.find(sub => sub.id === subchapterId);
      const maxOrder = subchapter?.content_blocks && subchapter.content_blocks.length > 0 ?
        Math.max(...subchapter.content_blocks.map(block => block.order)) : 0;

      await coursesApi.createContentBlock(subchapterId, {
        type: 'theory',
        content: 'Новый блок контента',
        order: maxOrder + 1,
      });

      fetchCourse(); // Обновляем данные курса
    } catch (err) {
      // Error handled by UI
    }
  };

  const handleEditContentBlock = (contentBlockId: number) => {
    if (!course?.chapters) return; // Ensure chapters exist
    let blockToEdit = null;
    for (const chapter of course.chapters) {
      for (const subchapter of chapter.subchapters || []) {
        const found = subchapter.content_blocks?.find(block => block.id === contentBlockId);
        if (found) {
          blockToEdit = found;
          break;
        }
      }
      if (blockToEdit) break;
    }

    if (blockToEdit) {
      setEditingContentBlock(blockToEdit);
      setEditedContentBlockType(blockToEdit.type);
      setEditedContentBlockContent(blockToEdit.content);
      setEditedContentBlockAnswer(blockToEdit.answer || '');
      setEditedContentBlockOrder(blockToEdit.order);
    }
  };

  const handleSaveContentBlock = async () => {
    if (!editingContentBlock) {
      setContentBlockEditError('Блок контента не выбран для редактирования');
      return;
    }
    if (!editedContentBlockType) {
      setContentBlockEditError('Тип блока обязателен');
      return;
    }
    if (!editedContentBlockContent.trim()) {
      setContentBlockEditError('Содержание блока обязательно');
      return;
    }
    if (editedContentBlockType === 'task' && !editedContentBlockAnswer?.trim()) {
      setContentBlockEditError('Ответ для задания обязателен');
      return;
    }
    if (editedContentBlockOrder === undefined || isNaN(editedContentBlockOrder)) {
      setContentBlockEditError('Порядок блока обязателен и должен быть числом');
      return;
    }

    try {
      setContentBlockEditLoading(true);
      setContentBlockEditError(null);

      await coursesApi.updateContentBlock(editingContentBlock.id, {
        type: editedContentBlockType,
        content: editedContentBlockContent.trim(),
        answer: editedContentBlockType === 'task' ? editedContentBlockAnswer?.trim() || null : null,
        order: editedContentBlockOrder,
      });

      fetchCourse(); // Re-fetch course data to update UI
      setEditingContentBlock(null); // Close right panel
    } catch (err) {
      // Error handled by UI
      setContentBlockEditError('Ошибка при обновлении блока контента');
    } finally {
      setContentBlockEditLoading(false);
    }
  };

  const handleCancelContentBlockEdit = () => {
    setEditingContentBlock(null);
    setContentBlockEditError(null);
  };

  const handleDeleteContentBlock = async (contentBlockId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот блок контента? Это действие нельзя отменить.')) {
      return;
    }

    try {
      await coursesApi.deleteContentBlock(contentBlockId);
      fetchCourse(); // Re-fetch course data to update UI
    } catch (err) {
      // Error handled by UI
    }
  };

  const getContentBlockIcon = (type: string) => {
    switch (type) {
      case 'theory':
        return <FileText className="w-4 h-4" />;
      case 'task':
        return <Code className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Курс не найден'}</p>
          <button
            onClick={() => navigate('/courses')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Вернуться к курсам
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="course-manage-container min-h-screen bg-gray-50">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-white border-b">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/courses')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            К курсам
          </button>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            <span className="course-title font-medium">{course.title}</span>
            {course.is_public ? (
              <Eye className="w-4 h-4 text-green-600" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAuthor && (
            <Button
              onClick={handleToggleCourseEditing}
              variant="outline"
              className="flex items-center gap-2"
              disabled={courseEditLoading}
            >
              {isCourseEditing ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
              {isCourseEditing ? 'Отмена' : 'Настройки'}
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Course Info - Top Block */}
          <div className="course-info-card p-6 mb-6">
            {courseEditError && (
              <div className="error-message mb-4">
                {courseEditError}
              </div>
            )}
            {isCourseEditing ? (
              <>
                <div className="mb-4">
                  <Label htmlFor="course-title-edit" className="block text-lg font-semibold mb-2">Название курса</Label>
                  <Input
                    id="course-title-edit"
                    value={editedCourseTitle}
                    onChange={(e) => setEditedCourseTitle(e.target.value)}
                    className="course-title text-2xl font-bold"
                    placeholder="Введите название курса"
                    disabled={courseEditLoading}
                  />
                </div>
                <div className="mb-4">
                  <Label htmlFor="course-description-edit" className="block text-lg font-semibold mb-2">Описание курса</Label>
                  <RichTextEditor
                    value={editedCourseDescription}
                    onChange={setEditedCourseDescription}
                    placeholder="Опишите ваш курс"
                    disabled={courseEditLoading}
                    className="min-h-[150px]"
                  />
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <Switch
                    id="course-isPublic-edit"
                    checked={editedCourseIsPublic}
                    onCheckedChange={(checked) => setEditedCourseIsPublic(checked)}
                    disabled={courseEditLoading}
                  />
                  <Label htmlFor="course-isPublic-edit" className="text-sm text-gray-600">
                    {editedCourseIsPublic ? 'Публичный курс' : 'Приватный курс'}
                  </Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={handleSaveCourse}
                    disabled={courseEditLoading}
                  >
                    {courseEditLoading ? 'Сохранение...' : 'Сохранить изменения'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h1 className="course-title text-2xl font-bold mb-2">{course.title}</h1>
                <p className="course-description mb-4">{course.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Создан: {new Date(course.created_at).toLocaleDateString()}</span>
                  {course.updated_at !== course.created_at && (
                    <span>Обновлен: {new Date(course.updated_at).toLocaleDateString()}</span>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    course.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {course.is_public ? 'Публичный' : 'Приватный'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Main Content Area: Chapters List (Left) and Content Block Editor (Right) */}
          <div className="flex gap-6">
            {/* Left Column: Chapters and Subchapters List */}
            <div className={`flex-1 ${editingContentBlock ? 'w-1/3' : 'w-full'}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Главы курса</h2>
                <Button
                  onClick={handleCreateChapter}
                  className="btn-primary flex items-center gap-2"
                  disabled={chapterCreateLoading}
                >
                  <Plus className="w-4 h-4" />
                  {chapterCreateLoading ? 'Создание...' : 'Добавить главу'}
                </Button>
              </div>

              <div className="chapters-list space-y-4">
                {course.chapters && course.chapters.length > 0 ? (
                  course.chapters.map((chapter) => (
                    <div key={chapter.id} className="chapter-item border">
                      {/* Chapter Header */}
                      <div className="p-4 border-b">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleChapter(chapter.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {expandedChapters.has(chapter.id) ? (
                                <ChevronDown className="w-5 h-5" />
                              ) : (
                                <ChevronRight className="w-5 h-5" />
                              )}
                            </button>
                            <h3 className="chapter-title text-lg font-semibold">{chapter.title}</h3>
                            <span className="text-sm text-gray-500">#{chapter.order}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleEditChapter(chapter.id)}
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-blue-600"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteChapter(chapter.id)}
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {expandedChapters.has(chapter.id) && (
                          <div className="mt-4">
                            <Button
                              onClick={() => handleCreateSubchapter(chapter.id)}
                              variant="ghost"
                              className="flex items-center gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              disabled={subchapterCreateLoading}
                            >
                              <Plus className="w-4 h-4" />
                              {subchapterCreateLoading ? 'Создание...' : 'Добавить подглаву'}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Subchapters */}
                      {expandedChapters.has(chapter.id) && chapter.subchapters && (
                        <div className="p-4 space-y-2">
                          {chapter.subchapters.map((subchapter) => (
                            <div key={subchapter.id} className="subchapter-item p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="subchapter-title font-medium">{subchapter.title}</h4>
                                <span className="text-sm text-gray-500">#{subchapter.order}</span>
                                <div className="flex items-center gap-2">
                                  <Button
                                    onClick={() => handleEditSubchapter(subchapter.id)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-400 hover:text-blue-600"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteSubchapter(subchapter.id)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-400 hover:text-red-600"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>

                              {/* Content Blocks */}
                              {subchapter.content_blocks && subchapter.content_blocks.length > 0 && (
                                <div className="space-y-2">
                                  {subchapter.content_blocks.map((block) => (
                                    <div key={block.id} className="content-block-item flex items-center justify-between p-2">
                                      <div className="flex items-center gap-2">
                                        {getContentBlockIcon(block.type)}
                                        <span className="text-sm font-medium">
                                          {block.type === 'theory' ? 'Теория' : 'Задание'}
                                        </span>
                                        <span className="text-xs text-gray-500">#{block.order}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          onClick={() => handleEditContentBlock(block.id)}
                                          variant="ghost"
                                          size="sm"
                                          className="text-gray-400 hover:text-blue-600"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          onClick={() => handleDeleteContentBlock(block.id)}
                                          variant="ghost"
                                          size="sm"
                                          className="text-gray-400 hover:text-red-600"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <Button
                                onClick={() => handleCreateContentBlock(subchapter.id)}
                                variant="ghost"
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 w-full mt-2"
                              >
                                <Plus className="w-4 h-4" />
                                Добавить блок контента
                              </Button>
                            </div>
                          ))}

                          {(!chapter.subchapters || chapter.subchapters.length === 0) && (
                            <div className="text-center py-8 text-gray-500">
                              <p>В этой главе пока нет подглав</p>
                              <Button
                                onClick={() => handleCreateSubchapter(chapter.id)}
                                variant="ghost"
                                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 mx-auto mt-2"
                                disabled={subchapterCreateLoading}
                              >
                                <Plus className="w-4 h-4" />
                                {subchapterCreateLoading ? 'Создание...' : 'Добавить первую подглаву'}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="course-info-card p-8 text-center">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Нет глав</h3>
                    <p className="text-gray-500 mb-4">В курсе пока нет ни одной главы</p>
                    <Button
                      onClick={handleCreateChapter}
                      className="btn-primary px-6 py-3"
                      disabled={chapterCreateLoading}
                    >
                      {chapterCreateLoading ? 'Создание...' : 'Создать первую главу'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Content Block Editor */}
            {editingContentBlock && (
              <div className="content-editor-panel w-2/3 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Редактировать блок контента</h2>
                  <Button
                    onClick={handleCancelContentBlockEdit}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {contentBlockEditError && (
                  <div className="error-message mb-4">
                    {contentBlockEditError}
                  </div>
                )}

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="block-type" className="text-right">
                      Тип
                    </Label>
                    <Select
                      value={editedContentBlockType}
                      onValueChange={(value: 'theory' | 'task') => setEditedContentBlockType(value)}
                      disabled={contentBlockEditLoading}
                    >
                      <SelectTrigger id="block-type" className="col-span-3">
                        <SelectValue placeholder="Выберите тип" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="theory">Теория</SelectItem>
                        <SelectItem value="task">Задание</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="block-content" className="text-right mt-2">
                      Содержание
                    </Label>
                    <div className="col-span-3">
                      <RichTextEditor
                        value={editedContentBlockContent}
                        onChange={setEditedContentBlockContent}
                        placeholder="Введите содержание блока"
                        disabled={contentBlockEditLoading}
                        className="min-h-[200px]"
                      />
                    </div>
                  </div>

                  {editedContentBlockType === 'task' && (
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label htmlFor="block-answer" className="text-right mt-2">
                        Ответ
                      </Label>
                      <div className="col-span-3">
                        <RichTextEditor
                          value={editedContentBlockAnswer || ''}
                          onChange={setEditedContentBlockAnswer}
                          placeholder="Введите ожидаемый ответ для задания"
                          disabled={contentBlockEditLoading}
                          className="min-h-[150px]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="block-order" className="text-right">
                      Порядок
                    </Label>
                    <Input
                      id="block-order"
                      type="number"
                      value={editedContentBlockOrder}
                      onChange={(e) => setEditedContentBlockOrder(parseInt(e.target.value))}
                      className="col-span-3"
                      disabled={contentBlockEditLoading}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    onClick={handleCancelContentBlockEdit}
                    variant="outline"
                    disabled={contentBlockEditLoading}
                  >
                    Отмена
                  </Button>
                  <Button
                    onClick={handleSaveContentBlock}
                    disabled={contentBlockEditLoading}
                  >
                    {contentBlockEditLoading ? 'Сохранение...' : 'Сохранить изменения'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Chapter Modal */}
      {course && (
        <ChapterCreateModal
          isOpen={isChapterCreateModalOpen}
          onClose={() => setIsChapterCreateModalOpen(false)}
          onSuccess={() => {
            setChapterCreateLoading(false);
            fetchCourse(); // Re-fetch course data to update UI
            setIsChapterCreateModalOpen(false);
          }}
          courseId={courseId}
          initialOrder={(() => {
            if (!course.chapters || course.chapters.length === 0) return 1;
            const maxOrder = Math.max(...course.chapters.map(ch => ch.order));
            return maxOrder + 1;
          })()}
        />
      )}

      {/* Create Subchapter Modal */}
      {course && creatingSubchapterChapterId && (
        <SubchapterCreateModal
          isOpen={isSubchapterCreateModalOpen}
          onClose={() => {
            setIsSubchapterCreateModalOpen(false);
            setCreatingSubchapterChapterId(null);
          }}
          onSuccess={() => {
            setSubchapterCreateLoading(false);
            setCreatingSubchapterChapterId(null);
            fetchCourse(); // Re-fetch course data to update UI
            setIsSubchapterCreateModalOpen(false);
          }}
          chapterId={creatingSubchapterChapterId}
          initialOrder={(() => {
            const chapter = course.chapters?.find(ch => ch.id === creatingSubchapterChapterId);
            if (!chapter?.subchapters || chapter.subchapters.length === 0) return 1;
            const maxOrder = Math.max(...chapter.subchapters.map(sub => sub.order));
            return maxOrder + 1;
          })()}
        />
      )}

      {/* Edit Chapter Modal */}
      {course && editingChapterId !== null && (
        <ChapterEditModal
          isOpen={isChapterEditModalOpen}
          onClose={() => setIsChapterEditModalOpen(false)}
          onSuccess={handleChapterEditSuccess}
          chapterId={editingChapterId}
          initialTitle={editingChapterInitialTitle}
          initialOrder={editingChapterInitialOrder}
        />
      )}

      {/* Edit Subchapter Modal */}
      {course && editingSubchapterId !== null && (
        <SubchapterEditModal
          isOpen={isSubchapterEditModalOpen}
          onClose={() => setIsSubchapterEditModalOpen(false)}
          onSuccess={handleSubchapterEditSuccess}
          subchapterId={editingSubchapterId}
          initialTitle={editingSubchapterInitialTitle}
          initialOrder={editingSubchapterInitialOrder}
        />
      )}
    </div>
  );
}

export default CourseManagePage;
