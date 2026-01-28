export const up = (pgm) => {
  pgm.dropColumn('profiles', 'full_name');
  pgm.addColumns('profiles', {
    first_name: { type: 'TEXT', notNull: false },
    last_name: { type: 'TEXT', notNull: false },
    patronymic: { type: 'TEXT', notNull: false },
  });
};

export const down = (pgm) => {
  pgm.dropColumns('profiles', ['first_name', 'last_name', 'patronymic']);
  pgm.addColumns('profiles', {
    full_name: { type: 'TEXT', notNull: false },
  });
};
