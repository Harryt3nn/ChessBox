/*apps/desktop/src/types/modules.d.ts*/


declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}

// "file?url" imports emit the file as-is and give its URL (webpack.renderer.config.ts)
declare module "*?url" {
  const url: string;
  export default url;
}

declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}
