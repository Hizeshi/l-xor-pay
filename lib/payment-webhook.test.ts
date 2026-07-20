import crypto from 'crypto';
import {
  sendPaymentWebhook,
  PaymentWebhookError,
  type PaymentStatus,
} from './payment-webhook';

/**
 * Unit тесты для payment webhook функции
 * 
 * Запуск: npm test lib/payment-webhook.test.ts
 * 
 * Для более полного тестирования используйте MSW (Mock Service Worker)
 * или jest mock для fetch запросов.
 */

describe('Payment Webhook', () => {
  const originalEnv = process.env.PAYMENT_WEBHOOK_SECRET;
  const testSecret = 'test-secret-key-12345';

  beforeEach(() => {
    process.env.PAYMENT_WEBHOOK_SECRET = testSecret;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.PAYMENT_WEBHOOK_SECRET = originalEnv;
  });

  describe('sendPaymentWebhook', () => {
    it('должна бросить ошибку если PAYMENT_WEBHOOK_SECRET не установлена', async () => {
      delete process.env.PAYMENT_WEBHOOK_SECRET;

      await expect(
        sendPaymentWebhook(123, 'success', 'txn_abc')
      ).rejects.toThrow(PaymentWebhookError);

      await expect(
        sendPaymentWebhook(123, 'success', 'txn_abc')
      ).rejects.toThrow('PAYMENT_WEBHOOK_SECRET не установлена');
    });

    it('должна формировать JSON с фиксированным порядком ключей', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce({
        ok: true,
      } as Response);

      global.fetch = fetchMock;

      await sendPaymentWebhook(123, 'success', 'txn_abc123');

      expect(fetchMock).toHaveBeenCalledTimes(1);

      const call = fetchMock.mock.calls[0];
      const body = call[1]!.body as string;

      // Проверяем порядок ключей в JSON
      const parsed = JSON.parse(body);
      const keys = Object.keys(parsed);

      expect(keys).toEqual(['orderId', 'status', 'tx_id']);
      expect(parsed.orderId).toBe(123);
      expect(parsed.status).toBe('success');
      expect(parsed.tx_id).toBe('txn_abc123');
    });

    it('должна вычислять правильную HMAC-SHA256 подпись', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce({
        ok: true,
      } as Response);

      global.fetch = fetchMock;

      const orderId = 123;
      const status: PaymentStatus = 'success';
      const txId = 'txn_abc123';

      await sendPaymentWebhook(orderId, status, txId);

      const body = fetchMock.mock.calls[0][1]!.body as string;
      const expectedSignature = crypto
        .createHmac('sha256', testSecret)
        .update(body)
        .digest('hex');

      const headers = fetchMock.mock.calls[0][1]!.headers as Record<
        string,
        string
      >;
      expect(headers['X-Payment-Signature']).toBe(expectedSignature);
    });

    it('должна отправлять POST запрос на правильный URL', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce({
        ok: true,
      } as Response);

      global.fetch = fetchMock;

      await sendPaymentWebhook(123, 'success', 'txn_abc');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://chat.iq-home.kz/api/payment/webhook',
        expect.any(Object)
      );

      const options = fetchMock.mock.calls[0][1];
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
    });

    it('должна вернуть успех при 200 OK', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      global.fetch = fetchMock;

      await expect(
        sendPaymentWebhook(123, 'success', 'txn_abc')
      ).resolves.toBeUndefined();
    });

    it('должна бросить ошибку 401 без повтора', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      } as unknown as Response);

      global.fetch = fetchMock;

      await expect(
        sendPaymentWebhook(123, 'success', 'txn_abc')
      ).rejects.toThrow(PaymentWebhookError);

      // Должна быть только одна попытка
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('должна бросить ошибку 400 без повтора', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Invalid format'),
      } as unknown as Response);

      global.fetch = fetchMock;

      await expect(
        sendPaymentWebhook(123, 'invalid-status', 'txn_abc')
      ).rejects.toThrow(PaymentWebhookError);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('должна бросить ошибку 404 без повтора', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Order not found'),
      } as unknown as Response);

      global.fetch = fetchMock;

      await expect(
        sendPaymentWebhook(999, 'success', 'txn_abc')
      ).rejects.toThrow('Заказ не найден (404)');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('должна корректно обрабатывать 409 Conflict без повтора', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 409,
      } as unknown as Response);

      global.fetch = fetchMock;

      await expect(
        sendPaymentWebhook(123, 'success', 'txn_abc')
      ).resolves.toBeUndefined();

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('должна повторить при 500 ошибке до 3 раз', async () => {
      jest.useFakeTimers();

      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Server error'),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Server error'),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response);

      global.fetch = fetchMock;

      const promise = sendPaymentWebhook(123, 'success', 'txn_abc');

      // Первая попытка сразу
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Вторая попытка через 1s
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      expect(fetchMock).toHaveBeenCalledTimes(2);

      // Третья попытка через 2s
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      expect(fetchMock).toHaveBeenCalledTimes(3);

      // Завершение
      jest.runAllTimers();
      await promise;

      expect(fetchMock).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });

    it('должна бросить ошибку после 3 попыток при 500', async () => {
      jest.useFakeTimers();

      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server error'),
      } as unknown as Response);

      global.fetch = fetchMock;

      const promise = sendPaymentWebhook(123, 'success', 'txn_abc');

      jest.runAllTimers();

      await expect(promise).rejects.toThrow(PaymentWebhookError);
      expect(fetchMock).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });

    // PAY-002: amount/currency are optional additions -- omitting amount
    // (existing 3-arg callers) must keep producing the exact old body shape.
    it('без amount формирует тело без amount/currency (обратная совместимость)', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce({
        ok: true,
      } as Response);

      global.fetch = fetchMock;

      await sendPaymentWebhook(123, 'success', 'txn_abc123');

      const body = fetchMock.mock.calls[0][1]!.body as string;
      const parsed = JSON.parse(body);

      expect(Object.keys(parsed)).toEqual(['orderId', 'status', 'tx_id']);
      expect(parsed.amount).toBeUndefined();
      expect(parsed.currency).toBeUndefined();
    });

    it('с amount добавляет amount и жёсткую currency=KZT в тело и подпись', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce({
        ok: true,
      } as Response);

      global.fetch = fetchMock;

      await sendPaymentWebhook(123, 'success', 'txn_abc123', 45000);

      const body = fetchMock.mock.calls[0][1]!.body as string;
      const parsed = JSON.parse(body);

      expect(Object.keys(parsed)).toEqual([
        'orderId',
        'status',
        'tx_id',
        'amount',
        'currency',
      ]);
      expect(parsed.amount).toBe(45000);
      expect(parsed.currency).toBe('KZT');

      // Signature must cover the new fields too -- it's computed over the
      // exact body string, so this also proves amount/currency are inside
      // what gets signed, not appended after.
      const expectedSignature = crypto
        .createHmac('sha256', testSecret)
        .update(body)
        .digest('hex');
      const headers = fetchMock.mock.calls[0][1]!.headers as Record<
        string,
        string
      >;
      expect(headers['X-Payment-Signature']).toBe(expectedSignature);
    });

    it('explicit amount=0 всё равно добавляет amount/currency (0 отличается от "не передано")', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce({
        ok: true,
      } as Response);

      global.fetch = fetchMock;

      await sendPaymentWebhook(123, 'success', 'txn_abc123', 0);

      const body = fetchMock.mock.calls[0][1]!.body as string;
      const parsed = JSON.parse(body);

      expect(parsed.amount).toBe(0);
      expect(parsed.currency).toBe('KZT');
    });

    it('должна поддерживать оба статуса платежа', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
      } as Response);

      global.fetch = fetchMock;

      // Успех
      await sendPaymentWebhook(123, 'success', 'txn_1');
      let body = fetchMock.mock.calls[0][1]!.body as string;
      expect(JSON.parse(body).status).toBe('success');

      // Неудача
      await sendPaymentWebhook(124, 'failed', 'txn_2');
      body = fetchMock.mock.calls[1][1]!.body as string;
      expect(JSON.parse(body).status).toBe('failed');
    });
  });
});
