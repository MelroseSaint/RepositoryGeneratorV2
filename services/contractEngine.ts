import { RepositoryContract, RepoConfig } from '../types';

/**
 * Contract Engine - Defines mandatory existence, validates completeness, blocks generation on violation
 * Implements "No defaults, no optionals" principle
 */
export class ContractEngine {
  /**
   * Validate repository contract completeness
   * Blocks generation if contract is incomplete
   */
  static validateContract(contract: RepositoryContract): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Mandatory fields - no defaults allowed
    if (!contract.name?.trim()) {
      errors.push('CONTRACT_VIOLATION: Repository name is required and cannot be empty');
    }

    if (!contract.blueprintId?.trim()) {
      errors.push('CONTRACT_VIOLATION: Blueprint ID is required');
    }

    if (!contract.blueprintVersion?.trim()) {
      errors.push('CONTRACT_VIOLATION: Blueprint version is required');
    }

    // Runtime requirements validation
    if (!contract.runtimeRequirements) {
      errors.push('CONTRACT_VIOLATION: Runtime requirements must be specified');
    } else {
      // Operating system must be explicit
      if (!contract.runtimeRequirements.os || contract.runtimeRequirements.os.length === 0) {
        errors.push('CONTRACT_VIOLATION: Supported operating systems must be explicitly listed');
      }

      // Dependencies must be pinned (no ranges)
      if (!contract.runtimeRequirements.dependencies) {
        errors.push('CONTRACT_VIOLATION: Dependencies must be specified');
      } else {
        Object.entries(contract.runtimeRequirements.dependencies).forEach(([pkg, version]) => {
          if (!version || typeof version !== 'string') {
            errors.push(`CONTRACT_VIOLATION: Dependency '${pkg}' must have a version specified`);
          } else {
            // Check for version ranges (not allowed)
            const rangeIndicators = ['^', '~', '>', '<', '*', 'x', 'X'];
            if (rangeIndicators.some(indicator => version.includes(indicator))) {
              errors.push(`CONTRACT_VIOLATION: Dependency '${pkg}' version '${version}' contains range indicators. Versions must be pinned exactly.`);
            }
          }
        });
      }

      // Runtime version checks
      if (contract.runtimeRequirements.nodeVersion) {
        if (!contract.runtimeRequirements.nodeVersion.match(/^\d+\.\d+\.\d+$/)) {
          errors.push(`CONTRACT_VIOLATION: Node.js version '${contract.runtimeRequirements.nodeVersion}' must be a specific version (e.g., '18.0.0')`);
        }
      }
    }

    // Bootstrap command validation
    if (!contract.bootstrapCommand?.trim()) {
      errors.push('CONTRACT_VIOLATION: Bootstrap command is required');
    } else {
      // Must be a single command (one-command rule)
      if (contract.bootstrapCommand.includes('&&') || contract.bootstrapCommand.includes(';')) {
        errors.push('CONTRACT_VIOLATION: Bootstrap command must be a single command (one-command rule)');
      }
    }

    // Health check command validation
    if (!contract.healthCheckCommand?.trim()) {
      errors.push('CONTRACT_VIOLATION: Health check command is required');
    }

    // Protected files validation
    if (!contract.protectedFiles || contract.protectedFiles.length === 0) {
      errors.push('CONTRACT_VIOLATION: Protected files list must be specified');
    } else {
      // Must include critical files
      const requiredProtected = ['package.json', 'REPOSITORY_CONTRACT.json'];
      requiredProtected.forEach(required => {
        if (!contract.protectedFiles.includes(required)) {
          errors.push(`CONTRACT_VIOLATION: Critical file '${required}' must be in protected files list`);
        }
      });
    }

    // Compliance artifacts validation
    if (!contract.complianceArtifacts || contract.complianceArtifacts.length === 0) {
      errors.push('CONTRACT_VIOLATION: Compliance artifacts list must be specified');
    }

    // Failure diagnosis validation
    if (!contract.failureDiagnosis || Object.keys(contract.failureDiagnosis).length === 0) {
      errors.push('CONTRACT_VIOLATION: Failure diagnosis mapping is required');
    }

    // Warnings for best practices
    if (contract.runtimeRequirements?.dependencies) {
      const depCount = Object.keys(contract.runtimeRequirements.dependencies).length;
      if (depCount > 50) {
        warnings.push(`CONTRACT_WARNING: High dependency count (${depCount}) may impact security and maintenance`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate repository contract file content
   */
  static generateContractFile(contract: RepositoryContract): string {
    return JSON.stringify({
      // Metadata
      generatedAt: new Date().toISOString(),
      version: '2.0',

      // Contract content
      contract
    }, null, 2);
  }

  /**
   * Parse repository contract from file content
   */
  static parseContractFile(content: string): RepositoryContract | null {
    try {
      const parsed = JSON.parse(content);
      return parsed.contract || parsed;
    } catch (error) {
      console.error('Failed to parse repository contract:', error);
      return null;
    }
  }

  /**
   * Check if contract allows a specific operation
   */
  static checkContractPermission(
    contract: RepositoryContract,
    operation: string,
    target?: string
  ): { allowed: boolean; reason?: string } {
    // Example permission checks
    switch (operation) {
      case 'modify_protected_file':
        if (target && contract.protectedFiles.includes(target)) {
          return {
            allowed: false,
            reason: `File '${target}' is protected by repository contract`
          };
        }
        break;

      case 'use_unpinned_dependency':
        return {
          allowed: false,
          reason: 'All dependencies must be pinned to exact versions'
        };

      case 'skip_validation':
        return {
          allowed: false,
          reason: 'Validation is mandatory for all operations'
        };
    }

    return { allowed: true };
  }

  /**
   * Generate failure diagnosis report for contract violations
   */
  static generateFailureReport(
    contract: RepositoryContract,
    validationResult: { valid: boolean; errors: string[]; warnings: string[] }
  ): string {
    let report = `# Contract Validation Failure Report\n\n`;
    report += `**Repository:** ${contract.name}\n`;
    report += `**Timestamp:** ${new Date().toISOString()}\n\n`;

    if (validationResult.errors.length > 0) {
      report += `## Critical Violations (${validationResult.errors.length})\n\n`;
      validationResult.errors.forEach((error, i) => {
        const errorCode = error.split(':')[0];
        const diagnosis = contract.failureDiagnosis[errorCode];

        report += `### ${i + 1}. ${error}\n\n`;
        if (diagnosis) {
          report += `**Severity:** ${diagnosis.severity.toUpperCase()}\n`;
          report += `**Cause:** ${diagnosis.cause}\n`;
          report += `**Remediation:** ${diagnosis.remediation}\n\n`;
        } else {
          report += `*No specific diagnosis available for this error code.*\n\n`;
        }
      });
    }

    if (validationResult.warnings.length > 0) {
      report += `## Warnings (${validationResult.warnings.length})\n\n`;
      validationResult.warnings.forEach((warning, i) => {
        report += `${i + 1}. ${warning}\n`;
      });
      report += `\n`;
    }

    report += `## Resolution Steps\n\n`;
    report += `1. **Review each violation** and understand the root cause\n`;
    report += `2. **Apply remediation steps** listed above\n`;
    report += `3. **Re-validate contract** after fixes\n`;
    report += `4. **Regenerate repository** with corrected contract\n\n`;

    report += `## Prevention\n\n`;
    report += `- Ensure all mandatory fields are populated\n`;
    report += `- Pin all dependency versions exactly\n`;
    report += `- Include all critical files in protected list\n`;
    report += `- Test contract validation before generation\n`;

    return report;
  }
}
