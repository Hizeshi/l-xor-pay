/**
 * Пример использования Payment actions в React компоненте
 * 
 * Это файл для демонстрации - скопируйте нужные части в ваш компонент
 */

'use client';

import { useState } from 'react';
import {
  confirmPaymentAction,
  failPaymentAction,
  retryPaymentConfirmationAction,
} from '@/app/actions/payment';

export function PaymentStatusComponent({
  orderId,
  txId,
}: {
  orderId: number;
  txId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Обработчик для успешного платежа
  const handleConfirmPayment = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await confirmPaymentAction(orderId, txId);
      setResult(response);

      if (response.success) {
        // Перенаправить на страницу спасибо
        // router.push(`/payment/success?orderId=${orderId}`);
      }
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Неожиданная ошибка',
      });
    } finally {
      setLoading(false);
    }
  };

  // Обработчик для неудачного платежа
  const handleFailPayment = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await failPaymentAction(orderId, txId, 'User cancelled');
      setResult(response);
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Неожиданная ошибка',
      });
    } finally {
      setLoading(false);
    }
  };

  // Обработчик для повтора
  const handleRetry = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await retryPaymentConfirmationAction(orderId, txId);
      setResult({
        success: response.success,
        message: response.message,
      });
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Неожиданная ошибка',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Статус платежа</h2>

      <div className="mb-4 text-sm text-gray-600">
        <p>Order ID: {orderId}</p>
        <p>TX ID: {txId}</p>
      </div>

      {result && (
        <div
          className={`mb-4 p-4 rounded ${
            result.success
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {result.message}
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={handleConfirmPayment}
          disabled={loading}
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? 'Обработка...' : 'Подтвердить платёж'}
        </button>

        <button
          onClick={handleFailPayment}
          disabled={loading}
          className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
        >
          {loading ? 'Обработка...' : 'Отклонить платёж'}
        </button>

        <button
          onClick={handleRetry}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Обработка...' : 'Повторить'}
        </button>
      </div>
    </div>
  );
}
