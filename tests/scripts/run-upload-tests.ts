import { spawn } from 'child_process';
import path from 'path';

interface TestSuite {
  name: string;
  file: string;
  description: string;
  timeout?: number;
}

const testSuites: TestSuite[] = [
  {
    name: 'Upload Functionality',
    file: 'tests/e2e/local/document-upload.spec.ts',
    description: 'Basic upload functionality and UI tests',
    timeout: 300000 // 5 minutes
  },
  {
    name: 'File Format Support',
    file: 'tests/e2e/local/upload-file-formats.spec.ts',
    description: 'Tests for different file format uploads (PDF, Word, Excel, etc.)',
    timeout: 600000 // 10 minutes
  },
  {
    name: 'RAG Integration',
    file: 'tests/e2e/local/upload-rag-ai-integration.spec.ts',
    description: 'Tests for RAG processing and AI analysis of uploaded documents',
    timeout: 900000 // 15 minutes
  },
  {
    name: 'Comprehensive Tests',
    file: 'tests/e2e/local/upload-rag-ai-comprehensive.spec.ts',
    description: 'End-to-end comprehensive testing of the entire upload → RAG → AI flow',
    timeout: 1200000 // 20 minutes
  }
];

interface TestResult {
  suite: string;
  status: 'passed' | 'failed' | 'timeout' | 'error';
  duration: number;
  details?: string;
}

class UploadTestRunner {
  private results: TestResult[] = [];
  
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Upload and RAG Integration Test Suite');
    console.log('===============================================\n');
    
    for (const suite of testSuites) {
      await this.runTestSuite(suite);
    }
    
    this.printSummary();
  }
  
  async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`📋 Running ${suite.name}`);
    console.log(`   Description: ${suite.description}`);
    console.log(`   File: ${suite.file}`);
    console.log(`   Timeout: ${(suite.timeout || 300000) / 1000}s\n`);
    
    const startTime = Date.now();
    
    try {
      const result = await this.executePlaywrightTest(suite);
      const duration = Date.now() - startTime;
      
      this.results.push({
        suite: suite.name,
        status: result.success ? 'passed' : 'failed',
        duration,
        details: result.output
      });
      
      if (result.success) {
        console.log(`✅ ${suite.name} - PASSED (${duration}ms)\n`);
      } else {
        console.log(`❌ ${suite.name} - FAILED (${duration}ms)`);
        console.log(`   Error: ${result.error}\n`);
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        suite: suite.name,
        status: 'error',
        duration,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      
      console.log(`💥 ${suite.name} - ERROR (${duration}ms)`);
      console.log(`   Error: ${error}\n`);
    }
  }
  
  private executePlaywrightTest(suite: TestSuite): Promise<{success: boolean, output: string, error?: string}> {
    return new Promise((resolve) => {
      const playwrightProcess = spawn('npx', ['playwright', 'test', suite.file, '--reporter=line'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      
      playwrightProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      playwrightProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      // Set timeout
      const timeout = setTimeout(() => {
        playwrightProcess.kill('SIGTERM');
        resolve({
          success: false,
          output: output + errorOutput,
          error: 'Test timeout exceeded'
        });
      }, suite.timeout || 300000);
      
      playwrightProcess.on('close', (code) => {
        clearTimeout(timeout);
        resolve({
          success: code === 0,
          output: output + errorOutput,
          error: code !== 0 ? `Process exited with code ${code}` : undefined
        });
      });
      
      playwrightProcess.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          output: output + errorOutput,
          error: error.message
        });
      });
    });
  }
  
  private printSummary(): void {
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const errors = this.results.filter(r => r.status === 'error').length;
    const total = this.results.length;
    
    console.log(`Total Test Suites: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`💥 Errors: ${errors}`);
    
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';
    console.log(`📈 Success Rate: ${successRate}%\n`);
    
    // Detailed results
    console.log('📋 DETAILED RESULTS');
    console.log('===================');
    
    for (const result of this.results) {
      const statusIcon = result.status === 'passed' ? '✅' : 
                        result.status === 'failed' ? '❌' : '💥';
      const duration = `${result.duration}ms`;
      
      console.log(`${statusIcon} ${result.suite} - ${result.status.toUpperCase()} (${duration})`);
      
      if (result.details && result.status !== 'passed') {
        console.log(`   Details: ${result.details.substring(0, 200)}...`);
      }
    }
    
    console.log('\n🎯 RECOMMENDATIONS');
    console.log('==================');
    
    if (passed === total) {
      console.log('🎉 All tests passed! The upload and RAG integration is working correctly.');
      console.log('✅ File uploads are functioning properly');
      console.log('✅ RAG processing is working');
      console.log('✅ AI analysis is operational');
      console.log('✅ End-to-end workflow is successful');
    } else {
      console.log('⚠️  Some tests failed. Please review the following:');
      
      if (failed > 0) {
        console.log('🔧 Failed tests indicate functionality issues that need attention');
      }
      
      if (errors > 0) {
        console.log('💻 Error tests indicate infrastructure or configuration issues');
      }
      
      console.log('\n📝 Next Steps:');
      console.log('1. Review failed test details above');
      console.log('2. Check system logs for upload and processing errors');
      console.log('3. Verify AI service configuration and API keys');
      console.log('4. Test individual components manually');
      console.log('5. Re-run specific failed test suites');
    }
    
    console.log('\n🔍 INDIVIDUAL TEST COMMANDS');
    console.log('===========================');
    
    for (const suite of testSuites) {
      console.log(`# ${suite.name}`);
      console.log(`npx playwright test ${suite.file} --headed --reporter=line\n`);
    }
  }
}

// Main execution
async function main() {
  const runner = new UploadTestRunner();
  await runner.runAllTests();
}

// Check if this script is being run directly
if (require.main === module) {
  main().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { UploadTestRunner, testSuites };
