/**
 * Registration redirect handler.
 * Ensures proper redirect flow after registration.
 */

interface RegistrationResult {
  success: boolean;
  shouldRedirect: boolean;
  redirectUrl: string;
  message?: string;
  userContext?: {
    email: string;
    needsOnboarding: boolean;
    hasTenant: boolean;
  };
}

export class RegistrationRedirectHandler {
  
  /**
   * Determines the appropriate redirect after successful registration
   */
  static determineRedirect(
    email: string, 
    registrationResponse: any
  ): RegistrationResult {
    try {
      // Check if user already has tenant context
      const hasTenant = registrationResponse?.user?.tenant_id || 
                       registrationResponse?.tenant_id ||
                       false;
      
      // Check if onboarding is completed
      const onboardingComplete = registrationResponse?.user?.onboarding_complete ||
                                 registrationResponse?.onboarding_complete ||
                                 false;
      
      // Determine redirect based on user state
      if (hasTenant && onboardingComplete) {
        // User has tenant and completed onboarding - go to workspace selection
        return {
          success: true,
          shouldRedirect: true,
          redirectUrl: '/select-workspace',
          message: 'Account created. Redirecting to workspace...',
          userContext: {
            email,
            needsOnboarding: false,
            hasTenant: true
          }
        };
      } else if (hasTenant && !onboardingComplete) {
        // User has tenant but needs to complete onboarding
        return {
          success: true,
          shouldRedirect: true,
          redirectUrl: '/onboarding',
          message: 'Account created. Complete your setup...',
          userContext: {
            email,
            needsOnboarding: true,
            hasTenant: true
          }
        };
      } else {
        // New user without tenant - go to onboarding to create or join tenant
        return {
          success: true,
          shouldRedirect: true,
          redirectUrl: '/onboarding',
          message: 'Account created. Setting up your workspace...',
          userContext: {
            email,
            needsOnboarding: true,
            hasTenant: false
          }
        };
      }
      
    } catch (error) {
      console.error('Registration redirect determination error:', error);
      // Fallback to onboarding
      return {
        success: true,
        shouldRedirect: true,
        redirectUrl: '/onboarding',
        message: 'Account created. Redirecting to setup...',
        userContext: {
          email,
          needsOnboarding: true,
          hasTenant: false
        }
      };
    }
  }
  
  /**
   * Executes the redirect with proper user context storage
   */
  static executeRedirect(redirectResult: RegistrationResult): void {
    if (!redirectResult.shouldRedirect) {
      return;
    }
    
    // Store user context for the destination page
    if (redirectResult.userContext) {
      localStorage.setItem('registration-context', JSON.stringify({
        email: redirectResult.userContext.email,
        timestamp: Date.now(),
        needsOnboarding: redirectResult.userContext.needsOnboarding,
        hasTenant: redirectResult.userContext.hasTenant
      }));
      
      // Also set legacy storage for backward compatibility
      localStorage.setItem('user-email', redirectResult.userContext.email);
    }
    
    // Execute redirect
    console.log(`🔄 [REGISTRATION] Redirecting to: ${redirectResult.redirectUrl}`);
    window.location.href = redirectResult.redirectUrl;
  }
  
  /**
   * Gets stored registration context from localStorage
   */
  static getRegistrationContext(): any {
    try {
      const context = localStorage.getItem('registration-context');
      if (context) {
        const parsed = JSON.parse(context);
        
        // Check if context is recent (within 10 minutes)
        const isRecent = (Date.now() - parsed.timestamp) < 10 * 60 * 1000;
        
        if (isRecent) {
          return parsed;
        } else {
          // Clean up old context
          localStorage.removeItem('registration-context');
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to get registration context:', error);
      return null;
    }
  }
  
  /**
   * Clears registration context after successful use
   */
  static clearRegistrationContext(): void {
    localStorage.removeItem('registration-context');
  }
  
  /**
   * Enhanced redirect with loading state and error handling
   */
  static redirectWithFeedback(
    redirectResult: RegistrationResult,
    setLoading?: (loading: boolean) => void,
    setMessage?: (message: string) => void
  ): void {
    if (setMessage && redirectResult.message) {
      setMessage(redirectResult.message);
    }
    
    if (setLoading) {
      setLoading(true);
    }
    
    // Store context first
    if (redirectResult.userContext) {
      localStorage.setItem('registration-context', JSON.stringify({
        email: redirectResult.userContext.email,
        timestamp: Date.now(),
        needsOnboarding: redirectResult.userContext.needsOnboarding,
        hasTenant: redirectResult.userContext.hasTenant
      }));
      
      localStorage.setItem('user-email', redirectResult.userContext.email);
    }
    
    // Redirect after short delay for UX
    setTimeout(() => {
      console.log(`🔄 [REGISTRATION] Executing redirect to: ${redirectResult.redirectUrl}`);
      window.location.href = redirectResult.redirectUrl;
    }, 1500);
  }
}




