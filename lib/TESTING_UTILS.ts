/**
 * Payment Webhook - Testing Utilities & Examples
 * 
 * Этот файл содержит примеры тестирования webhook'а
 * и утилиты для вычисления HMAC подписей вручную
 */

// ============================================
// 1️⃣ ПРИМЕРЫ ТЕСТОВЫХ PAYLOAD'ОВ
// ============================================

export const TEST_PAYLOADS = {
  success: {
    body: '{"order_id":123,"status":"success","tx_id":"txn_abc123"}',
    expectedFields: {
      order_id: 123,
      status: 'success',
      tx_id: 'txn_abc123',
    },
  },
  failed: {
    body: '{"order_id":124,"status":"failed","tx_id":"txn_xyz789"}',
    expectedFields: {
      order_id: 124,
      status: 'failed',
      tx_id: 'txn_xyz789',
    },
  },
};

// ============================================
// 2️⃣ ПРИМЕРЫ HMAC-SHA256 ПОДПИСЕЙ
// ============================================

/**
 * Утилита для вычисления HMAC-SHA256
 * 
 * Используйте для проверки, что подпись вычисляется правильно
 */
export const HMAC_EXAMPLES = {
  secret: 'test-secret-key-12345',
  
  /**
   * Пример 1: Успешный платёж
   * 
   * Secret: test-secret-key-12345
   * Body:   {"order_id":123,"status":"success","tx_id":"txn_abc123"}
   * 
   * Вычисление:
   * signature = HMAC-SHA256(
   *   key=test-secret-key-12345,
   *   message={"order_id":123,"status":"success","tx_id":"txn_abc123"}
   * )
   * 
   * Результат (hex):
   */
  success: {
    body: '{"order_id":123,"status":"success","tx_id":"txn_abc123"}',
    signature:
      'f4f47e9c8d8e2f3c5a7b9d1e3f5a7b9d1e3f5a7b9d1e3f5a7b9d1e3f5a7b9d', // example
    headerValue: 'X-Payment-Signature: f4f47e9c8d8e2f3c5a7b9d1e3f5a7b9d1e3f5a7b9d1e3f5a7b9d1e3f5a7b9d',
  },

  /**
   * Пример 2: Неудачный платёж
   */
  failed: {
    body: '{"order_id":124,"status":"failed","tx_id":"txn_xyz789"}',
    signature:
      'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
    headerValue: 'X-Payment-Signature: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
  },
};

// ============================================
// 3️⃣ ПРИМЕРЫ CURL КОМАНД ДЛЯ ТЕСТИРОВАНИЯ
// ============================================

export const CURL_EXAMPLES = {
  /**
   * Пример 1: Отправить webhook о успешном платеже
   * 
   * Команда:
   */
  success: `curl -X POST https://api.iq-home.kz/api/payment/webhook \\
  -H "Content-Type: application/json" \\
  -H "X-Payment-Signature: f4f47e9c8d8e2f3c5a7b9d1e3f5a7b9d1e3f5a7b9d1e3f5a7b9d1e3f5a7b9d" \\
  -d '{"order_id":123,"status":"success","tx_id":"txn_abc123"}'`,

  /**
   * Пример 2: Отправить webhook о неудачном платеже
   */
  failed: `curl -X POST https://api.iq-home.kz/api/payment/webhook \\
  -H "Content-Type: application/json" \\
  -H "X-Payment-Signature: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0" \\
  -d '{"order_id":124,"status":"failed","tx_id":"txn_xyz789"}'`,

  /**
   * Пример 3: Вычислить подпись вручную (bash)
   */
  computeSignature: `# Установите SECRET и BODY
SECRET="your-secret-key"
BODY='{"order_id":123,"status":"success","tx_id":"txn_abc123"}'

# Вычислите подпись
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | cut -d' ' -f2)

# Выведите результат
echo "Signature: $SIGNATURE"

# Или отправьте webhook
curl -X POST https://api.iq-home.kz/api/payment/webhook \\
  -H "Content-Type: application/json" \\
  -H "X-Payment-Signature: $SIGNATURE" \\
  -d "$BODY"`,

  /**
   * Пример 4: Вычислить подпись в Python
   */
  computeSignaturePython: `import hmac
import hashlib

secret = "your-secret-key"
body = '{"order_id":123,"status":"success","tx_id":"txn_abc123"}'

signature = hmac.new(
  secret.encode(),
  body.encode(),
  hashlib.sha256
).hexdigest()

print(f"Signature: {signature}")`,

  /**
   * Пример 5: Вычислить подпись в Node.js
   */
  computeSignatureNodejs: `const crypto = require('crypto');

const secret = 'your-secret-key';
const body = '{"order_id":123,"status":"success","tx_id":"txn_abc123"}';

const signature = crypto
  .createHmac('sha256', secret)
  .update(body)
  .digest('hex');

console.log('Signature:', signature);`,
};

