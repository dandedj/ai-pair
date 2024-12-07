import * as path from 'path';

export function resolvePath(basePath: string, relativePath?: string): string {
    return path.resolve(basePath, relativePath || '');
}

export function joinPaths(...paths: string[]): string {
    return path.join(...paths);
}

export function resolveProjectPaths(config: {
    projectRoot: string;
    srcDir?: string;
    testDir?: string;
}) {
    return {
        projectRoot: resolvePath(config.projectRoot),
        srcDir: resolvePath(config.projectRoot, config.srcDir || 'src/main/java'),
        testDir: resolvePath(config.projectRoot, config.testDir || 'src/test')
    };
} 