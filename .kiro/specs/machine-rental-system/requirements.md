# Requirements Document

## Introduction

The Machine Rental System is a comprehensive IoT-enabled platform that allows customers to rent time-based access to machines through QR code scanning and payment processing. The system consists of a customer-facing mobile website for machine activation and payment, an administrator dashboard for machine management and monitoring, and IoT integration with Raspberry Pi controllers for remote machine operation.

## Glossary

- **Machine_Rental_System**: The complete software platform including customer interface, admin dashboard, and IoT integration
- **Customer_Interface**: The mobile-optimized website accessed by customers via QR code scanning
- **Admin_Dashboard**: The web-based administrative interface for system management
- **Machine_Controller**: Raspberry Pi 3B device with relay module controlling individual machines
- **PIX_Payment**: Brazilian instant payment system integration
- **Account_Balance**: Customer's prepaid credit stored in the system (1 R$ = 1 minute)
- **Monthly_Subscription**: Recurring payment plan allowing unlimited daily machine access for R$59.90/month
- **Maintenance_Mode**: Machine state requiring administrative intervention before resuming operation
- **Usage_Session**: A single instance of machine activation by a customer
- **Machine_Registry**: Database of all registered machines with their locations and configurations

## Requirements

### Requirement 1

**User Story:** As a customer, I want to access machines through QR code scanning and code entry, so that I can quickly start using available machines.

#### Acceptance Criteria

1. WHEN a customer scans a QR code on a machine, THE Customer_Interface SHALL redirect them to the machine activation page
2. WHEN a customer enters a valid machine code, THE Customer_Interface SHALL display the machine's availability status and pricing
3. WHEN a customer enters an invalid machine code, THE Customer_Interface SHALL display an error message and maintain the current state
4. WHEN a machine is offline or in maintenance mode, THE Customer_Interface SHALL prevent activation and display the machine status
5. WHEN a customer accesses the interface, THE Customer_Interface SHALL display optimized layout for mobile devices while remaining functional on desktop

### Requirement 2

**User Story:** As a customer, I want to select usage duration and pay for machine time, so that I can control my spending and machine usage.

#### Acceptance Criteria

1. WHEN selecting usage duration, THE Customer_Interface SHALL provide options from 1 minute to 30 minutes in 1-minute increments
2. WHEN a customer selects duration, THE Customer_Interface SHALL calculate and display the total cost (1 R$ per minute)
3. WHEN a customer has sufficient Account_Balance, THE Customer_Interface SHALL offer both balance payment and PIX_Payment options
4. WHEN a customer has insufficient Account_Balance, THE Customer_Interface SHALL display the shortfall amount and require PIX_Payment for the difference
5. WHEN payment is completed successfully, THE Machine_Rental_System SHALL activate the machine for the specified duration

### Requirement 3

**User Story:** As a customer, I want to manage my account balance, so that I can make quick payments without entering payment details each time.

#### Acceptance Criteria

1. WHEN a customer adds credit to their account, THE Machine_Rental_System SHALL update their Account_Balance immediately after payment confirmation
2. WHEN a customer uses Account_Balance for payment, THE Machine_Rental_System SHALL deduct the exact amount and update the balance
3. WHEN displaying Account_Balance, THE Customer_Interface SHALL show the current balance in Brazilian Real currency format
4. WHEN Account_Balance is insufficient for a transaction, THE Customer_Interface SHALL clearly indicate the required additional amount
5. WHEN a customer views their account, THE Customer_Interface SHALL display their current balance and recent transaction history

### Requirement 4

**User Story:** As a customer, I want to subscribe to monthly unlimited access, so that I can use machines regularly without per-use payments.

#### Acceptance Criteria

1. WHEN a customer subscribes to Monthly_Subscription, THE Machine_Rental_System SHALL charge R$59.90 monthly via PIX_Payment
2. WHEN a Monthly_Subscription customer activates a machine, THE Machine_Rental_System SHALL verify they haven't exceeded their daily usage limit
3. WHEN a Monthly_Subscription customer has already used a machine today, THE Customer_Interface SHALL prevent activation and display the limitation
4. WHEN a Monthly_Subscription expires or fails to renew, THE Machine_Rental_System SHALL revert the customer to pay-per-use mode
5. WHEN displaying subscription status, THE Customer_Interface SHALL show renewal date and daily usage status

### Requirement 5

**User Story:** As a customer, I want to create and manage my account through multiple authentication methods, so that I can access the system conveniently and securely.

#### Acceptance Criteria

1. WHEN a customer chooses Google authentication, THE Machine_Rental_System SHALL integrate with Google OAuth for account creation and login
2. WHEN a customer chooses email registration, THE Machine_Rental_System SHALL require email address and password with validation
3. WHEN a customer logs in, THE Machine_Rental_System SHALL authenticate credentials and maintain session state
4. WHEN authentication fails, THE Customer_Interface SHALL display appropriate error messages without revealing system details
5. WHEN a customer accesses protected features, THE Machine_Rental_System SHALL verify authentication status before allowing access

### Requirement 6

**User Story:** As an administrator, I want to register and configure machines in the system, so that I can manage my machine inventory and locations.

