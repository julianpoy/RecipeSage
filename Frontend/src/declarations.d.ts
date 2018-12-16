declare module 'fraction.js';
declare module 'blueimp-load-image';
declare module "*.json" {
  const value: any;
  export default value;
}
declare module "worker-loader!*" {
  class WebpackWorker extends Worker {
    constructor();
  }

  export default WebpackWorker;
}
