import { NextResponse } from "next/server";
import { ValidationErrors } from "@/lib/validation-errors";

export function jsonResponse(
  body: object,
  status: number,
  extraHeaders?: HeadersInit
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export function serviceUnavailableResponse() {
  return jsonResponse({ error: ValidationErrors.serviceUnavailable }, 503);
}

export function sendFailedResponse() {
  return jsonResponse({ error: ValidationErrors.sendFailed }, 502);
}
