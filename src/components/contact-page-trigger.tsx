"use client";

import { useEffect } from "react";
import { openContactModal } from "@/lib/open-contact-modal";

export function ContactPageTrigger() {
  useEffect(() => {
    openContactModal();
  }, []);

  return null;
}
