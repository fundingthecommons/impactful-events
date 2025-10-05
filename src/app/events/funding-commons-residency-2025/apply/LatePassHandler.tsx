"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface LatePassHandlerProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

export default function LatePassHandler({ children, fallback }: LatePassHandlerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [hasLatePass, setHasLatePass] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const latePassParam = searchParams.get("latePass");
    
    // Check existing cookie
    const existingCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("ftc-late-pass="));
    
    const hasCookie = !!existingCookie;
    
    // If query parameter exists, set cookie and clean URL
    if (latePassParam) {
      // Set cookie for 24 hours
      const expires = new Date();
      expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000);
      document.cookie = `ftc-late-pass=${latePassParam}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
      
      // Clean URL by removing query parameter
      const newUrl = window.location.pathname;
      router.replace(newUrl);
      
      setHasLatePass(true);
    } else if (hasCookie) {
      setHasLatePass(true);
    }
    
    setIsChecking(false);
  }, [searchParams, router]);

  // Show loading state briefly while checking
  if (isChecking) {
    return <div>Loading...</div>;
  }

  return hasLatePass ? <>{children}</> : <>{fallback}</>;
}