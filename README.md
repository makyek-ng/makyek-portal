## Add User

```bash
npm run cli -- DI.models.User.createUserAsync {username} {password} {student_id} {real_name} {role}
```

Roles can be: `admin` / `mod` / `student`

## Reset User Password

```bash
npm run cli -- DI.models.User.setUserPasswordAsync {username} {new_password}
```

## Update User Role

```bash
npm run cli -- DI.models.User.setUserRoleAsync {username} {new_role}
```
