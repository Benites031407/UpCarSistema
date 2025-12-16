# Maintenance Mode Feature

## Overview
Added a mobile-focused maintenance mode feature for admins to quickly put machines into maintenance and complete the maintenance process.

## Features

### 1. Maintenance Mode Button
- Located in the admin sidebar above the user info section
- Yellow button with wrench icon labeled "Modo de Manutenção"
- Always accessible from any admin tab

### 2. Machine Code Input Modal
- **Mobile-optimized design** with large touch targets
- Requests 6-digit machine code
- Real-time validation (numbers only, max 6 digits)
- Large centered input field for easy mobile typing
- Error messages for invalid codes or machines not found
- Cancel and Confirm buttons

### 3. Maintenance In Progress Modal
- **Mobile-optimized layout** with clear visual hierarchy
- Shows:
  - Machine code and location
  - Current operating hours vs maintenance limit
  - Visual progress bar (green/yellow/red based on usage)
  - Percentage of maintenance limit reached
- Two action buttons:
  - **Cancel**: Exits maintenance mode without changes
  - **Finalizar**: Completes maintenance and resets the machine

### 4. Automatic Machine Reset
When "Finalizar" is clicked:
- Resets operating hours to 0
- Clears any maintenance override
- Sets machine status back to "online"
- Updates last maintenance date
- Refreshes the admin dashboard
- Closes the modal automatically

## Backend Changes

### Updated Endpoint: GET /api/admin/machines
- Added optional query parameter: `?code=123456`
- Allows filtering machines by code
- Returns array with single machine if code matches
- Returns empty array if no match found

### Existing Endpoint Used: PATCH /api/admin/machines/:id/reset-maintenance
- Resets maintenance counter
- Clears override flags
- Sets machine to online
- Updates maintenance date

## Mobile Optimization

The feature is specifically designed for smartphone use:
- Large touch-friendly buttons (py-3 padding)
- Big input field with centered text
- Clear visual feedback
- Simple two-step process
- Full-screen modals with proper z-index
- Responsive design that works on all screen sizes

## User Flow

1. Admin clicks "Modo de Manutenção" in sidebar
2. Modal appears requesting machine code
3. Admin enters 6-digit code
4. System validates and sets machine to maintenance
5. Maintenance modal shows machine info and usage stats
6. Admin performs physical maintenance
7. Admin clicks "Finalizar" when done
8. Machine automatically resets and goes back online
9. Admin returns to normal dashboard view

## Files Modified

### Frontend
- `packages/frontend/src/components/admin/MaintenanceMode.tsx` (NEW)
  - Complete maintenance mode component
  - Code input modal
  - Maintenance in progress modal
  - API integration

- `packages/frontend/src/pages/AdminDashboardPage.tsx`
  - Added MaintenanceMode import
  - Added button to sidebar

### Backend
- `packages/backend/src/routes/admin.ts`
  - Updated GET /machines endpoint to support code filtering
  - Added query parameter validation

## Technical Details

### State Management
- Uses React Query for data fetching and mutations
- Local state for modal visibility and form data
- Automatic cache invalidation on mutations

### Error Handling
- Validation errors shown inline
- Network errors displayed in error boxes
- User-friendly Portuguese error messages

### Styling
- Tailwind CSS for responsive design
- Orange/yellow color scheme matching UpCar branding
- Smooth transitions and hover effects
- Shadow and gradient effects for depth
