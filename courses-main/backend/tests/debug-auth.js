import http from 'http';

// Диагностика сессий и аутентификации
async function debugAuth() {
  console.log('🔍 Диагностика аутентификации и сессий...\n');

  const testEmail = 'calendar_test@example.com';
  const testPassword = 'testpassword123';

  // Шаг 1: Вход в систему
  console.log('🔑 Шаг 1: Вход в систему...');
  const loginData = JSON.stringify({
    email: testEmail,
    password: testPassword
  });

  const loginOptions = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/auth/signin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };

  try {
    const loginResponse = await makeRequest(loginOptions, loginData);
    console.log('📊 Статус входа:', loginResponse.statusCode);
    console.log('📦 Ответ входа:', loginResponse.body);

    if (loginResponse.statusCode !== 200) {
      console.log('❌ Вход не удался');
      return;
    }

    const cookies = loginResponse.headers['set-cookie'];
    console.log('🍪 Куки получены:', cookies ? 'Да' : 'Нет');
    if (cookies) {
      console.log('🍪 Содержимое куки:', cookies[0]);
    }

    if (!cookies) {
      console.log('❌ Куки не получены - сессия не создана');
      return;
    }

    // Шаг 2: Тестируем защищенный маршрут
    console.log('\n🔐 Шаг 2: Тестируем защищенный маршрут...');
    const protectedOptions = {
      hostname: 'localhost',
      port: 3002,
      path: '/api/protected',
      method: 'GET',
      headers: {
        'Cookie': cookies
      }
    };

    const protectedResponse = await makeRequest(protectedOptions);
    console.log('📊 Статус защищенного маршрута:', protectedResponse.statusCode);
    console.log('📦 Ответ защищенного маршрута:', protectedResponse.body);

    // Шаг 3: Тестируем создание задачи
    console.log('\n📅 Шаг 3: Тестируем создание задачи...');
    const now = new Date();
    const startTime = new Date(now.getTime() + 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    const eventData = JSON.stringify({
      title: 'Диагностическая задача',
      description: 'Задача для диагностики аутентификации',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      event_type: 'meeting',
      location: 'Онлайн'
    });

    const eventOptions = {
      hostname: 'localhost',
      port: 3002,
      path: '/api/calendar',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(eventData),
        'Cookie': cookies
      }
    };

    const eventResponse = await makeRequest(eventOptions, eventData);
    console.log('📊 Статус создания задачи:', eventResponse.statusCode);
    console.log('📦 Ответ создания задачи:', eventResponse.body);

    // Шаг 4: Тестируем получение задач
    console.log('\n📋 Шаг 4: Тестируем получение задач...');
    const getEventsOptions = {
      hostname: 'localhost',
      port: 3002,
      path: '/api/calendar',
      method: 'GET',
      headers: {
        'Cookie': cookies
      }
    };

    const getEventsResponse = await makeRequest(getEventsOptions);
    console.log('📊 Статус получения задач:', getEventsResponse.statusCode);
    console.log('📦 Ответ получения задач:', getEventsResponse.body);

  } catch (error) {
    console.error('❌ Ошибка при диагностике:', error.message);
  }
}

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const body = responseData ? JSON.parse(responseData) : null;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: responseData
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

// Запуск диагностики
debugAuth();
