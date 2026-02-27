# Changelog

## [August 14, 2025] - Recent Updates

### Fixed
- **Psychologist Creation**: Resolved validation errors for `hourlyRate` field by implementing proper string-to-number conversion in schema validation
- **Financial Transactions**: Fixed `amount` field validation errors that prevented saving financial records
- **Modal UI Issues**: Corrected visibility problems with "Save" buttons in financial transaction modals

### Enhanced
- **Modal Design**: Improved modal sizing and button visibility with:
  - Increased maximum height to 90% of viewport
  - Added proper padding and spacing
  - Made save buttons full-width and more prominent
  - Added visual separators for better UX

### Technical Changes
- Updated `shared/schema.ts` to handle string/number conversion for decimal fields
- Enhanced `client/src/pages/financial.tsx` modal components
- Improved form validation and error handling
- Maintained existing functionality while fixing critical bugs

### User Experience
- Psychologist profiles can now be created successfully for existing users
- Financial transactions (income/expenses) can be saved without validation errors
- All modal dialogs now display save buttons clearly
- Forms are more responsive and user-friendly

## System Status
- ✅ Authentication system working
- ✅ Psychologist management functional
- ✅ Financial tracking operational
- ✅ Room booking system active
- ✅ Appointment scheduling working
- 🔄 WhatsApp integration configured (requires API keys)
- 🔄 Google Calendar integration configured (requires OAuth setup)