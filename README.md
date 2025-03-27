
## Environment Setup

Before running the application, you need to set up your environment variables:

1. Copy the example environment files:
   ```bash
   cp .env.example .env              # Main application
   cp admin/api/.env.example admin/api/.env    # Admin API
   cp admin/.env.example admin/.env  # Admin Frontend
   ```

2. Update each .env file with your actual values:
   - Database credentials
   - JWT secrets
   - OAuth credentials
   - API endpoints

3. Important Security Notes:
   - Never commit .env files to the repository
   - Generate strong secrets for JWT_SECRET and JWT_REFRESH_SECRET
   - Keep your Google OAuth credentials secure
   - Use strong database passwords

## Development Setup

1. Install dependencies:
   ```bash
   npm install              # Main application
   cd admin/api && npm install    # Admin API
   cd admin && npm install  # Admin Frontend
   ```

2. Start the development servers:
   ```bash
   npm run dev             # Main application
   cd admin/api && npm run dev   # Admin API
   cd admin && npm run dev # Admin Frontend
   ```
