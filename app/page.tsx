'use client';

import { useState, useEffect, Suspense } from 'react';
import { CreditCard, Lock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

// Компонент с логикой (обернут в Suspense для Next.js)
function PaymentForm() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  const returnUrl = searchParams.get('returnUrl') || 'http://localhost:3000/orders'; // Куда вернуть юзера после оплаты

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // URL твоего вебхука в n8n (Payment Processor)
  const N8N_WEBHOOK_URL = 'https://iq-home.kz/webhook/payment/process';

  const handlePayment = async (paymentStatus: 'success' | 'failed') => {
    setLoading(true);

    try {
      // 1. Отправляем результат в n8n
      // Используем mode: 'no-cors' если n8n ругается, но лучше настроить CORS в n8n
      await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: Number(orderId),
          status: paymentStatus
        })
      });

      if (paymentStatus === 'success') {
        setStatus('success');
        setTimeout(() => {
           window.location.href = returnUrl; // Возвращаем в магазин
        }, 2000);
      } else {
        setStatus('error');
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка соединения с банком');
      setLoading(false);
    }
  };

  if (!orderId) return <div className="flex h-screen items-center justify-center">Ошибка: Неверная ссылка</div>;

  if (status === 'success') {
    return (
      <div className="flex h-screen items-center justify-center bg-green-50">
        <div className="text-center animate-bounce">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
          <h1 className="text-2xl font-bold text-green-700">Оплата прошла успешно!</h1>
          <p className="text-gray-500">Возвращаем вас в магазин...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        
        {/* Шапка */}
        <div className="bg-[#1e293b] p-6 text-white text-center relative">
          <div className="flex justify-center items-center gap-2 mb-2 opacity-80">
            <Lock size={16} /> 
            <span className="text-xs uppercase tracking-widest">Безопасная оплата</span>
          </div>
          <h1 className="text-3xl font-bold">{amount} ₸</h1>
          <p className="text-sm opacity-70 mt-1">Заказ #{orderId}</p>
        </div>

        {/* Форма */}
        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Номер карты</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-3 text-gray-400" size={20}/>
              <input type="text" placeholder="0000 0000 0000 0000" className="w-full pl-10 p-3 border rounded-lg bg-gray-50 font-mono text-lg focus:outline-none focus:ring-2 ring-blue-500" />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-1/2 space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Срок</label>
              <input type="text" placeholder="MM/YY" className="w-full p-3 border rounded-lg bg-gray-50 font-mono text-center focus:outline-none focus:ring-2 ring-blue-500" />
            </div>
            <div className="w-1/2 space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">CVV</label>
              <input type="password" placeholder="123" className="w-full p-3 border rounded-lg bg-gray-50 font-mono text-center focus:outline-none focus:ring-2 ring-blue-500" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Владелец</label>
            <input type="text" placeholder="IVAN IVANOV" className="w-full p-3 border rounded-lg bg-gray-50 uppercase focus:outline-none focus:ring-2 ring-blue-500" />
          </div>

          {/* Кнопки действий */}
          <div className="pt-4 space-y-3">
            <button 
              onClick={() => handlePayment('success')}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 transition active:scale-95 disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {loading ? <Loader className="animate-spin"/> : 'Оплатить'}
            </button>
            
            <button 
              onClick={() => handlePayment('failed')}
              disabled={loading}
              className="w-full text-red-500 text-sm font-medium hover:underline"
            >
              Эмулировать ошибку (Недостаточно средств)
            </button>
          </div>
        </div>

        <div className="bg-gray-50 p-4 text-center text-xs text-gray-400">
            Freedom Pay Emulation • L-Xor Shop
        </div>
      </div>
    </div>
  );
}

// Обертка для корректной работы useSearchParams в Next.js
export default function Page() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <PaymentForm />
    </Suspense>
  );
}