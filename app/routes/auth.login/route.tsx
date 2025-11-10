import type { LoaderFunctionArgs } from "@remix-run/node";
import { login } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw await login(request);
  }

  return new Response("Missing shop parameter", { status: 400 });
};
