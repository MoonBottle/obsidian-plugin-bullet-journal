const esbuild = require('esbuild');
const path = require('path');

async function build() {
  console.log('[build-mcp] 开始构建 MCP 服务器...');

  try {
    const result = await esbuild.build({
      entryPoints: ['src/mcp/server.ts'],
      outfile: 'mcp-server.js',
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      minify: false,
      sourcemap: true
    });

    if (result.errors.length > 0) {
      console.error('[build-mcp] 构建失败:', result.errors);
      process.exit(1);
    }

    if (result.warnings.length > 0) {
      console.warn('[build-mcp] 构建警告:', result.warnings);
    }

    console.log('[build-mcp] 构建成功!');
    console.log(`[build-mcp] 输出文件: ${path.resolve('mcp-server.js')}`);
  } catch (error) {
    console.error('[build-mcp] 构建错误:', error);
    process.exit(1);
  }
}

build();
