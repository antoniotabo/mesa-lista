const esbuild=require('esbuild');
esbuild.buildSync({entryPoints:['src/main.jsx'],bundle:true,minify:true,outdir:'public',entryNames:'app',target:['es2020'],define:{'process.env.NODE_ENV':'"production"','__APP_VERSION__':JSON.stringify(require('../package.json').version)},legalComments:'eof'});
console.log('Interfaz compilada para funcionar sin Internet.');
