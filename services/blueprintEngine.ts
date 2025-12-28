import { Blueprint, BLUEPRINTS, RepositoryContract, RepoConfig } from '../types';

/**
 * Blueprint Engine - Supplies fixed, immutable, battle-tested architectures
 * No user permutations allowed. Blueprints are versioned and security-reviewed.
 */
export class BlueprintEngine {
  /**
   * Get all available blueprints
   */
  static getBlueprints(): Blueprint[] {
    return BLUEPRINTS;
  }

  /**
   * Get blueprint by ID
   */
  static getBlueprint(id: string): Blueprint | undefined {
    return BLUEPRINTS.find(bp => bp.id === id);
  }

  /**
   * Get blueprints by category
   */
  static getBlueprintsByCategory(category: Blueprint['category']): Blueprint[] {
    return BLUEPRINTS.filter(bp => bp.category === category);
  }

  /**
   * Validate blueprint exists and is current
   */
  static validateBlueprint(id: string): { valid: boolean; blueprint?: Blueprint; error?: string } {
    const blueprint = this.getBlueprint(id);
    if (!blueprint) {
      return { valid: false, error: `Blueprint '${id}' not found` };
    }

    // In V2, blueprints are immutable once released
    // Future: Add version checking for evolution paths
    return { valid: true, blueprint };
  }

  /**
   * Generate repository contract from blueprint
   * This creates the machine-readable file with explicit runtime requirements
   */
  static generateContract(config: RepoConfig): RepositoryContract {
    const blueprint = this.getBlueprint(config.blueprintId);
    if (!blueprint) {
      throw new Error(`Invalid blueprint: ${config.blueprintId}`);
    }

    // Build runtime requirements based on blueprint
    const runtimeRequirements: RepositoryContract['runtimeRequirements'] = {
      os: ['linux', 'darwin', 'win32'], // Cross-platform by default
      dependencies: {}
    };

    // Set runtime version based on tech stack
    if (blueprint.techStack.runtime === 'Node.js') {
      runtimeRequirements.nodeVersion = '^18.0.0'; // Pinned major version
    } else if (blueprint.techStack.language === 'Python') {
      runtimeRequirements.pythonVersion = '^3.9.0';
    } else if (blueprint.techStack.language === 'Go') {
      runtimeRequirements.goVersion = '^1.19.0';
    } else if (blueprint.techStack.language === 'Rust') {
      runtimeRequirements.rustVersion = '^1.70.0';
    }

    // Add core dependencies with pinned versions (no ranges)
    if (blueprint.techStack.framework === 'Next.js') {
      runtimeRequirements.dependencies = {
        'next': '14.0.0',
        'react': '18.2.0',
        'react-dom': '18.2.0',
        'typescript': '5.0.0'
      };
    } else if (blueprint.techStack.framework === 'Express') {
      runtimeRequirements.dependencies = {
        'express': '4.18.0',
        'typescript': '5.0.0',
        '@types/express': '4.17.0',
        '@types/node': '20.0.0'
      };
    }

    // Define protected files (AI cannot modify)
    const protectedFiles = [
      'package.json',
      'tsconfig.json',
      'next.config.js',
      '.env.example',
      'REPOSITORY_CONTRACT.json',
      'FAILURE_MAP.md',
      'EVOLUTION_PATH.md',
      'AUDIT_LOG.json'
    ];

    // Define compliance artifacts
    const complianceArtifacts = [
      'AUDIT_LOG.json',
      'DEPENDENCY_INVENTORY.md',
      'SECURITY_BASELINE.md'
    ];

    // Define failure diagnosis
    const failureDiagnosis: RepositoryContract['failureDiagnosis'] = {
      'BOOTSTRAP_FAILED': {
        severity: 'critical',
        cause: 'Bootstrap command failed to execute',
        remediation: 'Check runtime requirements and environment setup'
      },
      'DEPENDENCY_CONFLICT': {
        severity: 'high',
        cause: 'Package dependencies have version conflicts',
        remediation: 'Review DEPENDENCY_INVENTORY.md and pin conflicting packages'
      },
      'CONTRACT_VIOLATION': {
        severity: 'high',
        cause: 'Repository contract requirements not met',
        remediation: 'Review REPOSITORY_CONTRACT.json and fix violations'
      }
    };

    return {
      name: config.name,
      description: config.description,
      author: config.author,
      license: config.license,
      blueprintId: blueprint.id,
      blueprintVersion: blueprint.version,
      runtimeRequirements,
      bootstrapCommand: 'npm run bootstrap', // One-command rule
      healthCheckCommand: 'npm run health-check',
      protectedFiles,
      complianceArtifacts,
      failureDiagnosis
    };
  }

  /**
   * Check if blueprint evolution is needed based on usage patterns
   * This implements the "Versioned Evolution Path" principle
   */
  static checkEvolutionNeeds(blueprint: Blueprint, usageMetrics: any): {
    needsEvolution: boolean;
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    // Example evolution triggers (would be based on real metrics)
    if (usageMetrics.requestCount > 1000000) {
      recommendations.push('Consider microservices split for scalability');
    }

    if (usageMetrics.errorRate > 0.05) {
      recommendations.push('Review failure map and implement error boundaries');
    }

    return {
      needsEvolution: recommendations.length > 0,
      recommendations
    };
  }
}
