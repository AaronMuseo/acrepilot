const path=require('path'),fs=require('fs'),http=require('http');
const root=path.resolve(__dirname,'../..');
const esbuild=require('esbuild');
const mobile=path.join(root,'apps/mobile/node_modules');
(async()=>{const result=await esbuild.build({entryPoints:[path.join(__dirname,'main.tsx')],bundle:true,write:false,jsx:'automatic',define:{__DEV__:'true','process.env.NODE_ENV':'"development"'},alias:{'react-native':path.join(mobile,'react-native-web'),'react':path.join(mobile,'react'),'react-dom':path.join(mobile,'react-dom')},plugins:[{name:'preview-state',setup(build){build.onResolve({filter:/^\.\/app-state$/},()=>({path:path.join(__dirname,'state.tsx')}));}}]});
const js=result.outputFiles[0].text;
http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'application/javascript':'text/html');res.end(req.url==='/bundle.js'?js:'<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;background:#f4f5ef;font-family:Arial}#root{max-width:390px;padding:16px;margin:auto;box-sizing:border-box}p{font-size:14px}</style><div id="root"></div><script src="/bundle.js"></script>');}).listen(8090,'127.0.0.1',()=>console.log('UI component preview http://127.0.0.1:8090'));})();
