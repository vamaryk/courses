import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Task } from '../types';
import { differenceInMinutes, differenceInHours, isSameDay, isAfter, isBefore } from 'date-fns';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: () => void;
  onSave: (task: Omit<Task, 'id'>) => void;
  initialTask?: Task;
}

// Вспомогательная функция для форматирования времени с автоматической вставкой :
const formatTimeInput = (value: string): string => {
  // Удаляем все нецифровые символы
  const digits = value.replace(/\D/g, '').slice(0, 4);
  
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

export function TaskDialog({ open, onOpenChange, onSave, initialTask }: TaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showEndDate, setShowEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [timeError, setTimeError] = useState('');
  const [duration, setDuration] = useState<string>('');

  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      setStartDate('');
      setStartTime('');
      setEndTime('');
      setEndDate('');
      setShowEndDate(false);
      setTitleError('');
      setDescriptionError('');
      setTimeError('');
      setDuration('');
    }
  }, [open]);

  useEffect(() => {
    if (initialTask && open) {
      setTitle(initialTask.title);
      setDescription(initialTask.description);
      setStartDate(initialTask.startDate.toISOString().split('T')[0]);
      setStartTime(initialTask.startDate.toTimeString().slice(0, 5));
      setEndDate(initialTask.endDate.toISOString().split('T')[0]);
      setEndTime(initialTask.endDate.toTimeString().slice(0, 5));
      setShowEndDate(!isSameDay(initialTask.startDate, initialTask.endDate));
    }
  }, [initialTask, open]);

  useEffect(() => {
    if (startDate && startTime && endTime) {
      // Парсим время, добавляя недостающие нули для корректной даты
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      
      const start = new Date(`${startDate}T${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}`);
      const end = new Date(`${(showEndDate && endDate) ? endDate : startDate}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (isBefore(start, end) && (isSameDay(start, end) || showEndDate)) {
          const hours = differenceInHours(end, start);
          const minutes = differenceInMinutes(end, start) % 60;
          setDuration(`${hours} ч. ${minutes} мин.`);
          setTimeError('');
        } else {
          setDuration('');
          if (!showEndDate) {
            setShowEndDate(true);
            if (!endDate) {
              setEndDate(startDate);
            }
          }
        }
      }
    } else {
      setDuration('');
    }
  }, [startDate, startTime, endTime, endDate, showEndDate]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 100) {
      setTitle(value);
      setTitleError('');
    } else {
      setTitleError('Слишком длинное название 🤔, сократите до 100 символов');
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 150) {
      setDescription(value);
      setDescriptionError('');
    } else {
      setDescriptionError('Описание не должно превышать 150 символов');
    }
  };

  // Обработчик для ввода времени с авто-форматированием
  const handleTimeChange = (
    e: React.ChangeEvent<HTMLInputElement>, 
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const formatted = formatTimeInput(e.target.value);
    setter(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      setTimeError('Введите время в формате 24 часов (ЧЧ:ММ), например 09:30 или 18:45.');
      return;
    }

    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const start = new Date(`${startDate}T${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}`);
    const end = new Date(`${(showEndDate && endDate) ? endDate : startDate}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`);

    // Проверка времени начала и окончания
    if (isAfter(start, end)) {
      if (isSameDay(start, end)) {
        setTimeError('Время окончания должно быть позже времени начала.');
      } else if (endDate && isBefore(new Date(endDate), new Date(startDate))) {
        setTimeError('Дата окончания не может быть раньше даты начала.');
      } else {
        setTimeError('Проверьте правильность времени начала и окончания.');
      }
      return;
    }

    if (description.length > 150) {
      setDescriptionError('Описание не должно превышать 150 символов');
      return;
    }

    onSave({
      title,
      description,
      startDate: start,
      endDate: end,
    });

    onOpenChange();
  };

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 w-[500px] max-w-[95vw] z-[51]"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <Dialog.Title className="text-xl font-montserrat font-semibold mb-4">
            {initialTask ? 'Редактировать задачу' : 'Создать задачу'}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Форма для {initialTask ? 'редактирования' : 'создания'} задачи. Заполните название, дату, время начала и окончания. Описание необязательно.
          </Dialog.Description>
          <Dialog.Close asChild>
            <button className="absolute right-6 top-6 text-gray-400 hover:text-gray-600" onClick={onOpenChange}>
              <X className="w-5 h-5" />
            </button>
          </Dialog.Close>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium font-montserrat text-gray-700 mb-1">
                  Название
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
                {titleError && (
                  <p className="text-red-500 text-sm mt-1">{titleError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 font-montserrat mb-1">
                  Дата
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-montserrat mb-1">
                    Время начала
                  </label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => handleTimeChange(e, setStartTime)}
                    placeholder="ЧЧ:ММ"
                    inputMode="numeric"
                    maxLength={5}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-montserrat mb-1">
                    Время окончания
                  </label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => handleTimeChange(e, setEndTime)}
                    placeholder="ЧЧ:ММ"
                    inputMode="numeric"
                    maxLength={5}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
              </div>

              {showEndDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-montserrat mb-1">
                    Дата окончания
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
              )}

              {duration && (
                <div className="text-sm text-gray-600 font-montserrat">
                  Продолжительность: {duration}
                </div>
              )}

              {timeError && (
                <p className="text-red-500 text-sm mt-1">{timeError}</p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 font-montserrat mb-1">
                  Описание (необязательно)
                </label>
                <textarea
                  value={description}
                  onChange={handleDescriptionChange}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
                {descriptionError && (
                  <p className="text-red-500 text-sm mt-1">{descriptionError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-purple-500 text-white font-montserrat py-2 rounded-lg hover:bg-purple-600"
              >
                {initialTask ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}