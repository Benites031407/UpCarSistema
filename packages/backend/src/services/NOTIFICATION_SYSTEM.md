# Notification System

The notification system provides WhatsApp Business API integration for sending automated notifications to administrators about critical system events.

## Features

### Core Functionality
- **WhatsApp Business API Integration**: Sends notifications via WhatsApp to administrators
- **Rate Limiting**: Prevents notification spam with configurable limits (default: 10 per hour)
- **Audit Trail**: Logs all notification attempts with delivery status
- **Retry Mechanism**: Automatically retries failed notifications
- **Graceful Degradation**: Falls back to logging when WhatsApp is not configured

### Notification Types
1. **Maintenance Required**: Triggered when machines reach maintenance intervals
2. **Machine Offline**: Sent when machines stop responding to heartbeats
3. **System Errors**: Critical system errors and exceptions
4. **Temperature Alerts**: High temperature warnings for machine safety

## Configuration

Set the following environment variables:

```bash
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
ADMIN_PHONE=+5511999999999
```

## Usage

### Service Integration

```typescript
import { notificationService } from './services/notificationService.js';

// Send maintenance notification
await notificationService.sendMaintenanceNotification(
  'machine-id',
  'M001',
  'Factory Floor',
  'Scheduled maintenance required'
);

// Send offline notification
await notificationService.sendOfflineNotification(
  'machine-id',
  'M001',
  'Factory Floor',
  lastHeartbeat
);

// Send system error notification
await notificationService.sendSystemErrorNotification(
  'Database connection failed',
  'Connection timeout after 30 seconds'
);
```

### API Endpoints

#### GET /api/notifications/stats
Returns notification statistics including total, sent, failed, and pending counts.

#### GET /api/notifications/recent?limit=50
Returns recent notifications with optional limit parameter.

#### POST /api/notifications/retry-failed
Retries all failed notifications.

#### POST /api/notifications/test
Sends a test notification (admin only).

## Rate Limiting

The system implements rate limiting to prevent notification spam:
- Maximum 10 notifications per hour per type
- Rate limit resets every hour
- Exceeded notifications are marked as failed

## Error Handling

- **WhatsApp API Failures**: Marked as failed, eligible for retry
- **Network Timeouts**: Automatic retry with exponential backoff
- **Configuration Missing**: Falls back to logging mode
- **Database Errors**: Graceful degradation without system failure

## Monitoring

### Statistics
- Total notifications sent
- Success/failure rates
- Notifications by type
- Recent notification history

### Scheduled Tasks
- Failed notification retry: Every 15 minutes
- Offline machine detection: Every 2 minutes

## Testing

The notification system includes comprehensive unit tests covering:
- WhatsApp API integration
- Rate limiting functionality
- Error handling scenarios
- Configuration validation
- Message formatting

Run tests with:
```bash
npm test src/services/notificationService.test.ts
```

## Integration Points

### Machine Service
- Maintenance mode triggers
- Offline detection
- Temperature monitoring

### Scheduler Service
- Periodic retry of failed notifications
- Regular offline machine checks

### Admin Dashboard
- Notification statistics display
- Manual notification retry
- Test notification sending

## Security

- Admin-only API endpoints
- Input validation on all parameters
- Rate limiting to prevent abuse
- Secure WhatsApp API token handling