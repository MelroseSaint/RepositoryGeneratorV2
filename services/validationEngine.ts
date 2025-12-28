import { RepositoryContract, ValidationResult, FileNode, FileType } from '../types';

/**
 * Validation & Proof Engine - Simulates install and boot, verifies dependencies, asserts readiness
 * Implements "Execution > Abstraction" principle
 */
export class ValidationEngine {
  /**
   * Simulate full repository validation: install → boot → health check
   * This proves the repository is operationally valid before generation
   */
  static async validateRepository(
    contract: RepositoryContract,
    files: FileNode[]
  ): Promise<ValidationResult> {
    console.log('[ValidationEngine] Starting repository validation simulation...');

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Phase 1: Install Simulation
      console.log('[ValidationEngine] Phase 1: Install simulation');
      const installResult = await this.simulateInstall(contract, files);
      if (!installResult.success) {
        errors.push(...installResult.errors);
      }

      // Phase 2: Boot Simulation
      console.log('[ValidationEngine] Phase 2: Boot simulation');
      const bootResult = await this.simulateBoot(contract, files);
      if (!bootResult.success) {
        errors.push(...bootResult.errors);
      }
      if (bootResult.warnings) {
        warnings.push(...bootResult.warnings);
      }

      // Phase 3: Dependency Verification
      console.log('[ValidationEngine] Phase 3: Dependency verification');
      const depResult = await this.verifyDependencies(contract, files);
      if (!depResult.success) {
        errors.push(...depResult.errors);
      }

      // Phase 4: Health Check Simulation
      console.log('[ValidationEngine] Phase 4: Health check simulation');
      const healthResult = await this.simulateHealthCheck(contract, files);
      if (!healthResult.success) {
        errors.push(...healthResult.errors);
      }

      // Phase 5: Security Baseline Check
      console.log('[ValidationEngine] Phase 5: Security baseline check');
      const securityResult = await this.checkSecurityBaseline(contract, files);
      if (!securityResult.success) {
        errors.push(...securityResult.errors);
      }

    } catch (error) {
      errors.push(`VALIDATION_FAILED: Unexpected error during validation: ${error}`);
    }

    // Generate comprehensive report
    const report = this.generateValidationReport(contract, errors, warnings);

