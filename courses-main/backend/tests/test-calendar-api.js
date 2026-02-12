import http from 'http';

// Тест аутентификации и создания задач в календаре
async function testCalendarAPI() {
  console.log('🚀 Начинаем тестирование API календаря...\n');

  // Используем существующий тестовый аккаунт вместо создания нового
  const testEmail = 'dirtysass@mail.ru';
  const testPassword = 'dirtysass';

  console.log('📧 Используем существующий аккаунт:', testEmail);

  // Шаг 1: Вход в систему (вместо регистрации)
  console.log('\n🔑 Шаг 1: Вход в систему...');
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
    if (loginResponse.statusCode !== 200) {
      console.log('❌ Вход не удался:', loginResponse.body);
      console.log('💡 Если аккаунт не существует, создайте его вручную или запустите тест с регистрацией');
      return;
    }

    const cookies = loginResponse.headers['set-cookie'];
    if (!cookies) {
      console.log('❌ Куки не получены');
      return;
    }
    console.log('✅ Вход выполнен успешно');

    // Шаг 2: Создание задачи в календаре
    console.log('\n📅 Шаг 2: Создание задачи в календаре...');
    const now = new Date();
    const startTime = new Date(now.getTime() + 60 * 60 * 1000); // Через 1 час
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // Через 3 часа

    const eventData = JSON.stringify({
      title: 'Тестовая задача календаря',
      description: 'Описание тестовой задачи для проверки API',
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
    let createdEvent; // Для хранения созданной задачи

    if (eventResponse.statusCode === 201) {
      console.log('✅ Задача в календаре создана успешно!');
      createdEvent = eventResponse.body; // Сохраняем созданную задачу
      console.log('📦 Данные созданной задачи:', JSON.stringify(createdEvent, null, 2));
    } else {
      console.log('❌ Не удалось создать задачу в календаре:', eventResponse.body);
      return; // Прерываем тест, если создание не удалось
    }

    // Шаг 3: Получение списка задач календаря
    console.log('\n📋 Шаг 3: Получение списка задач календаря...');
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
    if (getEventsResponse.statusCode === 200) {
      console.log('✅ Список задач получен успешно!');
      console.log(`📊 Количество задач: ${getEventsResponse.body.length}`);
      console.log('📦 Данные задач:', JSON.stringify(getEventsResponse.body, null, 2));
    } else {
      console.log('❌ Не удалось получить список задач:', getEventsResponse.body);
      return; // Прерываем, если не удалось получить задачи
    }

    // Шаг 4: Обновление задачи
    if (createdEvent && createdEvent.id) {
      console.log('\n🔄 Шаг 4: Обновление созданной задачи...');
      const updatedEventData = JSON.stringify({
        ...createdEvent,
        title: 'Обновленная тестовая задача',
        description: 'Обновленное описание задачи',
        location: 'Офис'
      });

      const updateOptions = {
        hostname: 'localhost',
        port: 3002,
        path: `/api/calendar/${createdEvent.id}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(updatedEventData),
          'Cookie': cookies
        }
      };

      const updateResponse = await makeRequest(updateOptions, updatedEventData);
      if (updateResponse.statusCode === 200) {
        console.log('✅ Задача успешно обновлена!');
        console.log('📦 Обновленные данные:', JSON.stringify(updateResponse.body, null, 2));
      } else {
        console.log('❌ Не удалось обновить задачу:', updateResponse.body);
      }
    }

    // Шаг 5: Удаление задачи
    if (createdEvent && createdEvent.id) {
      console.log('\n🗑️ Шаг 5: Удаление созданной задачи...');
      const deleteOptions = {
        hostname: 'localhost',
        port: 3002,
        path: `/api/calendar/${createdEvent.id}`,
        method: 'DELETE',
        headers: {
          'Cookie': cookies
        }
      };

      const deleteResponse = await makeRequest(deleteOptions);
      if (deleteResponse.statusCode === 204) {
        console.log('✅ Задача успешно удалена!');
      } else {
        console.log('❌ Не удалось удалить задачу:', deleteResponse.body);
      }
    }

    console.log('\n🎉 Все тесты API календаря пройдены успешно!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
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

// Запуск теста
testCalendarAPI();
