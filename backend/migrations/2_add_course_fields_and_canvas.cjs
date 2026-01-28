exports.up = (pgm) => {
  // Добавляем поля для курсов
  pgm.addColumns('courses', {
    cover_image: { type: 'TEXT', notNull: false },
    tags: { type: 'TEXT[]', notNull: false, default: '{}' },
    specialty: { type: 'TEXT', notNull: false },
    target_audience: { type: 'TEXT', notNull: false },
    about_course: { type: 'TEXT', notNull: false },
  });

  // Добавляем поле canvas_data для глав (JSON для хранения состояния холста)
  pgm.addColumns('chapters', {
    canvas_data: { type: 'JSONB', notNull: false },
  });
};

exports.down = (pgm) => {
  // Откатываем изменения
  pgm.dropColumns('chapters', ['canvas_data']);
  pgm.dropColumns('courses', ['cover_image', 'tags', 'specialty', 'target_audience', 'about_course']);
};
