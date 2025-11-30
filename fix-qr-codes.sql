-- This will be done via backend API instead
-- Just marking machines that need QR code regeneration
SELECT code, LENGTH(qr_code) as qr_length FROM machines WHERE LENGTH(qr_code) < 100;
