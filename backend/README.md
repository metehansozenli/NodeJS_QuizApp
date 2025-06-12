# Real-Time Quiz App Backend

This is the backend for a real-time quiz application built with Node.js, Express.js, PostgreSQL, JWT authentication, and Socket.io.

## Features
- User authentication (register, login, JWT-based auth)
- Quiz creation and management
- Real-time game sessions
- Answer submission and scoreboards
- Admin dashboard
- Quiz history
- Multimedia support

## Setup
1. Clone the repository.
2. Install dependencies: `npm install`
3. Configure the `.env` file with your database and application settings.
4. Start the server: `npm start`.

## Folder Structure
Refer to the project structure in the documentation for details.

## Token Helper Module

The `utils/tokenHelper.js` module centralizes JWT token operations. It provides the following functions:

- `generateToken(payload, options)`: Generates a JWT token with the given payload and options.
- `verifyToken(token)`: Verifies and decodes a JWT token.

### Usage

Import the module and use the provided functions for token-related operations:

```javascript
const tokenHelper = require('./utils/tokenHelper');

// Generate a token
const token = tokenHelper.generateToken({ id: 1, username: 'testuser' });

// Verify a token
const decoded = tokenHelper.verifyToken(token);
```

This ensures consistent and secure handling of JWT tokens across the application.
