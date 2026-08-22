# Restore admin archive controls

## What will change

- Add the missing database grants on the existing `matches` table so signed-in requests can reach it.
- Keep the current row-level rules unchanged: all signed-in users may read fixtures, while only admins may create, edit, reopen, or delete them.
- Preserve the existing archive controls and confirmation steps for admin override, reopen, edit, and delete.

## Verification

- Confirm the final table grants and admin policies are both active.
- Test an archived fixture from the admin page: unlock it, edit its details, reopen it, and delete a disposable test fixture.
- Check the latest build and runtime diagnostics for errors.

## Technical details

The current admin UI already issues the correct update and delete operations, and the database already has admin-only row policies plus an admin-aware started-fixture trigger. The live `matches` table has no explicit grants for the signed-in role, so requests are rejected before those policies can authorize the admin. The migration will grant read/create/edit/delete access at the table layer; the existing row policies remain the security boundary.