#### Acceptance Criteria

1. WHEN an administrator registers a new machine, THE Admin_Dashboard SHALL require machine location, unique identifier, and controller assignment
2. WHEN a machine is registered, THE Machine_Rental_System SHALL generate a unique QR code and machine code for customer access
3. WHEN an administrator updates machine information, THE Machine_Rental_System SHALL validate changes and update the Machine_Registry
4. WHEN a machine is deactivated, THE Admin_Dashboard SHALL prevent new customer activations while preserving historical data
5. WHEN viewing machine registry, THE Admin_Dashboard SHALL display all registered machines with their current status and configuration

### Requirement 7

**User Story:** As an administrator, I want to monitor machine status and performance, so that I can ensure optimal operation and identify maintenance needs.

#### Acceptance Criteria

1. WHEN a Machine_Controller reports status, THE Machine_Rental_System SHALL update machine operational state, temperature, and usage hours
2. WHEN a machine reaches configured maintenance hours, THE Machine_Rental_System SHALL automatically set the machine to Maintenance_Mode
3. WHEN a machine enters Maintenance_Mode, THE Admin_Dashboard SHALL prevent customer activations and notify the administrator
4. WHEN viewing machine details, THE Admin_Dashboard SHALL display current status, total operating hours, temperature readings, and maintenance schedule
5. WHEN a machine stops responding, THE Machine_Rental_System SHALL mark it as offline and trigger administrator notifications

### Requirement 8

**User Story:** As an administrator, I want to configure machine operating parameters, so that I can control when and how machines operate.

#### Acceptance Criteria

1. WHEN an administrator sets operating hours, THE Machine_Rental_System SHALL prevent customer activations outside the specified time range
2. WHEN an administrator configures maintenance intervals, THE Machine_Rental_System SHALL automatically trigger Maintenance_Mode after the specified operating hours
3. WHEN an administrator completes maintenance, THE Admin_Dashboard SHALL allow resetting the machine to operational status
4. WHEN operating hours are active, THE Customer_Interface SHALL display machine availability according to the configured schedule
5. WHEN outside operating hours, THE Customer_Interface SHALL display the next available time for machine use

### Requirement 9

**User Story:** As an administrator, I want to view comprehensive system analytics, so that I can monitor business performance and make informed decisions.

#### Acceptance Criteria

1. WHEN accessing the dashboard, THE Admin_Dashboard SHALL display total machines, operational count, maintenance count, and current revenue
2. WHEN viewing financial reports, THE Admin_Dashboard SHALL generate revenue data per machine and system-wide totals
3. WHEN generating reports, THE Admin_Dashboard SHALL provide data export functionality using the administrator's template format
4. WHEN viewing usage analytics, THE Admin_Dashboard SHALL display total machine activations, peak usage times, and customer activity patterns
5. WHEN dashboard data updates, THE Admin_Dashboard SHALL refresh metrics in real-time without requiring page reload

### Requirement 10

**User Story:** As an administrator, I want to receive automated notifications for critical events, so that I can respond quickly to system issues.

#### Acceptance Criteria

1. WHEN a machine enters Maintenance_Mode, THE Machine_Rental_System SHALL send WhatsApp notification to the administrator
2. WHEN a machine goes offline unexpectedly, THE Machine_Rental_System SHALL immediately notify the administrator via WhatsApp
3. WHEN critical system errors occur, THE Machine_Rental_System SHALL generate appropriate notifications with error details
4. WHEN notifications are sent, THE Machine_Rental_System SHALL log the notification delivery status for audit purposes
5. WHEN multiple notifications occur rapidly, THE Machine_Rental_System SHALL implement rate limiting to prevent notification spam

### Requirement 11

**User Story:** As an administrator, I want to manage customer accounts and view usage history, so that I can provide customer support and track system usage.

#### Acceptance Criteria

1. WHEN an administrator searches for a customer, THE Admin_Dashboard SHALL allow lookup by customer ID and name
2. WHEN adding credits to a customer account, THE Admin_Dashboard SHALL require administrator authentication and update the Account_Balance immediately
3. WHEN viewing usage history, THE Admin_Dashboard SHALL display customer name, machine used, activation time, duration, and payment method
4. WHEN generating usage reports, THE Admin_Dashboard SHALL provide filtering by date range, machine, and customer
5. WHEN viewing customer details, THE Admin_Dashboard SHALL show current balance, subscription status, and recent activity

### Requirement 12

**User Story:** As the system, I want to integrate with IoT hardware components, so that I can remotely control machine operations.

#### Acceptance Criteria

1. WHEN a Usage_Session is activated, THE Machine_Rental_System SHALL send activation command to the designated Machine_Controller
2. WHEN a Machine_Controller receives activation command, THE Machine_Controller SHALL engage the relay module for the specified duration
3. WHEN the usage duration expires, THE Machine_Controller SHALL automatically disengage the relay and report completion
4. WHEN monitoring hardware status, THE Machine_Controller SHALL report temperature readings and operational status every 60 seconds
5. WHEN communication with Machine_Controller fails, THE Machine_Rental_System SHALL mark the machine as offline and prevent new activations