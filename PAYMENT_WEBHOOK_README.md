# Payment Webhook Integration Guide

Полная реализация отправки payment webhook на бэкенд с HMAC-SHA256 подписью для Next.js 14.

## 📋 Структура файлов

```
project/
├── lib/
│   ├── payment-webhook.ts                 # Основная функция для отправки webhook
│   ├── payment-webhook.test.ts            # Unit тесты
│   └── PAYMENT_WEBHOOK_USAGE.md           # Примеры использования
├── app/
│   ├── actions/
│   │   └── payment.ts                     # Server actions для работы с платежами
│   └── components/
│       └── PaymentStatusComponent.tsx     # React компонент для UI
├── .env.local.example                      # Пример конфигурации переменных окружения
└── README.md                               # Этот файл
```

## 🚀 Быстрый старт

### 1. Установка переменных окружения

Создайте файл `.env.local` в корне проекта:

```bash
cp .env.local.example .env.local
```

Отредактируйте `.env.local` и установите SECRET, полученный от системы платежей:

```bash
PAYMENT_WEBHOOK_SECRET=your-actual-secret-from-payment-provider
```

### 2. Базовое использование

В Server Action или API Route:

```typescript
import { sendPaymentWebhook } from '@/lib/payment-webhook';

// Отправить webhook об успешном платеже
await sendPaymentWebhook(
  orderId,      // number - ID заказа
  'success',    // 'success' | 'failed'
  txId          // string - ID транзакции
);
```

### 3. Обработка ошибок

```typescript
import { sendPaymentWebhook, PaymentWebhookError } from '@/lib/payment-webhook';

try {
  await sendPaymentWebhook(orderId, 'success', txId);
} catch (error) {
  if (error instanceof PaymentWebhookError) {
    console.error(error.message);
    console.error(error.statusCode);  // 401, 400, 404, 500...
    console.error(error.retryable);   // true/false
  }
}
```

## 🔒 Security Features

✅ **HMAC-SHA256 подпись** - криптографически стойкая подпись тела
✅ **Фиксированный порядок ключей** - JSON всегда в порядке: `order_id, status, tx_id`
✅ **RAW body signing** - подпись от строки тела, не от объекта
✅ **Environment variables** - SECRET из переменных окружения, не в коде
✅ **Retryable errors** - автоматические повторы при 500 ошибках

## 🔄 Retry Logic

Функция автоматически повторяет отправку при:

- **500 Internal Server Error**: повторяет до 3 раз с экспоненциальной задержкой (1s, 2s, 4s)
- **Network errors**: повторяет с экспоненциальной задержкой

**Не повторяет при:**

- **401 Unauthorized** - неверная подпись
- **400 Bad Request** - неверный формат
- **404 Not Found** - заказ не найден

## 📝 HTTP Contract

### Запрос

```
POST https://api.iq-home.kz/api/payment/webhook
Content-Type: application/json
X-Payment-Signature: <hex-encoded HMAC-SHA256>

{
  "order_id": 123,
  "status": "success",
  "tx_id": "txn_abc123"
}
```

### Ответы

| Status | Описание | Action |
|--------|---------|--------|
| 200 | OK - успешно обработано или уже было обработано ранее (идемпотентно) | ✓ Завершить |
| 401 | Неверная или отсутствующая подпись | ✗ Ошибка, не повторять |
| 400 | Неверный статус или формат тела | ✗ Ошибка, не повторять |
| 404 | Заказ не найден | ✗ Ошибка, не повторять |
| 500 | Внутренняя ошибка | 🔄 Повторить (до 3 раз) |

## 🧪 Тестирование

### Unit тесты

```bash
npm test lib/payment-webhook.test.ts
```

### Ручное тестирование

```typescript
import { sendPaymentWebhook } from '@/lib/payment-webhook';

// Тест успешного платежа
await sendPaymentWebhook(123, 'success', 'txn_abc123');

// Тест неудачного платежа
await sendPaymentWebhook(124, 'failed', 'txn_xyz789');
```

## 🌍 Deployment на Vercel

### 1. Добавить переменную окружения

На панели Vercel:

1. Перейти в **Settings → Environment Variables**
2. Добавить новую переменную:
   - **Name**: `PAYMENT_WEBHOOK_SECRET`
   - **Value**: `<secret-от-платежной-системы>`
   - **Environments**: Production, Preview, Development

### 2. Redeploy

```bash
git push origin main
```

Vercel автоматически пересоберёт проект с новыми переменными.

## 📚 API Reference

### sendPaymentWebhook()

```typescript
async function sendPaymentWebhook(
  orderId: number,
  status: 'success' | 'failed',
  txId: string
): Promise<void>
```

**Параметры:**
- `orderId` - ID заказа (number)
- `status` - статус платежа ('success' или 'failed')
- `txId` - уникальный ID транзакции (string)

**Выбрасывает:**
- `PaymentWebhookError` - при ошибке отправки

### PaymentWebhookError

```typescript
class PaymentWebhookError extends Error {
  statusCode?: number;      // HTTP статус ответа
  retryable?: boolean;      // Был ли это retry attempt
}
```

## 🔧 Server Actions

### confirmPaymentAction()

```typescript
async function confirmPaymentAction(
  orderId: number,
  txId: string
): Promise<{ success: boolean; message: string; statusCode?: number }>
```

### failPaymentAction()

```typescript
async function failPaymentAction(
  orderId: number,
  txId: string,
  reason?: string
): Promise<{ success: boolean; message: string; statusCode?: number }>
```

### retryPaymentConfirmationAction()

```typescript
async function retryPaymentConfirmationAction(
  orderId: number,
  txId: string
): Promise<{ success: boolean; message: string; attempt: number }>
```

## 📱 React Component

Используйте готовый компонент для UI:

```typescript
import { PaymentStatusComponent } from '@/app/components/PaymentStatusComponent';

export default function CheckoutPage() {
  return (
    <PaymentStatusComponent
      orderId={123}
      txId="txn_abc123"
    />
  );
}
```

## 🐛 Debug & Logging

Функция использует `console.log()` и `console.error()` для логирования:

```typescript
// В консоли вы увидите:
// [Payment] Confirming payment for order 123, tx=txn_abc123
// [Payment] ✓ Payment confirmed for order 123
// [Payment Error] orderId=123, txId=txn_abc123, message=...
```

## 🔐 Security Checklist

- [ ] SECRET установлена в переменных окружения (не в коде)
- [ ] SECRET совпадает на обе стороны (фронтенд/бэкенд)
- [ ] HTTPS используется для всех запросов
- [ ] Validation порядка ключей в JSON (`order_id, status, tx_id`)
- [ ] Тесты покрывают HMAC подпись
- [ ] Логирование ошибок интегрировано (Sentry, DataDog, etc)

## ❓ FAQ

**Q: Что делать если забыл SECRET?**
A: Свяжитесь с системой платежей iq-home.kz, они выдадут новый SECRET.

**Q: Можно ли хардкодить SECRET?**
A: **НЕТ** - это критическая уязвимость безопасности.

**Q: Что если функция не повторяется при 500?**
A: Используйте `retryPaymentConfirmationAction()` для ручного повтора.

**Q: Как интегрировать Sentry?**
A: Раскомментируйте строку `Sentry.captureException()` в `app/actions/payment.ts`.

## 📞 Support

Если у вас есть вопросы, свяжитесь с разработчиком или iq-home.kz.
