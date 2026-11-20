/* apps/desktop/src/account/forms.ts */

import { TRPCClientError } from '@trpc/client';
import { passwordSchema } from '@chessbox/shared';

export const UNREACHABLE = "Can't reach the ChessBox server. Check Tailscale is connected and try again.";

/** what's wrong with a new password before it's sent, or null; the same rules the server applies */
export function newPasswordError(next: string, confirm: string): string | null {
  const parsed = passwordSchema.safeParse(next);
  if (!parsed.success) return parsed.error.issues[0].message;
  return next === confirm ? null : "The new passwords don't match.";
}

/** the message to show for a failed account call */
export function accountError(err: unknown, fallback: string): string {
  if (!(err instanceof TRPCClientError)) return fallback;
  // the server answered: its message is already written for people (the API's error formatter)
  if (err.data?.code) return err.message;
  // no answer at all: the Pi is off or Tailscale is down
  return UNREACHABLE;
}
