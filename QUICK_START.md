# ⚡ Quick Start - Payment Webhook

## За 3 минуты до первого webhook'а

### 1️⃣ Установка SECRET (30 сек)

Создайте файл `.env.local` в корне проекта:

```bash
PAYMENT_WEBHOOK_SECRET=your-secret-here
```

### 2️⃣ Использование в коде (1 мин)

**Вариант A: Server Action** ✨ (рекомендуется)

```typescript
'use client';

import { confirmPaymentAction } from '@/app/actions/payment';

export default function CheckoutPage() {
  const handlePay = async () => {
    const result = await confirmPaymentAction(123, 'txn_abc123');
    
    if (result.success) {
      alert('Платёж подтверждён!');
    } else {
      alert(`Ошибка: ${result.message}`);
    }
  };

  return <button onClick={handlePay}>Оплатить</button>;
}
```

**Вариант B: Прямое использование функции**

```typescript
import { sendPaymentWebhook } from '@/lib/payment-webhook';

try {
  await sendPaymentWebhook(123, 'success', 'txn_abc123');
  console.log('✓ Webhook отправлен!');
} catch (error) {
  console.error('✗ Ошибка:', error);
}
```

**Вариант C: API Route**

```bash
curl -X POST http://localhost:3000/api/payment/confirm \
  -H "Content-Type: application/json" \
  -d '{"orderId":123,"status":"success","txId":"txn_abc123"}'
```

### 3️⃣ Тестирование (1 мин)

```bash
# Запустить unit-тесты
npm test lib/payment-webhook.test.ts

# Или в режиме watch
npm test -- --watch
```

## 🎯 Основные моменты

✅ **Подпись HMAC-SHA256** - автоматически вычисляется  
✅ **Порядок ключей** - фиксированный (order_id, status, tx_id)  
✅ **Retry логика** - при 500 повторяет до 3 раз  
✅ **Переменные окружения** - SECRET из .env.local  
✅ **TypeScript** - полная типизация  

## 📝 Примеры использования

### Подтвердить платёж

```typescript
await sendPaymentWebhook(
  123,          // Order ID
  'success',    // Status
  'txn_abc123'  // Transaction ID
);
```

### Отклонить платёж

```typescript
await failPaymentAction(
  123,
  'txn_abc123',
  'Payment declined by bank'
);
```

### Повторить отправку

```typescript
const result = await retryPaymentConfirmationAction(123, 'txn_abc123');
console.log(`Попытка ${result.attempt}: ${result.message}`);
```

### Обработка ошибок

```typescript
try {
  await sendPaymentWebhook(123, 'success', 'txn_abc123');
} catch (error) {
  if (error instanceof PaymentWebhookError) {
    console.log(error.message);       // "Заказ не найден (404)"
    console.log(error.statusCode);    // 404
    console.log(error.retryable);     // false
  }
}
```

## 🚀 Deployment на Vercel

```bash
# 1. Добавить SECRET на Vercel:
# Settings → Environment Variables
# Name: PAYMENT_WEBHOOK_SECRET
# Value: <actual-secret>

# 2. Commit & Push
git push origin main

# 3. Готово! Vercel автоматически пересоберёт
```

## 🔗 Важные файлы

| Файл | Назначение |
|------|-----------|
| [lib/payment-webhook.ts](lib/payment-webhook.ts) | Основная функция |
| [app/actions/payment.ts](app/actions/payment.ts) | Server actions |
| [app/api/payment/confirm/route.ts](app/api/payment/confirm/route.ts) | API endpoint |
| [app/components/PaymentStatusComponent.tsx](app/components/PaymentStatusComponent.tsx) | React компонент |
| [PAYMENT_WEBHOOK_README.md](PAYMENT_WEBHOOK_README.md) | Полная документация |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | Пошаговая интеграция |

## ❓ Часто задаваемые вопросы

**Q: Где взять SECRET?**  
A: От платёжной системы iq-home.kz

**Q: Можно ли хардкодить SECRET в коде?**  
A: **НЕЛЬЗЯ** - только в переменных окружения

**Q: Что делать если функция не повторяется?**  
A: Используйте `retryPaymentConfirmationAction()` для ручного повтора

**Q: Как тестировать на Vercel?**  
A: Логи доступны в панели Vercel → Deployments → Function logs

## 💡 Если что-то не работает

1. Проверьте `.env.local` содержит `PAYMENT_WEBHOOK_SECRET`
2. Перезагрузите dev сервер: `npm run dev`
3. Посмотрите консоль браузера на ошибки
4. Проверьте консоль сервера: `npm run dev` output
5. Прочитайте [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) раздел "Troubleshooting"

---

**Готово!** 🎉 Webhook работает. Отправьте вашу первую платёж на iq-home.kz
