#!/usr/bin/env node

/**
 * Service Role Key Migration Script
 * Automatically migrates files from direct service role usage to secure patterns
 */

const fs = require('fs');
const path = require('path');

// Files that need service role migration
const filesToMigrate = [
  'app/api/documents/upload/route.ts',
  'app/api/chat/route.ts',
  'lib/rag-multimodal-parser.ts',
  'lib/hybrid-search.ts',
  'lib/deep-search.ts',
  'lib/rag-hybrid-reranker.ts',
  'lib/auth/admin-verification.ts',
  'app/api/documents/[id]/content/route.ts',
  'lib/api-tenant-validation.ts',
  'app/api/auth/logout/route.ts',
  'lib/tenant-context-manager.ts',
  'app/api/tenants/[tenantId]/route.ts',
  'app/api/documents/route.ts',
  'app/api/conversations/[id]/route.ts',
  'lib/rag-temporal-enhancement.ts',
  'lib/agentic-rag-enhancement.ts',
  'lib/subdomains.ts',
  'lib/api-tenant-validation-fixed.ts',
  'app/actions.ts',
  'lib/auth-helpers.ts',
  'app/api/invitations/request/route.ts',
  'app/api/company/[subdomain]/route.ts',
  'app/api/conversations/route.ts'
];

// Patterns to replace
const replacements = [
  {
    // Replace direct service client creation
    pattern: /const supabase = createClient\(\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL!?,\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY!?\s*\);?/g,
    replacement: `// SECURITY FIX: Use secure database service
import { SecureDocumentService, SecureTenantService, SecureUserService } from '@/lib/secure-database';
// Note: Update the function to use SecureDocumentService, SecureTenantService, or SecureUserService methods`
  },
  {
    // Replace function that creates service client
    pattern: /function getSupabaseClient\(\)\s*\{[\s\S]*?return createClient\([\s\S]*?process\.env\.SUPABASE_SERVICE_ROLE_KEY[\s\S]*?\);[\s\S]*?\}/g,
    replacement: `// SECURITY FIX: Use secure database service instead of direct service role
import { SecureDocumentService, SecureTenantService, SecureUserService } from '@/lib/secure-database';`
  },
  {
    // Replace service role key references
    pattern: /process\.env\.SUPABASE_SERVICE_ROLE_KEY/g,
    replacement: `/* SECURITY FIX: Migrated to secure backend service */`
  }
];

function migrateFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Apply replacements
    replacements.forEach(({ pattern, replacement }) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    });

    if (modified) {
      // Create backup
      const backupPath = `${filePath}.backup`;
      fs.writeFileSync(backupPath, fs.readFileSync(filePath));
      
      // Write modified content
      fs.writeFileSync(filePath, content);
      console.log(`✅ Migrated: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Error migrating ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔒 Starting Service Role Key Migration...\n');
  
  let migratedCount = 0;
  let totalCount = 0;

  filesToMigrate.forEach(filePath => {
    totalCount++;
    if (migrateFile(filePath)) {
      migratedCount++;
    }
  });

  console.log(`\n📊 Migration Summary:`);
  console.log(`   Files processed: ${totalCount}`);
  console.log(`   Files migrated: ${migratedCount}`);
  console.log(`   Files unchanged: ${totalCount - migratedCount}`);
  
  if (migratedCount > 0) {
    console.log(`\n⚠️  IMPORTANT: Manual review required!`);
    console.log(`   - Review migrated files for correct service usage`);
    console.log(`   - Update function calls to use SecureDocumentService methods`);
    console.log(`   - Test functionality after migration`);
    console.log(`   - Backup files saved with .backup extension`);
  }

  console.log(`\n✅ Migration complete!`);
}

if (require.main === module) {
  main();
}

module.exports = { migrateFile, replacements };
