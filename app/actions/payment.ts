'use server';

import { sendPaymentWebhook, PaymentWebhookError } from '@/lib/payment-webhook';

/**
 * Server Action для подтверждения платежа
 * 
 * Используется на фронтенде после успешного подтверждения платежа
 * от платёжного провайдера
 */
export async function confirmPaymentAction(
  orderId: number,
  txId: string
): Promise<{
  success: boolean;
  message: string;
  statusCode?: number;
}> {
  try {
    console.log(
      `[Payment] Confirming payment for order ${orderId}, tx=${txId}`
    );

    // Отправляем webhook об успешной оплате
    await sendPaymentWebhook(orderId, 'success', txId);

    console.log(
      `[Payment] ✓ Payment confirmed for order ${orderId}`
    );

    return {
      success: true,
      message: 'Платёж успешно подтверждён',
    };
  } catch (error) {
    if (error instanceof PaymentWebhookError) {
      console.error(
        `[Payment Error] orderId=${orderId}, txId=${txId}, message=${error.message}`
      );

      // Здесь можно интегрировать мониторинг (Sentry, DataDog, etc)
      // Sentry.captureException(error, {
      //   tags: { service: 'payment', action: 'confirm' },
      //   contexts: { payment: { orderId, txId } }
      // });

      return {
        success: false,
        message: error.message,
        statusCode: error.statusCode,
      };
    }

    // Неожиданная ошибка
    console.error(
      `[Payment Error] Unexpected error for order ${orderId}:`,
      error
    );

    throw error;
  }
}

/**
 * Server Action для отклонения платежа
 * 
 * Используется когда платёж был отклонён платёжной системой
 * или пользователь отменил платёж
 */
export async function failPaymentAction(
  orderId: number,
  txId: string,
  reason?: string
): Promise<{
  success: boolean;
  message: string;
  statusCode?: number;
}> {
  try {
    console.log(
      `[Payment] Failing payment for order ${orderId}, reason=${reason || 'unknown'}`
    );

    await sendPaymentWebhook(orderId, 'failed', txId);

    console.log(
      `[Payment] ✓ Payment marked as failed for order ${orderId}`
    );

    return {
      success: true,
      message: 'Статус платежа обновлён на "отклонено"',
    };
  } catch (error) {
    if (error instanceof PaymentWebhookError) {
      console.error(
        `[Payment Error] Failed to send failure webhook for order ${orderId}:`,
        error.message
      );

      return {
        success: false,
        message: error.message,
        statusCode: error.statusCode,
      };
    }

    throw error;
  }
}

/**
 * Server Action для retry подтверждения платежа
 * 
 * Если первая попытка не прошла по сетевым причинам,
 * можно повторить отправку webhook
 */
export async function retryPaymentConfirmationAction(
  orderId: number,
  txId: string
): Promise<{
  success: boolean;
  message: string;
  attempt: number;
}> {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[Payment] Retry attempt ${attempt}/${maxRetries} for order ${orderId}`
      );

      await sendPaymentWebhook(orderId, 'success', txId);

      console.log(
        `[Payment] ✓ Payment confirmed on attempt ${attempt}`
      );

      return {
        success: true,
        message: `Платёж подтверждён (попытка ${attempt})`,
        attempt,
      };
    } catch (error) {
      if (error instanceof PaymentWebhookError) {
        // Если это не повторяемая ошибка (401, 400, 404), не пытаемся заново
        if (!error.retryable) {
          console.error(
            `[Payment Error] Non-retryable error: ${error.message}`
          );

          return {
            success: false,
            message: error.message,
            attempt,
          };
        }

        // Если это последняя попытка, возвращаем ошибку
        if (attempt === maxRetries) {
          console.error(
            `[Payment Error] Failed after ${maxRetries} attempts`
          );

          return {
            success: false,
            message: `Не удалось подтвердить платёж после ${maxRetries} попыток`,
            attempt,
          };
        }

        // Ждём перед следующей попыткой
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(
          `[Payment] Waiting ${delay}ms before retry attempt ${attempt + 1}`
        );

        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  return {
    success: false,
    message: 'Не удалось подтвердить платёж',
    attempt: maxRetries,
  };
}
