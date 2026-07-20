import crypto from 'crypto';

/**
 * Типы статуса платежа
 */
export type PaymentStatus = 'success' | 'failed';

/**
 * Ошибка при отправке webhook
 */
export class PaymentWebhookError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable?: boolean
  ) {
    super(message);
    this.name = 'PaymentWebhookError';
  }
}

/**
 * Формирует JSON тело с фиксированным порядком ключей
 *
 * amount (в целых тенге, как и строит платёжную ссылку rozetki.kz) —
 * необязателен: PAY-002, бэкенд rozetki.kz пока тоже трактует его как
 * опциональный (0/отсутствие поля пропускает сверку с order total). Когда
 * передан, currency жёстко "KZT" — во всей системе никогда не было
 * мультивалютности.
 */
function createPaymentBody(
  orderId: number,
  status: PaymentStatus,
  txId: string,
  amount?: number
): string {
  const body: Record<string, unknown> = {
    orderId: orderId,
    status: status,
    tx_id: txId,
  };
  if (amount !== undefined) {
    body.amount = amount;
    body.currency = 'KZT';
  }

  return JSON.stringify(body);
}

/**
 * Вычисляет HMAC-SHA256 подпись
 */
function calculateSignature(secret: string, message: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(message);
  return hmac.digest('hex');
}

/**
 * Отправляет payment webhook на бэкенд
 *
 * @param orderId - ID заказа
 * @param status - статус платежа ('success' или 'failed')
 * @param txId - уникальный ID транзакции
 * @param amount - сумма заказа в целых тенге (PAY-002, опционально)
 * @throws PaymentWebhookError при ошибке отправки или невалидном ответе
 */
export async function sendPaymentWebhook(
  orderId: number,
  status: PaymentStatus,
  txId: string,
  amount?: number
): Promise<void> {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;

  if (!secret) {
    throw new PaymentWebhookError(
      'PAYMENT_WEBHOOK_SECRET не установлена в переменных окружения',
      500,
      false
    );
  }

  const webhookUrl = 'https://chat.iq-home.kz/api/payment/webhook';
  const body = createPaymentBody(orderId, status, txId, amount);
  const signature = calculateSignature(secret, body);

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Payment-Signature': signature,
        },
        body: body,
      });

      // 200 OK - успешно обработано
      if (response.ok) {
        return;
      }

      // 401 - неверная подпись
      if (response.status === 401) {
        throw new PaymentWebhookError(
          'Неверная или отсутствующая подпись (401)',
          401,
          false
        );
      }

      // 400 - неверный статус или формат
      if (response.status === 400) {
        const errorBody = await response.text();
        throw new PaymentWebhookError(
          `Неверный статус или формат тела (400): ${errorBody}`,
          400,
          false
        );
      }

      // 404 - заказ не найден
      if (response.status === 404) {
        throw new PaymentWebhookError(
          'Заказ не найден (404)',
          404,
          false
        );
      }

      // 409 - заказ уже не в статусе pending или уже обработан
      if (response.status === 409) {
        console.warn(
          `Webhook declined with 409 Conflict for order ${orderId}, tx_id=${txId}. No retry needed.`
        );
        return;
      }

      // 500 - внутренняя ошибка (повторяем)
      if (response.status === 500) {
        const errorBody = await response.text();
        lastError = new PaymentWebhookError(
          `Внутренняя ошибка сервера (500): ${errorBody}`,
          500,
          true
        );

        // Если это не последняя попытка, ждём и повторяем
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw lastError;
      }

      // Неожиданный статус код
      throw new PaymentWebhookError(
        `Неожиданный статус ответа: ${response.status}`,
        response.status,
        false
      );
    } catch (error) {
      // Если это наша ошибка PaymentWebhookError и она не повторяемая
      if (error instanceof PaymentWebhookError && !error.retryable) {
        throw error;
      }

      // Если это network error, повторяем (это retryable)
      if (error instanceof TypeError) {
        lastError = error;

        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw new PaymentWebhookError(
          `Ошибка сети при отправке webhook: ${error.message}`,
          undefined,
          false
        );
      }

      // Для остальных ошибок
      throw error;
    }
  }

  // На случай, если выход из цикла необъяснимым способом
  if (lastError) {
    throw lastError;
  }

  throw new PaymentWebhookError(
    'Не удалось отправить webhook после всех попыток',
    500,
    false
  );
}
