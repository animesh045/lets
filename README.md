# Workshop Registration & Turn Assignment (Express)

A minimal, no-build Node.js app for workshop registration. Students can register by name. Admin can close registrations and assign turn numbers.

## Features
- Public registration form (name only)
- Admin login with a simple PIN
- Open/close registrations
- Assign turn numbers in order of registration
- Export CSV of all students

## Quick Start
1. **Install Node.js 18+** (https://nodejs.org/)
2. **Download this folder**, then in the project directory run:
   ```bash
   npm install
   npm start
   ```
3. Open http://localhost:3000

### Admin
- Create a `.env` file (copy `.env.example`) and set your PIN:
  ```env
  ADMIN_PIN=your-secret-pin
  PORT=3000
  ```
- Go to http://localhost:3000/admin, enter the PIN.
- Use the buttons to open/close registrations and assign turn numbers.
- Export CSV via the **Export CSV** link.

### Data Storage
- Data is saved to `data/db.json`. It is created automatically on first run.
- To reset, stop the server and delete `data/db.json`.

### Notes
- This app is intentionally simple (no users/emails). For production, add real auth (e.g., NextAuth/Auth0), validation, and rate limiting.
# Sunshine-Workshop
# Sunshine-Workshop
