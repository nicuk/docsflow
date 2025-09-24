'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// Using built-in SVG icons instead of heroicons to avoid dependency issues
import { motion } from 'framer-motion';

function DomainCreatedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const subdomain = searchParams.get('subdomain') || 'your-domain';
  const companyName = searchParams.get('company') || 'Your Company';

  useEffect(() => {
    // Check for dark mode preference
    const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(darkMode);

    // Store tenant info for success page
    localStorage.setItem('tenant_name', companyName);
    localStorage.setItem('tenant_subdomain', subdomain);
    
    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect to success page instead of directly to register
          router.push('/onboarding-success');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [subdomain]);

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94] as any,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as any }
    }
  };

  const pulseAnimation = {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: [0.42, 0, 0.58, 1] as any
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'
    }`}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 ${
          isDarkMode ? 'bg-blue-500' : 'bg-blue-200'
        }`} />
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20 ${
          isDarkMode ? 'bg-purple-500' : 'bg-purple-200'
        }`} />
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 ${
          isDarkMode ? 'bg-green-500' : 'bg-green-200'
        }`} />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-md w-full"
      >
        <div className={`rounded-2xl shadow-2xl p-8 backdrop-blur-sm border ${
          isDarkMode 
            ? 'bg-gray-800/80 border-gray-700' 
            : 'bg-white/80 border-gray-200'
        }`}>
          {/* Success Icon */}
          <motion.div
            variants={itemVariants}
            className="flex justify-center mb-6"
          >
            <motion.div
              animate={pulseAnimation}
              className={`p-4 rounded-full ${
                isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
              }`}
            >
              {/* Success Check Icon */}
              <svg className="w-16 h-16 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </motion.div>
          </motion.div>

          {/* Congratulations Text */}
          <motion.div variants={itemVariants} className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              {/* Sparkles Icon */}
              <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0V6H3a1 1 0 110-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 8.134a1 1 0 010 1.732L14.146 10.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 10.8 6.5 9.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd" />
              </svg>
              <h1 className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Congratulations!
              </h1>
              <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0V6H3a1 1 0 110-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 8.134a1 1 0 010 1.732L14.146 10.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 10.8 6.5 9.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd" />
              </svg>
            </div>
            <p className={`text-lg ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Your domain has been created successfully
            </p>
          </motion.div>

          {/* Domain Info */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <div className={`p-4 rounded-lg mb-4 ${
              isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
            }`}>
              <p className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Company
              </p>
              <p className={`text-lg font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {companyName}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>
                Your Custom Domain
              </p>
              <p className={`text-lg font-bold ${
                isDarkMode ? 'text-blue-300' : 'text-blue-700'
              }`}>
                {subdomain}.docsflow.app
              </p>
            </div>
          </motion.div>

          {/* Redirect Info */}
          <motion.div variants={itemVariants} className="text-center">
            <p className={`text-sm mb-4 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Redirecting you to complete your account setup...
            </p>
            
            {/* Countdown */}
            <div className="flex items-center justify-center gap-2">
              <motion.div
                key={countdown}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                  isDarkMode 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-blue-600 text-white'
                }`}
              >
                {countdown}
              </motion.div>
              <span className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                seconds
              </span>
            </div>

            {/* Manual redirect button */}
            <motion.button
              variants={itemVariants}
              onClick={() => router.push('/onboarding-success')}
              className={`mt-6 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
              }`}
            >
              Continue Now →
            </motion.button>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div variants={itemVariants} className="text-center mt-6">
          <p className={`text-xs ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            Powered by DocsFlow AI • Enterprise Document Intelligence
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function DomainCreatedPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DomainCreatedContent />
    </Suspense>
  );
}
