export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift();
  }
  
  return undefined;
}

export function setCookie(name: string, value: string, days: number = 7) {
  if (typeof document === "undefined") return;
  
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

export function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
}

export function setAuthCookies(accessToken: string, refreshToken: string, email: string) {
  if (typeof document === "undefined") return;
  
  // Set auth cookies with proper expiration
  setCookie("auth-token", accessToken, 7);
  setCookie("refresh-token", refreshToken, 7);
  setCookie("user-email", email, 7);
  setCookie("onboarding-complete", "false", 7);
  
}

export function clearAuthCookies() {
  if (typeof document === "undefined") return;
  
  deleteCookie("auth-token");
  deleteCookie("refresh-token");
  deleteCookie("user-email");
  deleteCookie("onboarding-complete");
  
}

export function getAuthState() {
  if (typeof document === "undefined") return { isAuthenticated: false };
  
  const authToken = getCookie("auth-token");
  const userEmail = getCookie("user-email");
  const onboardingComplete = getCookie("onboarding-complete") === "true";
  
  return {
    isAuthenticated: !!authToken,
    authToken,
    userEmail,
    onboardingComplete,
  };
}
