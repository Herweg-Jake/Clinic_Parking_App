"use client";

import Link from "next/link";
import { useThemedClasses } from "./ThemedPage";

export function HelpFooter() {
  const { textMuted, textSecondary, link } = useThemedClasses();

  return (
    <div className={`mt-8 text-center text-sm ${textMuted}`}>
      <p>
        Questions or need help?{" "}
        <a
          href="mailto:nvptparking@gmail.com"
          className={`font-medium ${link}`}
        >
          nvptparking@gmail.com
        </a>
      </p>
      <p className="mt-2">
        <Link href="/terms" className={link}>
          Terms &amp; Conditions
        </Link>
        {" | "}
        <Link href="/terms#privacy" className={link}>
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
