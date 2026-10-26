# Secure Role-Based AICTE Document Verification Portal

## Roles
- COLLEGE_ADMIN, COLLEGE_STAFF
- REVIEW_OFFICER, SENIOR_OFFICER
- SYSTEM_ADMIN

## Setup
1. Copy .env.example to .env.local
2. Set MONGODB_URI, JWT_SECRET
3. npm install
4. npm run dev

## Auth
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

## Admin
- POST /api/institutions
- POST /api/invitations
- POST /api/invitations/redeem
- GET /api/admin/users
- GET /api/admin/audit

## Portals
- /login
- /college/dashboard
- /officer/dashboard
