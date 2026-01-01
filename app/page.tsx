'use client';

import { useState, useEffect, Suspense } from 'react';
import { CreditCard, Lock, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function PaymentForm() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  // Если returnUrl не передан, используем дефолтный (поменяй на свой домен магазина)
  const returnUrl = searchParams.get('returnUrl') || 'https://iq-home.kz/user/orders';

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // URL твоего вебхука в n8n (Payment Processor)
  const N8N_WEBHOOK_URL = 'https://iq-home.kz/webhook/payment/process';

    // URL твоего магазина (куда возвращать)
  const STORE_URL = 'https://iq-home.kz';

  // --- Состояния полей ---
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);

  // --- Валидаторы и Форматтеры ---

  const handleCardNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Оставляем только цифры
    let val = e.target.value.replace(/\D/g, '');
    // Обрезаем до 16 цифр
    val = val.slice(0, 16);
    // Добавляем пробелы каждые 4 цифры
    val = val.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(val);
  };

  const handleExpiry = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    // Обрезаем до 4 цифр (MMYY)
    val = val.slice(0, 4);
    
    // Если ввели больше 2 цифр, ставим слеш
    if (val.length >= 2) {
      const month = parseInt(val.slice(0, 2));
      // Простая проверка месяца (не больше 12)
      if (month > 12) val = '12' + val.slice(2);
      if (month === 0) val = '01' + val.slice(2);
      
      val = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setExpiry(val);
  };

  const handleCvv = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Только цифры, макс 3
    const val = e.target.value.replace(/\D/g, '').slice(0, 3);
    setCvv(val);
  };

  const handleName = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Только латинские буквы и пробелы, авто-капс
    const val = e.target.value.replace(/[^a-zA-Z\s]/g, '').toUpperCase();
    setName(val);
  };

  // Проверка валидности всей формы
  const isValid = 
    cardNumber.length === 19 && // 16 цифр + 3 пробела
    expiry.length === 5 &&      // MM/YY
    cvv.length === 3 &&
    name.length > 2 &&
    agreed;

  // --- Отправка ---

    const handlePayment = async (paymentStatus: 'success' | 'failed') => {
    if (!orderId) return;
    setLoading(true);

    try {
      // 1. Отправляем данные в n8n (чтобы обновить базу)
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: Number(orderId),
          status: paymentStatus
        })
      });

      if (!response.ok) throw new Error('Ошибка сервера');

      // 2. Логика редиректа
      if (paymentStatus === 'success') {
        setStatus('success');
        // Показываем галочку 2 секунды и редиректим в ЗАКАЗЫ
        setTimeout(() => {
           window.location.href = `${STORE_URL}/profile`; // Или /orders, если есть такая страница
        }, 2000);
      } else {
        // Если ошибка — сразу возвращаем в КОРЗИНУ
        alert('Оплата не прошла. Возвращаем вас в корзину.');
        window.location.href = `${STORE_URL}/cart`;
      }
      
    } catch (e) {
      console.error(e);
      alert('Не удалось связаться с магазином. Проверьте интернет.');
      setLoading(false);
    }
  };

  // --- Рендер Ошибки / Успеха ---

  if (!orderId) return (
    <div className="flex h-screen items-center justify-center bg-gray-100 text-red-500 font-bold gap-2">
       <AlertCircle /> Ошибка: Неверная ссылка заказа
    </div>
  );

  if (status === 'success') {
    return (
      <div className="flex h-screen items-center justify-center bg-green-50 font-sans">
        <div className="text-center animate-bounce">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
          <h1 className="text-2xl font-bold text-green-700">Оплата прошла успешно!</h1>
          <p className="text-gray-500 mt-2">Возвращаем вас в магазин...</p>
        </div>
      </div>
    );
  }

  // --- Основная форма ---

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans text-gray-800">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative">
        
        {/* Шапка */}
        <div className="bg-[#1e293b] p-6 text-white text-center">
          <div className="flex justify-center items-center gap-2 mb-2 opacity-80">
            <Lock size={16} /> 
            <span className="text-xs uppercase tracking-widest font-semibold">Безопасная оплата</span>
          </div>
          <h1 className="text-3xl font-bold">{amount ? `${amount} ₸` : 'Сумма не указана'}</h1>
          <p className="text-sm opacity-70 mt-1">Заказ #{orderId}</p>
        </div>

        {/* Форма */}
        <div className="p-8 space-y-5">
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Номер карты</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-3 text-gray-400" size={20}/>
              <input 
                type="text" 
                value={cardNumber}
                onChange={handleCardNumber}
                placeholder="0000 0000 0000 0000" 
                className="w-full pl-10 p-3 border border-gray-200 rounded-lg bg-gray-50 font-mono text-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" 
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-1/2 space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Срок</label>
              <input 
                type="text" 
                value={expiry}
                onChange={handleExpiry}
                placeholder="MM/YY" 
                className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 font-mono text-center focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" 
              />
            </div>
            <div className="w-1/2 space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">CVV</label>
              <input 
                type="password" 
                value={cvv}
                onChange={handleCvv}
                placeholder="•••" 
                className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 font-mono text-center focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Владелец</label>
            <input 
                type="text" 
                value={name}
                onChange={handleName}
                placeholder="IVAN IVANOV" 
                className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 uppercase focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" 
            />
          </div>

          {/* Чекбокс */}
          <div className="flex items-start gap-3 py-2">
            <input 
                type="checkbox" 
                id="terms" 
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 cursor-pointer accent-blue-600"
            />
            <label htmlFor="terms" className="text-xs text-gray-500 cursor-pointer select-none leading-tight">
                Я соглашаюсь с условиями проведения платежей и обработкой персональных данных.
            </label>
          </div>

          {/* Кнопки действий */}
          <div className="pt-2 space-y-3">
            <button 
              onClick={() => handlePayment('success')}
              disabled={!isValid || loading}
              className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2
                ${isValid && !loading 
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-200 active:scale-95 cursor-pointer' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'}
              `}
            >
              {loading ? <Loader className="animate-spin"/> : 'Оплатить'}
            </button>
            
            <button 
              onClick={() => handlePayment('failed')}
              disabled={loading}
              className="w-full text-red-400 text-xs font-medium hover:text-red-600 hover:underline transition"
            >
              Эмулировать ошибку (Недостаточно средств)
            </button>
          </div>
        </div>

        <div className="bg-gray-50 p-4 text-center text-[10px] text-gray-400 uppercase tracking-wider border-t border-gray-100">
            Secure Payment Gateway • L-Xor Shop
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentForm />
    </Suspense>
  );
}