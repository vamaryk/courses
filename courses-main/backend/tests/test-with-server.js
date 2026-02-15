// Скрипт для запуска сервера и тестирования с логированием
import { spawn } from 'child_process';

console.log('🚀 Запуск сервера с детальным логированием...');

// Запускаем сервер
const server = spawn('node', ['server.js'], {
  cwd: 'd:\\mcourse.web\\backend',
  stdio: 'inherit'
});

server.on('error', (error) => {
  console.error('❌ Ошибка запуска сервера:', error);
});

server.on('exit', (code) => {
  console.log(`📴 Сервер остановлен с кодом ${code}`);
});

// Ждем немного чтобы сервер успел запуститься
setTimeout(() => {
  console.log('⏳ Сервер должен быть запущен, запускаем тест...');

  // Запускаем тест
  const test = spawn('node', ['test/test-calendar-api.js'], {
    cwd: 'd:\\mcourse.web\\backend',
    stdio: 'inherit'
  });

  test.on('exit', (code) => {
    console.log(`📊 Тест завершен с кодом ${code}`);
    server.kill();
  });
}, 3000);
