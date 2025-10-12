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
  const [hasAccess, setHasAccess] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const latePassParam = searchParams.get("latePass");
    const invitationParam = searchParams.get("invitation");
    
    // Check existing latePass cookie
    const existingCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("ftc-late-pass="));
    
    const hasCookie = !!existingCookie;
    
    // Handle latePass parameter (existing logic)
    if (latePassParam) {
      // Set cookie for 24 hours
      const expires = new Date();
      expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000);
      document.cookie = `ftc-late-pass=${latePassParam}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
      
      // Clean URL by removing query parameter
      const newUrl = window.location.pathname;
      router.replace(newUrl);
      
      setHasAccess(true);
    } 
    // Handle invitation parameter - allow access and let server-side validation handle the rest
    else if (invitationParam) {
      // Set a temporary cookie to remember we had an invitation
      const expires = new Date();
      expires.setTime(expires.getTime() + 60 * 60 * 1000); // 1 hour
      document.cookie = `ftc-invitation-access=true; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
      
      // Clean URL by removing query parameter  
      const newUrl = window.location.pathname;
      router.replace(newUrl);
      
      setHasAccess(true);
    } 
    // Check existing latePass cookie
    else if (hasCookie) {
      setHasAccess(true);
    }
    // Check if we have invitation access cookie
    else if (document.cookie.includes("ftc-invitation-access=true")) {
      setHasAccess(true);
    }
    
    setIsChecking(false);
  }, [searchParams, router]);

  // Show loading state while checking access methods
  if (isChecking) {
    return <div>Loading...</div>;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}