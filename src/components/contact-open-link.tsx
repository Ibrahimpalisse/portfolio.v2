"use client";

import { Link } from "@/i18n/navigation";
import { openContactModal } from "@/lib/open-contact-modal";
import { homeAnchors, routes } from "@/lib/routes";

type ContactOpenLinkProps = {
  children: React.ReactNode;
  className?: string;
  onOpen?: () => void;
};

export function ContactOpenLink({
  children,
  className,
  onOpen,
}: ContactOpenLinkProps) {
  return (
    <Link
      href={`${routes.home}${homeAnchors.contact}`}
      className={className}
      onClick={(e) => {
        openContactModal(e);
        onOpen?.();
      }}
    >
      {children}
    </Link>
  );
}
