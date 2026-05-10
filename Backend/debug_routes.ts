import "reflect-metadata";
import app from "./src/app";

function print(path: string, layer: any) {
  if (layer.route) {
    layer.route.stack.forEach(print.bind(null, path + layer.route.path));
  } else if (layer.name === 'router' && layer.handle.stack) {
    layer.handle.stack.forEach(print.bind(null, path + (layer.regexp.source.replace('^\\', '').replace('\\/?(?=\\/|$)', ''))));
  } else if (layer.method) {
    console.log(`${layer.method.toUpperCase()} ${path}`);
  }
}

app._router.stack.forEach(print.bind(null, ''));
