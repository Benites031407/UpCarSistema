import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

/**
 * **Feature: machine-rental-system, Load Testing**
 * 
 * Performance and load testing for the Machine Rental System:
 * - Concurrent user sessions
 * - High-frequency API requests
 * - WebSocket connection load
 * - MQTT message throughput
 * - Database performance under load
 * - Memory and CPU usage validation
 */

describe('Machine Rental System - Load Testing', () => {
  let app: express.Application;
  const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  
  // Test configuration
  const loadTestConfig = {
    concurrentUsers: 50,
    requestsPerUser: 20,
    testDuration: 30000, // 30 seconds
    maxResponseTime: 2000, // 2 seconds
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    maxCpuUsage: 80 // 80%
  };

  beforeAll(async () => {
    // Set up test environment
    console.log('🚀 Starting load testing environment...');
    
    // Initialize monitoring
    if (process.env.PERFORMANCE_TEST === 'true') {
      console.log('📊 Performance monitoring enabled');
    }
  });

  afterAll(async () => {
    console.log('🏁 Load testing complete');
  });

  describe('API Endpoint Load Testing', () => {
    it('should handle concurrent machine status requests', async () => {
      const concurrentRequests = 100;
      const startTime = Date.now();
      
      // Create array of concurrent requests
      const requests = Array.from({ length: concurrentRequests }, (_, i) => 
        request(app || baseURL)
          .get('/api/machines')
          .expect(res => {
            expect(res.status).toBeLessThan(500); // No server errors
          })
      );

      // Execute all requests concurrently
      const results = await Promise.allSettled(requests);
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
      const failedRequests = results.length - successfulRequests;
      
      // Performance assertions
      expect(successfulRequests).toBeGreaterThan(concurrentRequests * 0.95); // 95% success rate
      expect(totalTime).toBeLessThan(loadTestConfig.maxResponseTime * 2); // Reasonable total time
      expect(failedRequests).toBeLessThan(concurrentRequests * 0.05); // Less than 5% failures
      
      console.log(`📊 Concurrent requests: ${concurrentRequests}`);
      console.log(`⏱️  Total time: ${totalTime}ms`);
      console.log(`✅ Successful: ${successfulRequests}`);
      console.log(`❌ Failed: ${failedRequests}`);
      console.log(`📈 Requests/sec: ${Math.round(concurrentRequests / (totalTime / 1000))}`);
    });

    it('should handle sustained load over time', async () => {
      const requestsPerSecond = 10;
      const testDurationSeconds = 10;
      const totalRequests = requestsPerSecond * testDurationSeconds;
      
      const results: Array<{ success: boolean; responseTime: number }> = [];
      const startTime = Date.now();
      
      // Send requests at regular intervals
      for (let i = 0; i < totalRequests; i++) {
        const requestStart = Date.now();
        
        try {
          const response = await request(app || baseURL)
            .get('/api/machines/MACH001')
            .timeout(5000);
          
          const responseTime = Date.now() - requestStart;
          results.push({ success: response.status < 400, responseTime });
          
        } catch (error) {
          results.push({ success: false, responseTime: Date.now() - requestStart });
        }
        
        // Wait for next interval
        const nextRequestTime = startTime + (i + 1) * (1000 / requestsPerSecond);
        const waitTime = nextRequestTime - Date.now();
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      const successfulRequests = results.filter(r => r.success).length;
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const maxResponseTime = Math.max(...results.map(r => r.responseTime));
      
      // Performance assertions
      expect(successfulRequests / totalRequests).toBeGreaterThan(0.95); // 95% success rate
      expect(averageResponseTime).toBeLessThan(loadTestConfig.maxResponseTime);
      expect(maxResponseTime).toBeLessThan(loadTestConfig.maxResponseTime * 2);
      
      console.log(`📊 Sustained load test results:`);
      console.log(`📈 Total requests: ${totalRequests}`);
      console.log(`✅ Success rate: ${Math.round((successfulRequests / totalRequests) * 100)}%`);
      console.log(`⏱️  Average response time: ${Math.round(averageResponseTime)}ms`);
      console.log(`⏱️  Max response time: ${maxResponseTime}ms`);
    });

    it('should handle concurrent session creation attempts', async () => {
      const concurrentSessions = 20;
      const machineCode = 'MACH001';
      
      // Mock authentication token
      const authToken = 'mock-load-test-token';
      
      const sessionRequests = Array.from({ length: concurrentSessions }, (_, i) => 
        request(app || baseURL)
          .post('/api/sessions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            machineCode: machineCode,
            duration: 5,
            paymentMethod: 'balance'
          })
      );

      const results = await Promise.allSettled(sessionRequests);
      
      // Only one session should succeed (machine can only have one active session)
      const successful = results.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status === 201
      );
      const rejected = results.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status === 400
      );
      
      expect(successful).toHaveLength(1); // Exactly one success
      expect(rejected).toHaveLength(concurrentSessions - 1); // All others properly rejected
      
      console.log(`📊 Concurrent session creation test:`);
      console.log(`✅ Successful sessions: ${successful.length}`);
      console.log(`❌ Rejected sessions: ${rejected.length}`);
    });
  });

  describe('Database Performance Under Load', () => {
    it('should handle concurrent database queries efficiently', async () => {
      const concurrentQueries = 50;
      const startTime = Date.now();
      
      // Simulate concurrent database operations
      const queries = Array.from({ length: concurrentQueries }, (_, i) => 
        request(app || baseURL)
          .get(`/api/admin/analytics`)
          .set('Authorization', 'Bearer mock-admin-token')
          .expect(res => {
            expect(res.status).toBeLessThan(500);
          })
      );

      const results = await Promise.allSettled(queries);
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      const successfulQueries = results.filter(r => r.status === 'fulfilled').length;
      
      expect(successfulQueries).toBeGreaterThan(concurrentQueries * 0.9); // 90% success rate
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      console.log(`📊 Database load test:`);
      console.log(`📈 Concurrent queries: ${concurrentQueries}`);
      console.log(`⏱️  Total time: ${totalTime}ms`);
      console.log(`✅ Success rate: ${Math.round((successfulQueries / concurrentQueries) * 100)}%`);
    });

    it('should maintain data consistency under concurrent writes', async () => {
      const concurrentWrites = 10;
      const authToken = 'mock-admin-token';
      
      // Concurrent credit additions to same user
      const creditRequests = Array.from({ length: concurrentWrites }, (_, i) => 
        request(app || baseURL)
          .post('/api/admin/customers/test-user-1/add-credit')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ amount: 1.0, reason: `Load test ${i}` })
      );

      const results = await Promise.allSettled(creditRequests);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      // All writes should succeed without data corruption
      expect(successful).toBe(concurrentWrites);
      
      // Verify final balance is correct
      const balanceResponse = await request(app || baseURL)
        .get('/api/admin/customers/test-user-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Balance should reflect all additions
      expect(balanceResponse.body.accountBalance).toBeGreaterThanOrEqual(concurrentWrites);
      
      console.log(`📊 Concurrent writes test:`);
      console.log(`✅ Successful writes: ${successful}/${concurrentWrites}`);
      console.log(`💰 Final balance: R$ ${balanceResponse.body.accountBalance}`);
    });
  });

  describe('WebSocket Performance', () => {
    it('should handle many concurrent WebSocket connections', async () => {
      const connectionCount = 100;
      const connections: any[] = [];
      
      try {
        // Create multiple WebSocket connections
        const connectionPromises = Array.from({ length: connectionCount }, async (_, i) => {
          const WebSocket = (await import('ws')).default;
          const ws = new WebSocket(`ws://localhost:3000`);
          
          return new Promise((resolve, reject) => {
            ws.on('open', () => {
              connections.push(ws);
              resolve(ws);
            });
            ws.on('error', reject);
            setTimeout(() => reject(new Error('Connection timeout')), 5000);
          });
        });

        const results = await Promise.allSettled(connectionPromises);
        const successfulConnections = results.filter(r => r.status === 'fulfilled').length;
        
        expect(successfulConnections).toBeGreaterThan(connectionCount * 0.9); // 90% success rate
        
        // Test broadcasting to all connections
        const messagePromises = connections.map(ws => 
          new Promise(resolve => {
            ws.on('message', resolve);
          })
        );
        
        // Simulate broadcast (this would be done by the server)
        const testMessage = JSON.stringify({ type: 'test', data: 'load test message' });
        connections.forEach(ws => {
          if (ws.readyState === 1) { // WebSocket.OPEN
            ws.send(testMessage);
          }
        });
        
        // Wait for all messages to be received
        const receivedMessages = await Promise.allSettled(messagePromises);
        const messagesReceived = receivedMessages.filter(r => r.status === 'fulfilled').length;
        
        expect(messagesReceived).toBeGreaterThan(successfulConnections * 0.9);
        
        console.log(`📊 WebSocket load test:`);
        console.log(`🔗 Successful connections: ${successfulConnections}/${connectionCount}`);
        console.log(`📨 Messages received: ${messagesReceived}/${successfulConnections}`);
        
      } finally {
        // Clean up connections
        connections.forEach(ws => {
          if (ws.readyState === 1) {
            ws.close();
          }
        });
      }
    });

    it('should handle high-frequency message broadcasting', async () => {
      const messageCount = 1000;
      const connectionCount = 10;
      const connections: any[] = [];
      
      try {
        const WebSocket = (await import('ws')).default;
        
        // Create connections
        for (let i = 0; i < connectionCount; i++) {
          const ws = new WebSocket(`ws://localhost:3000`);
          await new Promise((resolve, reject) => {
            ws.on('open', resolve);
            ws.on('error', reject);
            setTimeout(() => reject(new Error('Connection timeout')), 5000);
          });
          connections.push(ws);
        }
        
        const startTime = Date.now();
        let messagesReceived = 0;
        
        // Set up message counters
        connections.forEach(ws => {
          ws.on('message', () => {
            messagesReceived++;
          });
        });
        
        // Send high-frequency messages
        for (let i = 0; i < messageCount; i++) {
          const message = JSON.stringify({
            type: 'machine_status_update',
            data: { machineId: 'test', temperature: 25 + (i % 10) }
          });
          
          connections.forEach(ws => {
            if (ws.readyState === 1) {
              ws.send(message);
            }
          });
          
          // Small delay to prevent overwhelming
          if (i % 100 === 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        
        // Wait for message processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        const expectedMessages = messageCount * connectionCount;
        const messageRate = messagesReceived / (totalTime / 1000);
        
        expect(messagesReceived).toBeGreaterThan(expectedMessages * 0.9); // 90% delivery rate
        expect(messageRate).toBeGreaterThan(100); // At least 100 messages/second
        
        console.log(`📊 High-frequency messaging test:`);
        console.log(`📨 Messages sent: ${messageCount * connectionCount}`);
        console.log(`📨 Messages received: ${messagesReceived}`);
        console.log(`📈 Message rate: ${Math.round(messageRate)} msg/sec`);
        console.log(`⏱️  Total time: ${totalTime}ms`);
        
      } finally {
        connections.forEach(ws => {
          if (ws.readyState === 1) {
            ws.close();
          }
        });
      }
    });
  });

  describe('MQTT Performance', () => {
    it('should handle high-frequency MQTT messages', async () => {
      const mqtt = await import('mqtt');
      const client = mqtt.connect('mqtt://localhost:1884');
      
      await new Promise<void>((resolve, reject) => {
        client.on('connect', resolve);
        client.on('error', reject);
        setTimeout(() => reject(new Error('MQTT connection timeout')), 5000);
      });
      
      const messageCount = 1000;
      const topic = 'machines/load-test/status';
      let messagesReceived = 0;
      
      // Subscribe to test topic
      client.subscribe(topic);
      client.on('message', (receivedTopic) => {
        if (receivedTopic === topic) {
          messagesReceived++;
        }
      });
      
      const startTime = Date.now();
      
      // Publish messages rapidly
      for (let i = 0; i < messageCount; i++) {
        const message = JSON.stringify({
          controllerId: 'load-test',
          temperature: 25 + (i % 10),
          timestamp: new Date().toISOString()
        });
        
        client.publish(topic, message);
        
        // Small delay every 100 messages
        if (i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const messageRate = messagesReceived / (totalTime / 1000);
      
      expect(messagesReceived).toBeGreaterThan(messageCount * 0.95); // 95% delivery rate
      expect(messageRate).toBeGreaterThan(50); // At least 50 messages/second
      
      console.log(`📊 MQTT performance test:`);
      console.log(`📨 Messages published: ${messageCount}`);
      console.log(`📨 Messages received: ${messagesReceived}`);
      console.log(`📈 Message rate: ${Math.round(messageRate)} msg/sec`);
      console.log(`⏱️  Total time: ${totalTime}ms`);
      
      client.end();
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should maintain reasonable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform memory-intensive operations
      const operations = Array.from({ length: 100 }, async (_, i) => {
        return request(app || baseURL)
          .get('/api/admin/analytics')
          .set('Authorization', 'Bearer mock-admin-token');
      });
      
      await Promise.all(operations);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(loadTestConfig.maxMemoryUsage);
      
      console.log(`📊 Memory usage test:`);
      console.log(`🧠 Initial heap: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`🧠 Final heap: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`📈 Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });

    it('should handle memory cleanup after sessions', async () => {
      const initialMemory = process.memoryUsage();
      
      // Create and complete multiple sessions
      const sessionCount = 50;
      const authToken = 'mock-load-test-token';
      
      for (let i = 0; i < sessionCount; i++) {
        try {
          await request(app || baseURL)
            .post('/api/sessions')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              machineCode: `MACH${String(i).padStart(3, '0')}`,
              duration: 1,
              paymentMethod: 'balance'
            });
        } catch (error) {
          // Expected for some requests due to machine availability
        }
      }
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory should not grow excessively
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
      
      console.log(`📊 Session memory cleanup test:`);
      console.log(`🧠 Memory increase after ${sessionCount} sessions: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });
  });

  describe('Error Rate Under Load', () => {
    it('should maintain low error rate under sustained load', async () => {
      const testDuration = 30000; // 30 seconds
      const requestInterval = 100; // 10 requests per second
      const startTime = Date.now();
      
      const results: Array<{ success: boolean; status: number; responseTime: number }> = [];
      
      while (Date.now() - startTime < testDuration) {
        const requestStart = Date.now();
        
        try {
          const response = await request(app || baseURL)
            .get('/api/machines')
            .timeout(5000);
          
          results.push({
            success: response.status < 400,
            status: response.status,
            responseTime: Date.now() - requestStart
          });
          
        } catch (error) {
          results.push({
            success: false,
            status: 500,
            responseTime: Date.now() - requestStart
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }
      
      const totalRequests = results.length;
      const successfulRequests = results.filter(r => r.success).length;
      const errorRate = (totalRequests - successfulRequests) / totalRequests;
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      
      // Performance assertions
      expect(errorRate).toBeLessThan(0.05); // Less than 5% error rate
      expect(averageResponseTime).toBeLessThan(loadTestConfig.maxResponseTime);
      
      console.log(`📊 Sustained load error rate test:`);
      console.log(`📈 Total requests: ${totalRequests}`);
      console.log(`✅ Successful requests: ${successfulRequests}`);
      console.log(`❌ Error rate: ${Math.round(errorRate * 100)}%`);
      console.log(`⏱️  Average response time: ${Math.round(averageResponseTime)}ms`);
    });
  });
});