import { db } from '../database/connection.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('seed');
import { RepositoryFactory } from '../repositories/index.js';

async function seedDatabase(): Promise<void> {
  try {
    logger.info('Starting database seeding...');
    
    // Test database connection
    const connected = await db.testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    const userRepo = RepositoryFactory.getUserRepository();
    const machineRepo = RepositoryFactory.getMachineRepository();

    // Create sample admin user
    const adminUser = await userRepo.create({
      email: 'admin@machinerental.com',
      name: 'System Administrator',
      accountBalance: 100.00,
      subscriptionStatus: 'none'
    });
    logger.info(`Created admin user: ${adminUser.id}`);

    // Create sample customer user
    const customerUser = await userRepo.create({
      email: 'customer@example.com',
      name: 'John Doe',
      accountBalance: 50.00,
      subscriptionStatus: 'none'
    });
    logger.info(`Created customer user: ${customerUser.id}`);

    // Create sample machines
    const machine1 = await machineRepo.create({
      code: 'WASH001',
      qrCode: 'https://example.com/qr/WASH001',
      location: 'Laundromat A - Floor 1',
      controllerId: 'pi-controller-001',
      operatingHours: {
        start: '08:00',
        end: '22:00'
      },
      maintenanceInterval: 100
    });
    logger.info(`Created machine: ${machine1.id} (${machine1.code})`);

    const machine2 = await machineRepo.create({
      code: 'WASH002',
      qrCode: 'https://example.com/qr/WASH002',
      location: 'Laundromat A - Floor 2',
      controllerId: 'pi-controller-002',
      operatingHours: {
        start: '06:00',
        end: '23:00'
      },
      maintenanceInterval: 150
    });
    logger.info(`Created machine: ${machine2.id} (${machine2.code})`);

    const machine3 = await machineRepo.create({
      code: 'DRY001',
      qrCode: 'https://example.com/qr/DRY001',
      location: 'Laundromat B - Main Floor',
      controllerId: 'pi-controller-003',
      operatingHours: {
        start: '07:00',
        end: '21:00'
      },
      maintenanceInterval: 120
    });
    logger.info(`Created machine: ${machine3.id} (${machine3.code})`);

    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Database seeding failed', error);
    throw error;
  }
}

// Run seeding if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      logger.info('Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding process failed', error);
      process.exit(1);
    });
}

export { seedDatabase };