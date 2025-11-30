# Implementation Plan

- [x] 1. Set up project structure and core infrastructure





  - Create monorepo structure with frontend, backend, and IoT controller directories
  - Initialize TypeScript configuration for all components
  - Set up package.json files with required dependencies
  - Configure development environment and build scripts
  - _Requirements: All requirements depend on proper project setup_

- [x] 2. Implement database schema and core data models





  - Create PostgreSQL database schema with all required tables
  - Implement TypeScript interfaces for User, Machine, UsageSession, Transaction, and Notification models
  - Set up database connection utilities and migration scripts
  - Create repository pattern interfaces for data access
  - _Requirements: 3.1, 3.2, 6.1, 11.2_

- [x] 2.1 Write property test for data model validation






  - **Property 2: Balance deduction accuracy**
  - **Validates: Requirements 3.2**


- [x] 2.2 Write property test for cost calculation





  - **Property 1: Cost calculation consistency**
  - **Validates: Requirements 2.2**


- [x] 3. Implement authentication and user management system




  - Set up JWT token generation and validation
  - Implement Google OAuth 2.0 integration
  - Create email/password registration and login endpoints
  - Build session management with Redis
  - Implement password hashing and security measures
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_


- [x] 3.1 Write property test for authentication validation






  - **Property 14: Session state maintenance**
  - **Validates: Requirements 5.3**


- [x] 3.2 Write property test for authorization




  - **Property 15: Protected feature authorization**
  - **Validates: Requirements 5.5**



- [x]* 3.3 Write property test for authentication error handling



  - **Property 16: Authentication failure handling**
  - **Validates: Requirements 5.4**
- [x] 3.4 Write property test for email validation





- [ ] 3.4 Write property test for email validation


  - **Property 6: Email registration validation**
  - **Validates: Requirements 5.2**

- [x] 4. Create machine management and registry system




  - Implement machine registration API endpoints
  - Build QR code generation functionality
  - Create machine status tracking and updates
  - Implement machine configuration (operating hours, maintenance intervals)
  - Build machine search and filtering capabilities
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.1, 8.2_

- [x] 4.1 Write property test for machine registration






  - **Property 7: Machine registration completeness**
  - **Validates: Requirements 6.1**


- [x] 4.2 Write property test for operating hours enforcement





  - **Property 9: Operating hours enforcement**
  - **Validates: Requirements 8.1, 8.4**


- [x] 4.3 Write property test for maintenance triggering





  - **Property 10: Automatic maintenance triggering**
  - **Validates: Requirements 7.2, 8.2**

- [x] 5. Implement payment processing system












  - Integrate PIX payment gateway (Mercado Pago or similar)
  - Create account balance management functionality
  - Implement transaction recording and history
  - Build payment method selection logic
  - Create subscription payment processing
  - _Requirements: 2.3, 2.4, 2.5, 3.1, 3.4, 4.1_

- [x] 5.1 Write property test for payment options






  - **Property 11: Payment option availability**
  - **Validates: Requirements 2.3**

- [x] 5.2 Write property test for shortfall calculation





  - **Property 12: Shortfall calculation accuracy**
  - **Validates: Requirements 2.4, 3.4**



- [x] 5.3 Write property test for credit addition




  - **Property 13: Credit addition immediacy**
  - **Validates: Requirements 3.1, 11.2**



- [x] 6. Build usage session management system






  - Create machine activation workflow
  - Implement duration selection and validation
  - Build session state management (pending, active, completed)
  - Create automatic session termination logic
  - Implement subscription daily usage tracking
  - _Requirements: 2.1, 2.2, 2.5, 4.2, 4.3, 4.4_


- [x] 6.1 Write property test for machine activation





  - **Property 3: Machine activation triggers IoT command**
  - **Validates: Requirements 2.5, 12.1**


- [x] 6.2 Write property test for subscription usage limits





  - **Property 4: Subscription daily usage enforcement**
  - **Validates: Requirements 4.2, 4.3**


- [x] 6.3 Write property test for maintenance mode prevention




  - **Property 8: Maintenance mode prevents activation**
  - **Validates: Requirements 1.4, 7.3**



- [x] 7. Implement IoT communication system





  - Set up MQTT broker (Mosquitto) for real-time messaging
  - Create machine controller communication protocols
  - Implement relay control commands and responses
  - Build temperature monitoring and status reporting
  - Create offline detection and recovery mechanisms
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_


