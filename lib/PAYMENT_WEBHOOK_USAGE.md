# Пример использования Payment Webhook

## В Server Action (app/actions/payment.ts)

```typescript
'use server';

import { sendPaymentWebhook, PaymentWebhookError } from '@/lib/payment-webhook';

export async function confirmPayment(
  orderId: number,
  txId: string
) {
  try {
    // Отправляем webhook об успешной оплате
    await sendPaymentWebhook(orderId, 'success', txId);
    
    return { success: true, message: 'Платёж подтверждён' };
  } catch (error) {
    if (error instanceof PaymentWebhookError) {
      console.error(`[Payment Webhook Error] ${error.message}`);
      
      // Логируем в систему мониторинга (Sentry, etc)
      // captureException(error);
      
      return {
        success: false,
        message: error.message,
        statusCode: error.statusCode,
      };
    }

    throw error;
  }
}

export async function failPayment(
  orderId: number,
  txId: string,
  reason?: string
) {
  try {
    await sendPaymentWebhook(orderId, 'failed', txId);
    return { success: true, message: 'Статус платежа обновлён' };
  } catch (error) {
    console.error('Failed to send webhook:', error);
    throw error;
  }
}
```

## В API Route (app/api/payment/confirm/route.ts)

```typescript
import { sendPaymentWebhook, PaymentWebhookError } from '@/lib/payment-webhook';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { orderId, status, txId } = await request.json();

    // Валидация
    if (!orderId || !status || !txId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['success', 'failed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Отправляем webhook
    await sendPaymentWebhook(orderId, status, txId);

    return NextResponse.json(
      { success: true, message: 'Webhook sent' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof PaymentWebhookError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Переменные окружения

### .env.local (локальное развитие)

```bash
PAYMENT_WEBHOOK_SECRET=your-super-secret-key-local-dev
```

### Vercel Environment Variables

На панели Vercel установите переменную для production:
- **Name**: `PAYMENT_WEBHOOK_SECRET`
- **Value**: `<ваш-реальный-secret-из-системы-платежей>`
- **Environment**: Production, Preview, Development

### Получение Secret

Secret должен быть выдан системой платежей iq-home.kz. Убедитесь, что:
1. Это длинная, криптографически стойкая строка
2. Используется для валидации подписей на обе стороны
3. Хранится в переменных окружения, **никогда** в коде

## Тестирование

```typescript
import { sendPaymentWebhook } from '@/lib/payment-webhook';

// Тест успешного платежа
await sendPaymentWebhook(123, 'success', 'txn_abc123');

// Тест неудачного платежа
await sendPaymentWebhook(124, 'failed', 'txn_xyz789');
```

## Обработка ошибок

Функция выбросит `PaymentWebhookError` с полезной информацией:

```typescript
try {
  await sendPaymentWebhook(orderId, status, txId);
} catch (error) {
  if (error instanceof PaymentWebhookError) {
    console.log(error.message);      // Описание ошибки
    console.log(error.statusCode);   // HTTP статус (401, 400, 404, 500...)
    console.log(error.retryable);    // Был ли это retry attempt
  }
}
```

## Retry логика

- **500 ошибки**: автоматически повторяет до 3 раз с экспоненциальной задержкой (1s, 2s, 4s)
- **401, 400, 404**: не повторяет (клиентская ошибка)
- **Network ошибки**: повторяет с экспоненциальной задержкой

## Security

✅ HMAC-SHA256 подпись от RAW тела JSON
✅ Фиксированный порядок ключей (order_id, status, tx_id)
✅ Secret читается из переменных окружения
✅ Поддержка Vercel deployments
