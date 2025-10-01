# Test Environment for UI/UX Development

## Purpose
This directory contains exact clones of production components for local testing and iteration before deploying changes.

## Workflow

### 1. Start Local Development Server
```bash
npm run dev -- -p 3001
```

### 2. Access Test Interface
Navigate to: `http://localhost:3001/test/chat`

### 3. Make UI/UX Changes
Edit the test component: `components/chat-interface-test.tsx`

Changes will hot-reload in your browser instantly.

### 4. Test Thoroughly
- Test all UI states (loading, errors, success)
- Test responsive design (mobile, tablet, desktop)
- Test dark mode
- Test edge cases (long text, many sources, etc.)

### 5. Apply to Production
Once satisfied:
1. Copy changes from `components/chat-interface-test.tsx`
2. Apply to `components/chat-interface.tsx`
3. Commit and deploy

## Components

### Chat Interface Test
- **Test File**: `components/chat-interface-test.tsx`
- **Production File**: `components/chat-interface.tsx`
- **Test URL**: `http://localhost:3001/test/chat`
- **Production URL**: `/dashboard/chat`

## Benefits
✅ Safe experimentation without affecting production  
✅ Instant hot-reload for rapid iteration  
✅ Visual yellow banner to avoid confusion  
✅ Easy navigation between test and live versions  
✅ Exact clone ensures no discrepancies  

## Notes
- Test files are NOT deployed to production
- All functionality is identical to production
- Uses same API endpoints and data
- Yellow banner indicates test mode