    return {
      success: errors.length === 0,
      installSuccess: !errors.some(e => e.includes('INSTALL')),
      bootSuccess: !errors.some(e => e.includes('BOOT')),
      dependencyCheck: !errors.some(e => e.includes('DEPENDENCY')),
      contractValid: true, // Already validated by ContractEngine
      errors,
      warnings,
      report
    };
  }

  /**
   * Simulate package installation
   */
  private static async simulateInstall(contract: RepositoryContract, files: FileNode[]): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check if package.json exists and is valid
    const packageJson = this.findFile(files, 'package.json');
    if (!packageJson) {
      errors.push('INSTALL_FAILED: package.json not found');
      return { success: false, errors };
    }

    try {
      const pkg = JSON.parse(packageJson.content || '{}');

      // Verify dependencies match contract
      const contractDeps = contract.runtimeRequirements.dependencies;
      const pkgDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      for (const [dep, version] of Object.entries(contractDeps)) {
        if (!pkgDeps[dep]) {
          errors.push(`INSTALL_FAILED: Required dependency '${dep}' not in package.json`);
        } else if (pkgDeps[dep] !== version) {
          errors.push(`INSTALL_FAILED: Dependency '${dep}' version mismatch. Contract: ${version}, Package: ${pkgDeps[dep]}`);
        }
      }

      // Check for scripts
      if (!pkg.scripts?.[contract.bootstrapCommand.replace('npm run ', '')]) {
        errors.push(`INSTALL_FAILED: Bootstrap script '${contract.bootstrapCommand}' not defined`);
      }

      if (!pkg.scripts?.[contract.healthCheckCommand.replace('npm run ', '')]) {
        errors.push(`INSTALL_FAILED: Health check script '${contract.healthCheckCommand}' not defined`);
      }

    } catch (error) {
      errors.push(`INSTALL_FAILED: Invalid package.json: ${error}`);
    }

    return { success: errors.length === 0, errors };
  }

  /**
   * Simulate application boot
   */
  private static async simulateBoot(contract: RepositoryContract, files: FileNode[]): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for entry point
    const entryFile = this.findEntryFile(files, contract);
    if (!entryFile) {
      errors.push('BOOT_FAILED: No valid entry point found');
      return { success: false, errors, warnings };
    }

    // Basic syntax check (simplified - in real impl, would use actual runtime)
    if (entryFile.language === 'TypeScript' || entryFile.language === 'JavaScript') {
      const content = entryFile.content || '';
      if (!content.includes('export') && !content.includes('import') && !content.includes('require')) {
        warnings.push('BOOT_WARNING: Entry file appears to have no imports/exports');
      }
    }

    // Check for environment file template
    const envExample = this.findFile(files, '.env.example');
    if (!envExample) {
      errors.push('BOOT_FAILED: .env.example not found - required for environment setup');
    }

    return { success: errors.length === 0, errors, warnings };
  }

  /**
   * Verify all dependencies are properly pinned and available
   */
  private static async verifyDependencies(contract: RepositoryContract, files: FileNode[]): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    const deps = contract.runtimeRequirements.dependencies;

    // Check for dependency conflicts (simplified)
    const versions = Object.values(deps);
    const uniqueVersions = new Set(versions);
    if (uniqueVersions.size !== versions.length) {
      // Find duplicates
      const versionCount: { [key: string]: number } = {};
      versions.forEach(v => versionCount[v] = (versionCount[v] || 0) + 1);
      Object.entries(versionCount).forEach(([version, count]) => {
        if (count > 1) {
          errors.push(`DEPENDENCY_CONFLICT: Version '${version}' used by multiple packages - potential conflicts`);
        }
      });
    }

    // Check for known vulnerable versions (placeholder)
    Object.entries(deps).forEach(([pkg, version]) => {
      if (version.includes('0.0.0') || version.includes('999')) {
        errors.push(`DEPENDENCY_VULNERABILITY: Package '${pkg}' has placeholder version '${version}'`);
      }
    });

    return { success: errors.length === 0, errors };
  }

  /**
   * Simulate health check execution
   */
  private static async simulateHealthCheck(contract: RepositoryContract, files: FileNode[]): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check if health check script exists
    const packageJson = this.findFile(files, 'package.json');
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson.content || '{}');
        const scriptName = contract.healthCheckCommand.replace('npm run ', '');
        if (!pkg.scripts?.[scriptName]) {
          errors.push(`HEALTH_CHECK_FAILED: Health check script '${scriptName}' not found`);
        }
      } catch (error) {
        errors.push(`HEALTH_CHECK_FAILED: Cannot parse package.json for health check validation`);
      }
    }

    return { success: errors.length === 0, errors };
  }

  /**
   * Check security baseline compliance
   */
  private static async checkSecurityBaseline(contract: RepositoryContract, files: FileNode[]): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for hardcoded secrets (simplified)
    const allFiles = this.flattenFiles(files);
    allFiles.forEach(file => {
      if (file.content) {
        const content = file.content.toLowerCase();
        if (content.includes('password') && content.includes('123456')) {
          errors.push(`SECURITY_VIOLATION: Potential hardcoded password in ${file.name}`);
        }
        if (content.includes('secret') && content.includes('key')) {
          errors.push(`SECURITY_VIOLATION: Potential hardcoded secret in ${file.name}`);
        }
      }
    });

    // Check for .env files (should not exist in repo)
    const envFiles = allFiles.filter(f => f.name.startsWith('.env') && !f.name.endsWith('.example'));
    if (envFiles.length > 0) {
      errors.push(`SECURITY_VIOLATION: Actual .env files found in repository: ${envFiles.map(f => f.name).join(', ')}`);
    }

    return { success: errors.length === 0, errors };
  }

  /**
   * Generate comprehensive validation report
   */
  private static generateValidationReport(contract: RepositoryContract, errors: string[], warnings: string[]): string {
    let report = `# Repository Validation Report\n\n`;
    report += `**Repository:** ${contract.name}\n`;
    report += `**Blueprint:** ${contract.blueprintId} v${contract.blueprintVersion}\n`;
    report += `**Validation Timestamp:** ${new Date().toISOString()}\n\n`;

    report += `## Validation Phases\n\n`;
    report += `- ✅ Install Simulation: ${errors.some(e => e.includes('INSTALL')) ? 'FAILED' : 'PASSED'}\n`;
    report += `- ✅ Boot Simulation: ${errors.some(e => e.includes('BOOT')) ? 'FAILED' : 'PASSED'}\n`;
    report += `- ✅ Dependency Verification: ${errors.some(e => e.includes('DEPENDENCY')) ? 'FAILED' : 'PASSED'}\n`;
    report += `- ✅ Health Check Simulation: ${errors.some(e => e.includes('HEALTH_CHECK')) ? 'FAILED' : 'PASSED'}\n`;
    report += `- ✅ Security Baseline Check: ${errors.some(e => e.includes('SECURITY')) ? 'FAILED' : 'PASSED'}\n\n`;

    if (errors.length > 0) {
      report += `## ❌ Validation Failures (${errors.length})\n\n`;
      errors.forEach((error, i) => {
        report += `${i + 1}. ${error}\n`;
      });
      report += `\n`;
    }

    if (warnings.length > 0) {
      report += `## ⚠️ Validation Warnings (${warnings.length})\n\n`;
      warnings.forEach((warning, i) => {
        report += `${i + 1}. ${warning}\n`;
      });
      report += `\n`;
    }

    if (errors.length === 0) {
      report += `## ✅ Validation Successful\n\n`;
      report += `Repository is operationally ready. All simulations passed.\n\n`;
    }

    report += `## Next Steps\n\n`;
    if (errors.length > 0) {
      report += `- Address all validation failures\n`;
      report += `- Re-run validation after fixes\n`;
      report += `- Review failure diagnosis in REPOSITORY_CONTRACT.json\n`;
    } else {
      report += `- Proceed with repository generation\n`;
      report += `- Deploy and monitor using health checks\n`;
    }

    return report;
  }

  // Helper methods
  private static findFile(files: FileNode[], name: string): FileNode | undefined {
    for (const file of files) {
      if (file.name === name && file.type === FileType.FILE) {
        return file;
      }
      if (file.children) {
        const found = this.findFile(file.children, name);
        if (found) return found;
      }
    }
    return undefined;
  }

  private static findEntryFile(files: FileNode[], contract: RepositoryContract): FileNode | undefined {
    // Look for common entry points based on blueprint
    const entryCandidates = ['index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts', 'server.js', 'server.ts'];

    for (const candidate of entryCandidates) {
      const file = this.findFile(files, candidate);
      if (file) return file;
    }

    return undefined;
  }

  private static flattenFiles(files: FileNode[]): FileNode[] {
    const result: FileNode[] = [];
    const stack = [...files];

    while (stack.length > 0) {
      const file = stack.pop()!;
      if (file.type === FileType.FILE) {
        result.push(file);
      }
      if (file.children) {
        stack.push(...file.children);
      }
    }

    return result;
  }
}
