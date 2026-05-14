# Installation — Login admin interne

Objectif : remplacer l'accès admin Kimi par un login interne `/admin/login` avec email + mot de passe.

## 1) Copier les nouveaux fichiers

Copier :

- `api/admin-auth-router.ts` vers `app/api/admin-auth-router.ts`
- `src/pages/AdminLogin.tsx` vers `app/src/pages/AdminLogin.tsx`
- `scripts/create-admin.ts` vers `app/scripts/create-admin.ts`

## 2) Installer bcryptjs si nécessaire

Dans `app` :

```powershell
npm install bcryptjs jsonwebtoken
npm install -D tsx
```

## 3) Modifier `db/schema.ts`

Dans l'import Drizzle, garder/ajouter :

```ts
int, varchar, timestamp, boolean, mysqlEnum
```

Ajouter cette table dans `db/schema.ts` :

```ts
export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  role: mysqlEnum("adminRole", ["admin", "super_admin"]).default("admin").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;
```

## 4) Modifier `api/context.ts`

Il faut que `ctx.user` soit alimenté depuis le cookie `admin_token`.

Ajouter ces imports :

```ts
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { getDb } from "./queries/connection";
import { adminUsers } from "@db/schema";
```

Ajouter ces helpers :

```ts
function readCookie(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const found = cookies.find((c) => c.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

async function getInternalAdminFromRequest(req: Request) {
  const token = readCookie(req.headers.get("cookie"), "admin_token");
  if (!token) return null;

  try {
    const secret = process.env.APP_SECRET;
    if (!secret) return null;

    const payload = jwt.verify(token, secret) as {
      type?: string;
      id?: number;
      email?: string;
      role?: string;
    };

    if (payload.type !== "admin" || !payload.id) return null;

    const db = getDb();
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, payload.id))
      .limit(1);

    if (!admin || !admin.isActive) return null;

    return {
      id: admin.id,
      unionId: `internal-admin-${admin.id}`,
      name: admin.name,
      email: admin.email,
      avatar: null,
      role: "admin" as const,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      lastSignInAt: new Date(),
    };
  } catch {
    return null;
  }
}
```

Dans `createContext`, avant de retourner le contexte, faire :

```ts
const internalAdmin = await getInternalAdminFromRequest(req);
if (internalAdmin) {
  return {
    user: internalAdmin,
    resHeaders,
  };
}
```

Puis garder l'ancien retour Kimi si tu veux encore supporter Kimi Auth.

## 5) Modifier `api/router.ts`

Ajouter :

```ts
import { adminAuthRouter } from "./admin-auth-router";
```

Dans `appRouter` ajouter :

```ts
adminAuth: adminAuthRouter,
```

Exemple :

```ts
export const appRouter = createRouter({
  auth: authRouter,
  adminAuth: adminAuthRouter,
  admin: adminRouter,
  candidateAuth: candidateAuthRouter,
  editions: editionsRouter,
  contact: contactRouter,
  newsletter: newsletterRouter,
  upload: uploadRouter,
});
```

## 6) Modifier `src/App.tsx`

Ajouter :

```ts
import AdminLogin from "./pages/AdminLogin";
```

Ajouter la route :

```tsx
<Route path="/admin/login" element={<AdminLogin />} />
```

## 7) Modifier `AdminDashboard.tsx`

Remplacer l'ancien `useAuth({ redirectOnUnauthenticated: true })` si besoin.

Solution simple : si l'appel `trpc.admin.stats.useQuery` retourne une erreur 401/403, afficher un bouton vers `/admin/login`.

Ne pas afficher "Sign in with Kimi" dans cette page.

## 8) Ajouter les scripts dans `package.json`

Dans `scripts` :

```json
"db:seed": "tsx db/seed.ts",
"admin:create": "tsx scripts/create-admin.ts"
```

## 9) Mettre à jour `.env` local

Ajouter :

```env
APP_SECRET=local-dev-secret-change-me
ADMIN_EMAIL=admin@local.test
ADMIN_PASSWORD=Admin12345!
ADMIN_NAME=Admin Local
```

En production, utiliser un mot de passe fort et une vraie valeur APP_SECRET.

## 10) Créer la table et le premier admin

Si `npm run db:push` veut tronquer les éditions, ne pas accepter. Créer la table manuellement dans phpMyAdmin :

```sql
CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(320) NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  adminRole ENUM('admin','super_admin') NOT NULL DEFAULT 'admin',
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

Puis lancer :

```powershell
npm run admin:create
```

## 11) Tester

```powershell
npm run dev
```

Ouvrir :

```txt
http://localhost:3000/admin/login
```

Se connecter avec `ADMIN_EMAIL` et `ADMIN_PASSWORD`.