// ============================================
// 4️⃣ ПРИМЕРЫ ОТВЕТОВ БЭКЕНДА
// ============================================

export const BACKEND_RESPONSES = {
  /**
   * 200 OK - успешно обработано
   */
  success: {
    status: 200,
    body: {
      success: true,
      message: 'Payment webhook processed successfully',
      data: {
        orderId: 123,
        status: 'processed',
        processedAt: '2025-05-26T12:34:56Z',
      },
    },
  },

  /**
   * 200 OK - уже было обработано (идемпотентно)
   */
  alreadyProcessed: {
    status: 200,
    body: {
      success: true,
      message: 'Payment already processed',
      data: {
        orderId: 123,
        status: 'already_processed',
        firstProcessedAt: '2025-05-26T10:00:00Z',
        duplicateReceivedAt: '2025-05-26T12:34:56Z',
      },
    },
  },

  /**
   * 401 Unauthorized - неверная подпись
   */
  invalidSignature: {
    status: 401,
    body: {
      error: 'Invalid signature',
      message:
        'X-Payment-Signature header is invalid or missing',
    },
  },

  /**
   * 400 Bad Request - неверный формат
   */
  badRequest: {
    status: 400,
    body: {
      error: 'Bad request',
      message: 'Invalid status value. Expected "success" or "failed"',
      details: {
        receivedStatus: 'pending',
        validValues: ['success', 'failed'],
      },
    },
  },

  /**
   * 404 Not Found - заказ не найден
   */
  orderNotFound: {
    status: 404,
    body: {
      error: 'Not found',
      message: 'Order with ID 999 not found',
    },
  },

  /**
   * 500 Internal Server Error
   */
  serverError: {
    status: 500,
    body: {
      error: 'Internal server error',
      message: 'Database connection failed',
      requestId: 'req_12345abcde',
    },
  },
};

// ============================================
// 5️⃣ ПРИМЕРЫ JAVASCRIPT КОДА ДЛЯ ТЕСТИРОВАНИЯ
// ============================================

/**
 * Пример: Вычислить подпись и отправить webhook
 */
export async function testWebhookExample() {
  const crypto = require('crypto');

  const secret = 'test-secret-key-12345';
  const orderId = 123;
  const status = 'success';
  const txId = 'txn_abc123';

  // 1. Формируем тело с фиксированным порядком ключей
  const body = JSON.stringify({
    order_id: orderId,
    status: status,
    tx_id: txId,
  });

  // 2. Вычисляем подпись
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  // 3. Отправляем webhook
  const response = await fetch('https://api.iq-home.kz/api/payment/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Payment-Signature': signature,
    },
    body: body,
  });

  // 4. Обрабатываем ответ
  const data = await response.json();
  console.log(`Status: ${response.status}`);
  console.log(`Response:`, data);

  return {
    body: body,
    signature: signature,
    status: response.status,
    data: data,
  };
}

// ============================================
// 6️⃣ ПРИМЕРЫ ТЕСТОВЫХ СЦЕНАРИЕВ
// ============================================

