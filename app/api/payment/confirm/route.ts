import { sendPaymentWebhook, PaymentWebhookError, type PaymentStatus } from '@/lib/payment-webhook';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/payment/confirm
 * 
 * API Route для подтверждения платежа
 * 
 * Body:
 * {
 *   "orderId": 123,
 *   "status": "success" | "failed",
 *   "txId": "txn_abc123"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Валидация полей
    const { orderId, status, txId } = body;

    if (!orderId || typeof orderId !== 'number') {
      return NextResponse.json(
        {
          error: 'Invalid orderId',
          details: 'orderId must be a number',
        },
        { status: 400 }
      );
    }

    if (!status || !['success', 'failed'].includes(status)) {
      return NextResponse.json(
        {
          error: 'Invalid status',
          details: 'status must be "success" or "failed"',
        },
        { status: 400 }
      );
    }

    if (!txId || typeof txId !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid txId',
          details: 'txId must be a non-empty string',
        },
        { status: 400 }
      );
    }

    console.log(
      `[API] Confirming payment: orderId=${orderId}, status=${status}, txId=${txId}`
    );

    // Отправляем webhook на бэкенд
    await sendPaymentWebhook(orderId, status as PaymentStatus, txId);

    console.log(
      `[API] ✓ Payment confirmed: orderId=${orderId}`
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Payment confirmation sent successfully',
        data: {
          orderId,
          status,
          txId,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof PaymentWebhookError) {
      console.error(
        `[API] PaymentWebhookError: ${error.message}`,
        {
          statusCode: error.statusCode,
          retryable: error.retryable,
        }
      );

      const responseStatus = error.statusCode || 500;

      return NextResponse.json(
        {
          error: 'Payment confirmation failed',
          message: error.message,
          statusCode: error.statusCode,
          retryable: error.retryable,
        },
        { status: responseStatus }
      );
    }

    // JSON parsing error
    if (error instanceof SyntaxError) {
      console.error('[API] Invalid JSON body:', error.message);

      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: 'Expected valid JSON',
        },
        { status: 400 }
      );
    }

    // Неожиданная ошибка
    console.error('[API] Unexpected error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/payment/confirm
 * 
 * Для CORS предполта (если нужно)
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200 });
}
