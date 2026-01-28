exports.up = (pgm) => {
  // Добавляем поле updated_at в таблицу profiles
  pgm.addColumns('profiles', {
    updated_at: { type: 'TIMESTAMP WITH TIME ZONE', notNull: false, default: pgm.func('NOW()') },
  });
};

exports.down = (pgm) => {
  // Откатываем изменения
  pgm.dropColumns('profiles', ['updated_at']);
};
