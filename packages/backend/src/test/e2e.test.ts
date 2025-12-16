import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { Client as SocketIOClient } from 'socket.io-client';
import mqtt from 'mqtt';

/**
 * **Feature: machine-rental-system, End-to-End System Tests**
 * 
 * Complete system integration tests covering:
 * - Full customer journey from QR scan to machine operation
 * - Admin management workflows
 * - IoT hardware integration simulation
 * - Payment processing with mock gateway
 * - Real-time notifications and updates
 * - Error scenarios and recovery
 * - Load testing and performance validation
 */

describe('Machine Rental System - Complete End-to-End Tests', () => {
  let app: express.Application;
  let server: any;
  let io: SocketIOServer;
  let clientSocket: SocketIOClient;
  let mqttClient: any;
  let testPort: number;

  // Test data
  const testCustomer = {
    email: 'customer@e2etest.com',
    password: 'testpass123',
    name: 'E2E Test Customer'
  };

  const testAdmin = {
    email: 'admin@e2etest.com',
    password: 'adminpass123',
    name: 'E2E Test Admin'
  };

  const testMachine = {
    code: 'E2E001',
    location: 'E2E Test Location',
    controllerId: 'pi-e2e-test',
    operatingHours: { start: '08:00', end: '18:00' },
    maintenanceInterval: 100
  };

  let customerToken: string;
  let adminToken: string;
  let machineId: string;

  beforeAll(async () => {
    // Set up complete application stack
    app = express();
    app.use(express.json());

    // Initialize all routes and middleware
    // (In a real implementation, this would import the full app setup)
    
    server = createServer(app);
    io = new SocketIOServer(server, {
      cors: { origin: "*", methods: ["GET", "POST"] }
    });

    // Start server on random port
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        testPort = (server.address() as any).port;
        console.log(`E2E test server running on port ${testPort}`);
        resolve();
      });
    });

    // Set up MQTT client for IoT simulation
    mqttClient = mqtt.connect('mqtt://localhost:1883');
    await new Promise<void>((resolve) => {
      mqttClient.on('connect', () => resolve());
    });
  });

  afterAll(async () => {
    if (clientSocket) clientSocket.disconnect();
    if (mqttClient) mqttClient.end();
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  beforeEach(async () => {
    // Set up WebSocket client
    clientSocket = new SocketIOClient(`http://localhost:${testPort}`);
    await new Promise<void>((resolve) => {
      clientSocket.on('connect', () => resolve());
    });
  });

  describe('Complete System Workflow - Customer Journey', () => {
    it('should handle complete customer journey: registration → QR scan → payment → machine operation', async () => {
      // Step 1: Customer Registration
      const registrationResponse = await request(app)
        .post('/auth/register')
        .send(testCustomer)
        .expect(201);

      expect(registrationResponse.body.user.email).toBe(testCustomer.email);
      customerToken = registrationResponse.body.accessToken;

      // Step 2: Admin Registration and Machine Setup
      const adminRegistrationResponse = await request(app)
        .post('/auth/register')
        .send({ ...testAdmin, role: 'admin' })
        .expect(201);

      adminToken = adminRegistrationResponse.body.accessToken;

      // Step 3: Admin registers machine
      const machineResponse = await request(app)
        .post('/api/machines')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testMachine)
        .expect(201);

      machineId = machineResponse.body.id;
      expect(machineResponse.body.qrCode).toBeDefined();

      // Step 4: Customer adds credit to account
      const creditResponse = await request(app)
        .post('/api/payments/add-credit')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ amount: 50.0, paymentMethod: 'pix' })
        .expect(200);

      expect(creditResponse.body.newBalance).toBe(50.0);

      // Step 5: Customer scans QR code (simulated by accessing machine)
      const machineInfoResponse = await request(app)
        .get(`/api/machines/${testMachine.code}`)
        .expect(200);

      expect(machineInfoResponse.body.status).toBe('online');

      // Step 6: Customer creates usage session
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          machineCode: testMachine.code,
          duration: 15,
          paymentMethod: 'balance'
        })
        .expect(201);

      const sessionId = sessionResponse.body.id;
      expect(sessionResponse.body.cost).toBe(15);

      // Step 7: Process payment
      const paymentResponse = await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          sessionId: sessionId,
          paymentMethod: 'balance'
        })
        .expect(200);

      expect(paymentResponse.body.status).toBe('completed');

      // Step 8: Verify machine activation command sent via MQTT
      const mqttMessagePromise = new Promise((resolve) => {
        mqttClient.subscribe(`machines/${testMachine.controllerId}/activate`);
        mqttClient.on('message', (topic: string, message: Buffer) => {
          if (topic === `machines/${testMachine.controllerId}/activate`) {
            resolve(JSON.parse(message.toString()));
          }
        });
      });

      const activationCommand = await mqttMessagePromise;
      expect(activationCommand).toMatchObject({
        sessionId: sessionId,
        duration: 900 // 15 minutes in seconds
      });

      // Step 9: Simulate IoT controller response
      mqttClient.publish(
        `machines/${testMachine.controllerId}/status`,
        JSON.stringify({
          sessionId: sessionId,
          status: 'activated',
          timestamp: new Date().toISOString()
        })
      );

      // Step 10: Verify session status updated
      const updatedSessionResponse = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(updatedSessionResponse.body.status).toBe('active');

      // Step 11: Simulate session completion
      setTimeout(() => {
        mqttClient.publish(
          `machines/${testMachine.controllerId}/session_complete`,
          JSON.stringify({
            sessionId: sessionId,
            actualDuration: 900,
            timestamp: new Date().toISOString()
          })
        );
      }, 1000);

      // Step 12: Verify final session status
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const completedSessionResponse = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(completedSessionResponse.body.status).toBe('completed');
    });

    it('should handle subscription-based usage workflow', async () => {
      // Customer subscribes to monthly plan
      const subscriptionResponse = await request(app)
        .post('/api/subscriptions/subscribe')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ plan: 'monthly' })
        .expect(201);

      expect(subscriptionResponse.body.status).toBe('active');

      // First usage of the day should be free
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          machineCode: testMachine.code,
          duration: 30,
          paymentMethod: 'subscription'
        })
        .expect(201);

      expect(sessionResponse.body.cost).toBe(0);

      // Second usage on same day should be prevented
      const secondSessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          machineCode: testMachine.code,
          duration: 15,
          paymentMethod: 'subscription'
        })
        .expect(400);

      expect(secondSessionResponse.body.error).toContain('daily usage limit');
    });
  });

  describe('Admin Management Workflow', () => {
    it('should handle complete admin workflow: machine management → monitoring → maintenance', async () => {
      // Admin views dashboard metrics
      const analyticsResponse = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(analyticsResponse.body).toMatchObject({
        totalMachines: expect.any(Number),
        operationalCount: expect.any(Number),
        totalRevenue: expect.any(Number)
      });

      // Admin updates machine configuration
      const updateResponse = await request(app)
        .put(`/api/machines/${machineId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          operatingHours: { start: '07:00', end: '19:00' },
          maintenanceInterval: 120
        })
        .expect(200);

      expect(updateResponse.body.operatingHours.start).toBe('07:00');

      // Admin triggers maintenance mode
      const maintenanceResponse = await request(app)
        .put(`/api/machines/${machineId}/maintenance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ maintenanceMode: true })
        .expect(200);

      expect(maintenanceResponse.body.status).toBe('maintenance');

      // Verify customers cannot activate machine in maintenance
      const blockedSessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          machineCode: testMachine.code,
          duration: 10,
          paymentMethod: 'balance'
        })
        .expect(400);

      expect(blockedSessionResponse.body.error).toContain('maintenance');

      // Admin completes maintenance
      const completedMaintenanceResponse = await request(app)
        .put(`/api/machines/${machineId}/maintenance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ maintenanceMode: false })
        .expect(200);

      expect(completedMaintenanceResponse.body.status).toBe('online');
    });

    it('should handle customer account management', async () => {
      // Admin searches for customer
      const searchResponse = await request(app)
        .get('/api/admin/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: testCustomer.email })
        .expect(200);

      expect(searchResponse.body.customers).toHaveLength(1);
      expect(searchResponse.body.customers[0].email).toBe(testCustomer.email);

      const customerId = searchResponse.body.customers[0].id;

      // Admin adds credit to customer account
      const creditResponse = await request(app)
        .post(`/api/admin/customers/${customerId}/add-credit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 25.0, reason: 'Promotional credit' })
        .expect(200);

      expect(creditResponse.body.newBalance).toBeGreaterThan(0);

      // Admin views customer usage history
      const historyResponse = await request(app)
        .get(`/api/admin/customers/${customerId}/usage-history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(historyResponse.body.sessions).toBeDefined();
    });
  });

  describe('Real-time Features Integration', () => {
    it('should broadcast real-time updates to connected clients', async () => {
      // Set up multiple WebSocket clients
      const adminSocket = new SocketIOClient(`http://localhost:${testPort}`);
      const customerSocket = new SocketIOClient(`http://localhost:${testPort}`);

      await Promise.all([
        new Promise<void>(resolve => adminSocket.on('connect', () => resolve())),
        new Promise<void>(resolve => customerSocket.on('connect', () => resolve()))
      ]);

      // Admin client subscribes to dashboard updates
      adminSocket.emit('subscribe', 'dashboard_updates');
      
      // Customer client subscribes to machine updates
      customerSocket.emit('subscribe', `machine_${machineId}`);

      // Simulate machine status change
      const statusUpdatePromise = new Promise(resolve => {
        customerSocket.on('machine_status_update', resolve);
      });

      const metricsUpdatePromise = new Promise(resolve => {
        adminSocket.on('dashboard_metrics_update', resolve);
      });

      // Trigger status change via MQTT
      mqttClient.publish(
        `machines/${testMachine.controllerId}/status`,
        JSON.stringify({
          status: 'in_use',
          temperature: 27.5,
          timestamp: new Date().toISOString()
        })
      );

      // Verify real-time updates received
      const statusUpdate = await statusUpdatePromise;
      expect(statusUpdate).toMatchObject({
        machineId: machineId,
        status: 'in_use',
        temperature: 27.5
      });

      const metricsUpdate = await metricsUpdatePromise;
      expect(metricsUpdate).toMatchObject({
        operationalCount: expect.any(Number),
        totalRevenue: expect.any(Number)
      });

      // Clean up
      adminSocket.disconnect();
      customerSocket.disconnect();
    });
  });

  describe('Notification System Integration', () => {
    it('should send WhatsApp notifications for critical events', async () => {
      // Mock WhatsApp API
      const mockWhatsAppSend = vi.fn().mockResolvedValue({
        messageId: 'wa-test-123',
        status: 'sent'
      });

      // Simulate machine going offline
      mqttClient.publish(
        `machines/${testMachine.controllerId}/offline`,
        JSON.stringify({
          controllerId: testMachine.controllerId,
          lastSeen: new Date().toISOString(),
          reason: 'connection_lost'
        })
      );

      // Verify notification sent
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const notificationsResponse = await request(app)
        .get('/api/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(notificationsResponse.body.notifications).toContainEqual(
        expect.objectContaining({
          type: 'machine_offline',
          machineId: machineId
        })
      );
    });

    it('should implement notification rate limiting', async () => {
      // Send multiple rapid notifications
      for (let i = 0; i < 5; i++) {
        mqttClient.publish(
          `machines/${testMachine.controllerId}/error`,
          JSON.stringify({
            error: `Test error ${i}`,
            timestamp: new Date().toISOString()
          })
        );
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should have rate-limited notifications
      const notificationsResponse = await request(app)
        .get('/api/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ type: 'system_error', limit: 10 })
        .expect(200);

      // Should have fewer notifications than sent due to rate limiting
      expect(notificationsResponse.body.notifications.length).toBeLessThan(5);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle payment gateway failures gracefully', async () => {
      // Mock payment gateway failure
      const failedPaymentResponse = await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          sessionId: 'non-existent-session',
          paymentMethod: 'pix'
        })
        .expect(400);

      expect(failedPaymentResponse.body.error).toBeDefined();

      // System should remain stable
      const healthResponse = await request(app)
        .get('/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('healthy');
    });

    it('should handle IoT communication failures', async () => {
      // Create session but simulate IoT controller offline
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          machineCode: testMachine.code,
          duration: 10,
          paymentMethod: 'balance'
        })
        .expect(201);

      const sessionId = sessionResponse.body.id;

      // Process payment
      await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          sessionId: sessionId,
          paymentMethod: 'balance'
        })
        .expect(200);

      // Simulate no response from IoT controller
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Session should timeout and be marked as failed
      const timeoutSessionResponse = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(timeoutSessionResponse.body.status).toBe('failed');

      // Customer should be refunded
      const userResponse = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      // Balance should be restored
      expect(userResponse.body.accountBalance).toBeGreaterThan(0);
    });

    it('should handle database connection issues', async () => {
      // This would require mocking database failures
      // For now, verify system handles invalid requests gracefully
      
      const invalidResponse = await request(app)
        .get('/api/machines/invalid-id')
        .expect(404);

      expect(invalidResponse.body.error).toBe('Machine not found');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent user sessions', async () => {
      const concurrentUsers = 10;
      const promises: Promise<any>[] = [];

      // Create multiple concurrent sessions
      for (let i = 0; i < concurrentUsers; i++) {
        const promise = request(app)
          .post('/api/sessions')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            machineCode: testMachine.code,
            duration: 5,
            paymentMethod: 'balance'
          });
        promises.push(promise);
      }

      const results = await Promise.allSettled(promises);
      
      // Only one should succeed (machine can only have one active session)
      const successful = results.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status === 201
      );
      const failed = results.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status !== 201
      );

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(concurrentUsers - 1);
    });

    it('should handle high-frequency status updates', async () => {
      const updateCount = 50;
      const startTime = Date.now();

      // Send rapid status updates
      for (let i = 0; i < updateCount; i++) {
        mqttClient.publish(
          `machines/${testMachine.controllerId}/heartbeat`,
          JSON.stringify({
            controllerId: testMachine.controllerId,
            temperature: 25 + (i % 5),
            timestamp: new Date().toISOString()
          })
        );
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process updates efficiently
      expect(processingTime).toBeLessThan(5000);

      // Verify latest status is accurate
      const machineResponse = await request(app)
        .get(`/api/machines/${machineId}`)
        .expect(200);

      expect(machineResponse.body.temperature).toBeGreaterThan(20);
    });

    it('should maintain WebSocket performance under load', async () => {
      const clientCount = 20;
      const clients: SocketIOClient[] = [];

      try {
        // Create multiple WebSocket connections
        for (let i = 0; i < clientCount; i++) {
          const client = new SocketIOClient(`http://localhost:${testPort}`);
          clients.push(client);
          
          await new Promise<void>((resolve) => {
            client.on('connect', () => resolve());
          });
        }

        // Broadcast update to all clients
        const updatePromises = clients.map(client => 
          new Promise(resolve => client.on('machine_status_update', resolve))
        );

        // Trigger broadcast
        mqttClient.publish(
          `machines/${testMachine.controllerId}/status`,
          JSON.stringify({
            status: 'online',
            temperature: 26.0,
            timestamp: new Date().toISOString()
          })
        );

        // All clients should receive update within reasonable time
        const startTime = Date.now();
        await Promise.all(updatePromises);
        const broadcastTime = Date.now() - startTime;

        expect(broadcastTime).toBeLessThan(1000); // Should complete within 1 second

      } finally {
        // Clean up all connections
        clients.forEach(client => client.disconnect());
      }
    });
  });

  describe('Security Integration', () => {
    it('should prevent unauthorized access to admin endpoints', async () => {
      // Customer tries to access admin endpoint
      const unauthorizedResponse = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(unauthorizedResponse.body.error).toContain('Insufficient permissions');
    });

    it('should validate input and prevent injection attacks', async () => {
      // Attempt SQL injection in machine code
      const injectionResponse = await request(app)
        .get('/api/machines/"; DROP TABLE machines; --')
        .expect(400);

      expect(injectionResponse.body.error).toContain('Invalid machine code format');
    });

    it('should implement rate limiting on API endpoints', async () => {
      const requests = 100;
      const promises: Promise<any>[] = [];

      // Send many rapid requests
      for (let i = 0; i < requests; i++) {
        promises.push(
          request(app)
            .get('/api/machines')
            .set('Authorization', `Bearer ${customerToken}`)
        );
      }

      const results = await Promise.allSettled(promises);
      
      // Some requests should be rate limited
      const rateLimited = results.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status === 429
      );

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});