- [x] 7.1 Write property test for relay control duration





  - **Property 17: Relay control duration accuracy**
  - **Validates: Requirements 12.2**

- [x] 7.2 Write property test for session termination





- [ ] 7.2 Write property test for session termination


  - **Property 18: Automatic session termination**
  - **Validates: Requirements 12.3**

- [x] 7.3 Write property test for communication failure detection





  - **Property 19: Communication failure detection**
  - **Validates: Requirements 7.5, 12.5**



- [x] 8. Create Raspberry Pi controller software






  - Implement Node.js MQTT client for Pi
  - Build GPIO control for relay module (SRD-05VDC-SL-C)
  - Create temperature sensor reading functionality
  - Implement heartbeat and status reporting
  - Build safety mechanisms and error handling
  - _Requirements: 12.2, 12.3, 12.4, 12.5_


- [x] 9. Checkpoint - Ensure core backend functionality works






  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Build notification system








  - Integrate WhatsApp Business API for notifications
  - Implement notification triggering for maintenance and offline events
  - Create notification rate limiting and spam prevention
  - Build notification logging and audit trail
  - Implement error notification handling
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_


- [x] 10.1 Write property test for maintenance notifications




  - **Property 20: Maintenance notification triggering**
  - **Validates: Requirements 10.1**



- [x] 10.2 Write property test for offline notifications








  - **Property 21: Offline notification triggering**
  - **Validates: Requirements 10.2**


- [x] 10.3 Write property test for notification rate limiting




  - **Property 22: Notification rate limiting**
  - **Validates: Requirements 10.5**






- [x] 11. Implement customer-facing web interface








  - Create React application with TypeScript and Tailwind CSS
  - Build QR code scanning functionality using browser camera API
  - Implement machine code entry and validation
  - Create duration selection component (1-30 minutes)
  - Build payment method selection and processing interface
  - Implement account balance display and management
  - Create subscription management interface
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.3, 3.5, 4.5_


- [x] 11.1 Write property test for invalid machine code handling






  - **Property 5: Invalid machine code handling**
  - **Validates: Requirements 1.3**




- [x] 11.2 Write property test for currency formatting







  - **Property 23: Currency formatting consistency**
  - **Validates: Requirements 3.3**


- [x] 12. Build admin dashboard interface





  - Create React-based admin dashboard with authentication
  - Implement machine registry management interface
  - Build real-time machine monitoring dashboard
  - Create customer search and account management tools
  - Implement analytics and reporting functionality
  - Build financial reporting with export capabilities
  - _Requirements: 6.5, 7.4, 9.1, 9.2, 9.3, 9.4, 11.1, 11.3, 11.4, 11.5_

- [x] 12.1 Write property test for dashboard metrics






  - **Property 24: Dashboard metrics accuracy**
  - **Validates: Requirements 9.1**


- [x] 12.2 Write property test for usage history display





  - **Property 25: Usage history completeness**
  - **Validates: Requirements 11.3**






- [x] 13. Implement real-time features







  - Set up WebSocket connections for real-time dashboard updates
  - Implement live machine status updates




  - Create real-time notification delivery
  - Build live usage session monitoring
  - _Requirements: 7.1, 9.5_



- [x] 14. Add input validation and error handling











  - Implement comprehensive input validation for all API endpoints
  - Create user-friendly error messages and handling
  - Build retry mechanisms for payment and IoT operations
  - Implement graceful degradation for offline scenarios
  - _Requirements: 1.3, 5.4, 10.3_






- [x] 15. Implement security measures









  - Add rate limiting to API endpoints
  - Implement CORS configuration



  - Create input sanitization and SQL injection prevention
  - Build audit logging for sensitive operations
  - Implement secure session management
  - _Requirements: 5.4, 5.5, 10.4_


-

- [x] 16. Create deployment configuration













  - Set up Docker containers for all services
  - Create production environment configuration
  - Implement database backup and recovery procedures
  - Set up monitoring and logging infrastructure
  - Create deployment scripts and CI/CD pipeline
  - _Requirements: All requirements need proper deployment_


- [x] 17. Final integration and testing









  - Integrate all components and test end-to-end workflows
  - Verify IoT hardware integration with actual Raspberry Pi
  - Test payment gateway integration in sandbox environment
  - Validate WhatsApp notification delivery
  - Perform load testing and performance optimization
  - _Requirements: All requirements_


- [x] 18. Final Checkpoint - Complete system verification





  - Ensure all tests pass, ask the user if questions arise.