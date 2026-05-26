# 🚀 Payment Webhook Integration - Инструкция по интеграции

## ✅ Что уже реализовано

Весь необходимый код готов к использованию:

1. ✅ **lib/payment-webhook.ts** - основная функция
2. ✅ **app/actions/payment.ts** - Server actions для Next.js
3. ✅ **app/api/payment/confirm/route.ts** - API Route endpoint
4. ✅ **app/components/PaymentStatusComponent.tsx** - React компонент для UI
5. ✅ Полное покрытие unit-тестами
6. ✅ Документация и примеры использования

## 🔧 Шаг 1: Установка SECRET

### Локально (development)

Создайте `.env.local`:

```bash
PAYMENT_WEBHOOK_SECRET=dev-secret-key-for-local-testing
```

### На Vercel (production)

1. Откройте проект на [Vercel Dashboard](https://vercel.com)
2. Settings → Environment Variables
3. Добавьте переменную:
   - **Name**: `PAYMENT_WEBHOOK_SECRET`
   - **Value**: `<actual-secret-from-payment-provider>`
   - **Environments**: Production, Preview, Development

## 📝 Шаг 2: Использование в приложении

### Вариант 1: Server Action (рекомендуется)

```typescript
import { confirmPaymentAction, failPaymentAction } from '@/app/actions/payment';

export default function PaymentPage() {
  const handleSuccess = async () => {
    const result = await confirmPaymentAction(123, 'txn_abc123');
    
    if (result.success) {
      console.log('Payment confirmed!');
      // redirect('/success');
    } else {
      console.error(result.message);
    }
  };

  return <button onClick={handleSuccess}>Confirm Payment</button>;
}
```

### Вариант 2: API Route

```typescript
// Клиентский запрос
const response = await fetch('/api/payment/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderId: 123,
    status: 'success',
    txId: 'txn_abc123',
  }),
});

const result = await response.json();
```

### Вариант 3: Прямое использование функции

```typescript
import { sendPaymentWebhook, PaymentWebhookError } from '@/lib/payment-webhook';

try {
  await sendPaymentWebhook(123, 'success', 'txn_abc123');
  console.log('Webhook sent successfully');
} catch (error) {
  if (error instanceof PaymentWebhookError) {
    console.error(`Error: ${error.message} (status: ${error.statusCode})`);
  }
}
```

## 🎨 Шаг 3: Интеграция UI компонента (опционально)

Используйте готовый React компонент:

```typescript
import { PaymentStatusComponent } from '@/app/components/PaymentStatusComponent';

export default function CheckoutPage() {
  return (
    <div>
      <h1>Checkout</h1>
      <PaymentStatusComponent
        orderId={123}
        txId="txn_abc123"
      />
    </div>
  );
}
```

## 🔄 Шаг 4: Интеграция с платёжным провайдером

После получения подтверждения платежа от провайдера:

```typescript
// На странице redirect/callback от провайдера
export async function PaymentCallback() {
  const searchParams = useSearchParams();
  const orderId = parseInt(searchParams.get('orderId') || '0');
  const txId = searchParams.get('txId') || '';
  const status = searchParams.get('status') || 'failed';

  useEffect(() => {
    if (orderId && txId) {
      confirmPaymentAction(orderId, txId);
    }
  }, [orderId, txId]);

  return <div>Processing payment...</div>;
}
```

## 🧪 Шаг 5: Тестирование

### Локальное тестирование

```bash
# Запустить unit-тесты
npm test lib/payment-webhook.test.ts

# Или с watch mode
npm test -- --watch
```

### Ручное тестирование

```typescript
// app/page.tsx - добавьте временно для тестирования
'use client';

import { sendPaymentWebhook } from '@/lib/payment-webhook';

export default function TestPage() {
  return (
    <button onClick={() => sendPaymentWebhook(999, 'success', 'test_txn_123')}>
      Test Webhook
    </button>
  );
}
```

### Используя curl

```bash
# Получить signature
SECRET="your-secret"
BODY='{"order_id":123,"status":"success","tx_id":"txn_abc123"}'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | cut -d' ' -f2)

# Отправить webhook
curl -X POST https://api.iq-home.kz/api/payment/webhook \
  -H "Content-Type: application/json" \
  -H "X-Payment-Signature: $SIGNATURE" \
  -d "$BODY"
```

## 📊 Шаг 6: Мониторинг (опционально)

### Интеграция с Sentry

```typescript
// app/actions/payment.ts - раскомментируйте строку
import * as Sentry from "@sentry/nextjs";

// В функции:
// Sentry.captureException(error, {
//   tags: { service: 'payment', action: 'confirm' },
//   contexts: { payment: { orderId, txId } }
// });
```

### Интеграция с DataDog

```typescript
// Добавьте в .env.local
DATADOG_API_KEY=your-key
DATADOG_SITE=datadoghq.com
```

## 🚀 Шаг 7: Deploy на Vercel

```bash
# Коммитьте изменения
git add .
git commit -m "Add payment webhook integration"

# Пушьте на main
git push origin main

# Vercel автоматически пересоберёт с переменными окружения
```

Проверьте на [Vercel Dashboard](https://vercel.com):
- Deployments → выберите последний
- Function logs → ищите `[Payment]` логи

## ✅ Checklist перед production

- [ ] `.env.local` содержит правильный SECRET
- [ ] Vercel имеет переменную окружения `PAYMENT_WEBHOOK_SECRET`
- [ ] Unit-тесты проходят: `npm test`
- [ ] Ручное тестирование успешно
- [ ] Порядок ключей JSON правильный: `order_id, status, tx_id`
- [ ] HMAC-SHA256 подпись вычисляется от RAW тела
- [ ] Retry-логика работает при 500 ошибках
- [ ] Логирование интегрировано (console.log, Sentry, etc)
- [ ] Обработка ошибок корректна (401, 400, 404 не повторяются)
- [ ] Тестирование с бэкендом iq-home.kz пройдено

## 📞 Troubleshooting

### Ошибка: "PAYMENT_WEBHOOK_SECRET не установлена"

**Решение:**
- Создайте `.env.local` в корне проекта с переменной `PAYMENT_WEBHOOK_SECRET`
- Перезагрузите dev сервер: `npm run dev`

### Ошибка 401: "неверная подпись"

**Причины:**
- SECRET не совпадает с тем, что на бэкенде
- Порядок ключей в JSON не соответствует контракту
- Подпись считается не от RAW тела

**Решение:**
- Проверьте `process.env.PAYMENT_WEBHOOK_SECRET`
- Убедитесь в порядке ключей: `order_id, status, tx_id`
- Используйте `JSON.stringify()` для формирования тела

### Функция не повторяется при ошибке

**Причина:**
- Это может быть 401/400/404 (не повторяемые ошибки)
- Или это network error (повторяется автоматически)

**Решение:**
- Используйте `retryPaymentConfirmationAction()` для ручного повтора
- Проверьте логи: `console.log()` и `console.error()`

### Переменная окружения не видна на Vercel

**Решение:**
- Пересоберите проект: нажмите "Redeploy" на Vercel Dashboard
- Проверьте, что переменная добавлена в нужной среде (Production/Preview)

## 📚 Дополнительные ссылки

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-mutation/server-actions)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Node.js crypto HMAC](https://nodejs.org/api/crypto.html#crypto_class_hmac)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)

## 💡 Советы

1. **Идемпотентность**: бэкенд должен обрабатывать одинаковые webhook идемпотентно (200 если уже обработано)
2. **Retry-логика**: используйте экспоненциальную задержку (1s, 2s, 4s) перед повторами
3. **Логирование**: логируйте все попытки отправки для дебага
4. **Мониторинг**: используйте Sentry или аналог для отслеживания ошибок
5. **Тестирование**: тестируйте с реальным SECRET перед production

## ❓ Вопросы?

Обратитесь к:
- [PAYMENT_WEBHOOK_README.md](./PAYMENT_WEBHOOK_README.md) - полная документация
- [lib/PAYMENT_WEBHOOK_USAGE.md](./lib/PAYMENT_WEBHOOK_USAGE.md) - примеры кода
- [Payment webhook function](./lib/payment-webhook.ts) - исходный код с комментариями
