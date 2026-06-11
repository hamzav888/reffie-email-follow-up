"use client";

import { useState } from "react";

type EmailType = "discovery" | "demo";

interface EmailTypeToggleProps {
  initialType?: EmailType;
  externalType?: EmailType;
  onTypeChange?: (type: EmailType) => void;
}

export default function EmailTypeToggle({
  initialType = "discovery",
  externalType,
  onTypeChange,
}: EmailTypeToggleProps) {
  const [internalType, setInternalType] = useState<EmailType>(
    externalType ?? initialType
  );

  // externalType takes precedence when set (post-classification); internal state
  // is the fallback when the component is used without a parent managing state.
  const displayType = externalType ?? internalType;

  function handleSelect(type: EmailType) {
    setInternalType(type);
    onTypeChange?.(type);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleSelect("discovery")}
        className={`rounded-[100px] px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
          displayType === "discovery"
            ? "bg-[#10BD91] text-white"
            : "bg-white border border-[#10BD91] text-[#10BD91] hover:bg-[#10BD91]/10"
        }`}
      >
        Discovery Call
      </button>
      <button
        onClick={() => handleSelect("demo")}
        className={`rounded-[100px] px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
          displayType === "demo"
            ? "bg-[#10BD91] text-white"
            : "bg-white border border-[#10BD91] text-[#10BD91] hover:bg-[#10BD91]/10"
        }`}
      >
        Demo
      </button>
    </div>
  );
}
