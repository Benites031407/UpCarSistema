-- Clear existing mock data
DELETE FROM machines WHERE code IN ('WASH001', 'WASH002', 'DRY001');
DELETE FROM users WHERE email IN ('admin@machinerental.com', 'customer@example.com');

-- Insert mock users
INSERT INTO users (email, name, account_balance, subscription_status, role) VALUES
('admin@machinerental.com', 'System Administrator', 100.00, 'none', 'admin'),
('customer@example.com', 'John Doe', 50.00, 'none', 'customer');

-- Insert mock machines
INSERT INTO machines (code, qr_code, location, controller_id, operating_hours_start, operating_hours_end, maintenance_interval, status, current_operating_hours) VALUES
('WASH001', 'https://example.com/qr/WASH001', 'Laundromat A - Floor 1', 'pi-controller-001', '08:00', '22:00', 100, 'online', 0),
('WASH002', 'https://example.com/qr/WASH002', 'Laundromat A - Floor 2', 'pi-controller-002', '06:00', '23:00', 150, 'online', 0),
('DRY001', 'https://example.com/qr/DRY001', 'Laundromat B - Main Floor', 'pi-controller-003', '07:00', '21:00', 120, 'online', 0);

-- Verify the data was inserted
SELECT 'Users created:' as info, COUNT(*) as count FROM users WHERE email IN ('admin@machinerental.com', 'customer@example.com');
SELECT 'Machines created:' as info, COUNT(*) as count FROM machines WHERE code IN ('WASH001', 'WASH002', 'DRY001');

-- Show the created data
SELECT 'USERS:' as table_name, email, name, account_balance, role FROM users WHERE email IN ('admin@machinerental.com', 'customer@example.com');
SELECT 'MACHINES:' as table_name, code, location, controller_id, status FROM machines WHERE code IN ('WASH001', 'WASH002', 'DRY001');