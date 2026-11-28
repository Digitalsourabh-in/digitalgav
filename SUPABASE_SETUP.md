# Digital Gav — Supabase setup

Supabase will provide authentication and database storage for the admin and sub-admin dashboard.

## Roles
- Super Admin: create villages, assign users, manage all village data and publish.
- Village Admin: manage the assigned village.
- Sub-admin: edit the assigned village; cannot publish pages.
- Public visitors: read only published village content.

## Setup
1. Create a project at https://supabase.com/dashboard.
2. Open Project Settings → API and copy the Project URL and publishable/anon key.
3. Open SQL Editor and run the complete file supabase/schema.sql.
4. In Authentication → Users, create your own account and copy its UUID.
5. Run the final commented UPDATE statement in schema.sql after replacing YOUR_AUTH_USER_UUID with your UUID. This makes your account the first super-admin.
6. Send me the Project URL and publishable/anon key so I can connect the dashboard.

Never share the database password or service_role/secret key. Never put the service-role key in browser code or GitHub. Row Level Security is enabled so village access is enforced in the database.

After connection, I will build login, role-based dashboard, village selection, Marathi edit forms, draft/publish workflow, and connect published data to village pages.
