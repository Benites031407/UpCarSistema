# Policy Pages Update Summary

## Changes Made

### 1. WhatsApp Number Updated
- Changed from placeholder `5500000000000` to `5511948580070`
- Updated in both `HomePage.tsx` and `MachineActivationPage.tsx`

### 2. Created HTML Policy Pages
Instead of PDF files, created React components for better mobile experience:

#### Files Created:
- `packages/frontend/src/pages/TermsAndConditionsPage.tsx`
- `packages/frontend/src/pages/PrivacyPolicyPage.tsx`

#### Features:
- Mobile-optimized responsive design
- Consistent styling with the rest of the app
- Orange theme matching brand colors
- Back button to return to home
- Sticky header with logo
- Clean, readable typography
- Internal links between policy pages

### 3. Updated Navigation
- Changed sidebar links from PDF downloads to internal navigation
- Links now use `navigate()` instead of `<a>` tags for PDFs
- Routes added to `App.tsx`:
  - `/termos-e-condicoes` → Terms and Conditions page
  - `/politica-de-privacidade` → Privacy Policy page

### 4. Removed Old Files
- Deleted `packages/frontend/public/termos-e-condicoes.md`
- Deleted `packages/frontend/public/politica-de-privacidade.md`

## Placeholders to Update

The following placeholders still need to be replaced with actual information:

### In Both Pages:
- `[DATA]` - Current date (e.g., "13 de dezembro de 2024")
- `[EMAIL]` - Support email address

### In Privacy Policy Page Only:
- `[EMAIL_DPO]` - Data Protection Officer email

## Testing

To test the changes:
1. Navigate to the home page
2. Open the sidebar
3. Click "Termos e Condições" or "Política de Privacidade"
4. Verify the pages load correctly
5. Test the WhatsApp link (should open WhatsApp with number +55 11 94858-0070)
6. Test the back button

## Benefits of HTML Pages vs PDFs

1. **Better Mobile Experience**: Pages are responsive and scroll naturally
2. **Faster Loading**: No PDF download required
3. **Better SEO**: Search engines can index the content
4. **Easier Updates**: Just edit the React component
5. **Consistent Branding**: Matches the app's design
6. **Internal Navigation**: Links between pages work seamlessly
7. **Accessibility**: Better screen reader support
