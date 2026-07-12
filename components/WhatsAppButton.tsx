'use client';

const WHATSAPP_NUMBER = '919818086846'; // confirm/replace with the real support number
const DEFAULT_MESSAGE = "Hi! I have a question about Cvly.";

export function WhatsAppButton() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-[#25D366] shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M17.5 6.5A7.9 7.9 0 0 0 12 4.2a7.95 7.95 0 0 0-6.9 11.9L4 20l4-1.05A7.95 7.95 0 0 0 12 20a7.95 7.95 0 0 0 5.5-13.5zM12 18.4a6.4 6.4 0 0 1-3.3-.9l-.24-.14-2.4.63.64-2.34-.16-.24A6.45 6.45 0 1 1 18.45 12 6.4 6.4 0 0 1 12 18.4zm3.5-4.8c-.2-.1-1.15-.57-1.33-.63-.18-.07-.3-.1-.44.1s-.52.63-.64.76-.24.15-.44.05a5.3 5.3 0 0 1-1.57-.97 5.9 5.9 0 0 1-1.08-1.35c-.11-.2 0-.3.09-.4s.2-.24.3-.36a1.4 1.4 0 0 0 .2-.33.37.37 0 0 0 0-.35c-.05-.1-.44-1.06-.6-1.45-.16-.38-.32-.33-.44-.34h-.38a.72.72 0 0 0-.52.24 2.2 2.2 0 0 0-.68 1.63c0 .96.7 1.9.8 2 .1.14 1.38 2.1 3.34 2.95a11 11 0 0 0 1.12.41 2.7 2.7 0 0 0 1.24.08c.38-.06 1.15-.47 1.32-.92.16-.46.16-.85.11-.93s-.18-.13-.38-.23z"
          fill="white"
        />
      </svg>
    </a>
  );
}
