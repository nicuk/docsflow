import Link from 'next/link';
import { SubdomainForm } from './subdomain-form';
import { rootDomain } from '@/lib/utils';

export default async function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4 relative">
      <div className="absolute top-4 right-4">
        <Link
          href="/admin"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Admin
        </Link>
      </div>

      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {rootDomain}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Set up enterprise AI document intelligence for your organization
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-4">
          <SubdomainForm />
        </div>

        <div className="text-center text-xs text-gray-500">
          <p>Already have an account? <Link href="/login" className="text-blue-600 hover:text-blue-500">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
