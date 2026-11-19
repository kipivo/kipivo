import { contract } from "@kipivo/api/contract";
import { implement } from "@orpc/server";
import type { AuthProcedureContext } from "./request";

const auth = implement(contract.auth).$context<AuthProcedureContext>();
type Call = {
  context: AuthProcedureContext;
  input: unknown;
  procedure: { "~orpc": { route: Parameters<AuthProcedureContext["callAuth"]>[0] } };
};
const forward = ({ context, input, procedure }: Call) =>
  context.callAuth(procedure["~orpc"].route, input);
async function command(call: Call) {
  // Sign-in and registration return raw tokens upstream. Only forward their HttpOnly cookies.
  await forward(call);
  return { ok: true as const };
}
async function json(call: Call) {
  return (await forward(call)).json();
}
export const authProcedures = auth.router({
  signUp: auth.signUp.handler(command),
  signIn: auth.signIn.handler(command),
  signInSocial: auth.signInSocial.handler(async ({ context, input, procedure }) => {
    const response = await forward({
      context,
      input: { ...input, disableRedirect: true },
      procedure,
    });
    const { url } = await response.json();
    return { url };
  }),
  signOut: auth.signOut.handler(command),
  getSession: auth.getSession.handler(json),
  emailMethods: auth.emailMethods.handler(json),
  socialMethods: auth.socialMethods.handler(json),
  sendMagicLink: auth.sendMagicLink.handler(command),
  sendEmailCode: auth.sendEmailCode.handler(command),
  signInWithCode: auth.signInWithCode.handler(command),
  requestPasswordReset: auth.requestPasswordReset.handler(command),
  resetPassword: auth.resetPassword.handler(command),
  native: {
    authorize: auth.native.authorize.handler(json),
    exchange: auth.native.exchange.handler(json),
  },
});
