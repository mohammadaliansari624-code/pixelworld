const DEFAULT_WHATSAPP_NUMBER = '+919503898739';
export const DEFAULT_BOOKING_MESSAGE = 'Hi Pixel Wrld! I would like to book a video editing project. Please share your services, pricing, and availability.';

export function whatsappUrl(number?: string, message = DEFAULT_BOOKING_MESSAGE) {
  const digits = (number || DEFAULT_WHATSAPP_NUMBER).replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
