import { describe, it, expect } from 'vitest';
import { BlueprintEngine } from '../services/blueprintEngine';
import { AppStep, INITIAL_CONFIG } from '../types';

describe('BlueprintEngine', () => {
    it('should return all blueprints', () => {
        const blueprints = BlueprintEngine.getBlueprints();
        expect(blueprints.length).toBeGreaterThan(0);
        expect(blueprints.find(bp => bp.id === 'production-web-platform')).toBeDefined();
    });

    it('should return blueprint by id', () => {
        const bp = BlueprintEngine.getBlueprint('production-web-platform');
        expect(bp).toBeDefined();
        expect(bp?.id).toBe('production-web-platform');
    });

    it('should validate existing blueprint', () => {
        const result = BlueprintEngine.validateBlueprint('production-web-platform');
        expect(result.valid).toBe(true);
        expect(result.blueprint).toBeDefined();
    });

    it('should reject non-existent blueprint', () => {
        const result = BlueprintEngine.validateBlueprint('non-existent');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not found');
    });

    it('should generate a valid contract for production-web-platform', () => {
        const config = { ...INITIAL_CONFIG, blueprintId: 'production-web-platform' };
        const contract = BlueprintEngine.generateContract(config);

        expect(contract.blueprintId).toBe('production-web-platform');
        expect(contract.runtimeRequirements.nodeVersion).toBe('^18.0.0');
        expect(contract.runtimeRequirements.dependencies).toHaveProperty('next');
        expect(contract.runtimeRequirements.dependencies).toHaveProperty('react');
    });

    it('should generate a valid contract for cli-commander', () => {
        const config = { ...INITIAL_CONFIG, blueprintId: 'cli-commander' };
        const contract = BlueprintEngine.generateContract(config);

        expect(contract.blueprintId).toBe('cli-commander');
        expect(contract.runtimeRequirements.dependencies).toHaveProperty('commander');
        expect(contract.runtimeRequirements.dependencies).toHaveProperty('chalk');
    });
});
