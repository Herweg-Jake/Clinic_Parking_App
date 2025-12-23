"use client";

import { useState } from "react";

export function Logo() {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return null;
  }

  return (
    <img
      src="/logo.png"
      alt="Nevada Physical Therapy"
      className="h-auto w-auto max-w-[280px] sm:max-w-[350px]"
      onError={() => setHasError(true)}
    />
  );
}
