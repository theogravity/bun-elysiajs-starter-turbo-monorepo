import { t } from "elysia";

export const UserSchema = t.Object({
  id: t.String({
    description: "ID of the user",
    format: "uuid",
  }),
  givenName: t.String({
    description: "Given name of the user",
  }),
  familyName: t.String({
    description: "Family name of the user",
  }),
});

export type User = typeof UserSchema.static;