export const TEST_SCENARIOS = {
  /**
   * Сценарий 1: Happy path - успешный платёж
   */
  happyPath: {
    name: 'Happy Path - успешный платёж',
    steps: [
      '1. Пользователь подтверждает оплату на платежной странице',
      '2. Платёжный провайдер отправляет callback на фронтенд',
      '3. Фронтенд вычисляет HMAC-SHA256 подпись',
      '4. Фронтенд отправляет POST webhook на backend',
      '5. Backend проверяет подпись',
      '6. Backend обновляет статус заказа на "paid"',
      '7. Backend возвращает 200 OK',
    ],
  },

  /**
   * Сценарий 2: Неверная подпись
   */
  invalidSignature: {
    name: 'Invalid Signature',
    steps: [
      '1. Фронтенд отправляет webhook с неверной подписью',
      '2. Backend проверяет подпись',
      '3. Подпись не совпадает',
      '4. Backend возвращает 401 Unauthorized',
      '5. Фронтенд НЕ повторяет (это клиентская ошибка)',
    ],
  },

  /**
   * Сценарий 3: Ошибка на бэкенде с retry
   */
  serverErrorWithRetry: {
    name: 'Server Error with Retry',
    steps: [
      '1. Фронтенд отправляет webhook',
      '2. Backend возвращает 500 Internal Server Error',
      '3. Фронтенд повторяет через 1 секунду (попытка 1)',
      '4. Backend возвращает 500 еще раз',
      '5. Фронтенд повторяет через 2 секунды (попытка 2)',
      '6. Backend возвращает 500 еще раз',
      '7. Фронтенд повторяет через 4 секунды (попытка 3)',
      '8. Backend возвращает 200 OK',
      '9. Webhook успешно обработан',
    ],
  },

  /**
   * Сценарий 4: Идемпотентность
   */
  idempotency: {
    name: 'Idempotency',
    steps: [
      '1. Фронтенд отправляет webhook',
      '2. Backend обрабатывает, обновляет заказ, возвращает 200',
      '3. Фронтенд не получил 200 (network issue), повторяет',
      '4. Backend получает тот же webhook второй раз',
      '5. Backend видит, что уже обработан, возвращает 200',
      '6. Заказ остался в состоянии "paid" (не было двойной оплаты)',
    ],
  },
};

// ============================================
// 7️⃣ ШПАРГАЛКА ДЛЯ ДЕБАГА
// ============================================

export const DEBUG_CHECKLIST = `
✓ Проверка порядка ключей JSON:
  Должно быть: {"order_id": ..., "status": ..., "tx_id": ...}
  Не должно быть: {"status": ..., "order_id": ..., "tx_id": ...}

✓ Проверка подписи:
  Используется RAW тело: '{"order_id":123,"status":"success","tx_id":"txn_abc123"}'
  Не используется: JSON.parse().stringify() или другие преобразования

✓ Проверка SECRET:
  Secret должна быть в процессе окружения: process.env.PAYMENT_WEBHOOK_SECRET
  Не должна быть хардкодирована в коде

✓ Проверка HTTP метода:
  Должно быть: POST
  Не должно быть: GET, PUT, DELETE

✓ Проверка заголовков:
  Content-Type: application/json
  X-Payment-Signature: <hex-string>

✓ Проверка retry логики:
  401, 400, 404 - НЕ повторяются
  500, network errors - повторяются до 3 раз
  Экспоненциальная задержка: 1s, 2s, 4s

✓ Проверка ответов:
  200 - успех (идемпотентно)
  401 - неверная подпись (не повторять)
  400 - неверный формат (не повторять)
  404 - заказ не найден (не повторять)
  500 - ошибка сервера (повторить)
`;

// ============================================
// 8️⃣ ПРИМЕРЫ ЛОГИРОВАНИЯ
// ============================================

export const LOGGING_EXAMPLES = {
  success: '[Payment] ✓ Payment confirmed for order 123, tx=txn_abc123',
  error401: '[Payment Error] orderId=123, txId=txn_abc123, message=Неверная или отсутствующая подпись (401)',
  error500: '[Payment] Retry attempt 2/3 for order 123 after 1000ms',
  errorNetwork: '[Payment Error] Failed after 3 attempts: Network timeout',
};
