declare module "helmet" {
  type RequestHandler = import("express").RequestHandler;

  export interface HelmetOptions {
    contentSecurityPolicy?: any;
    crossOriginEmbedderPolicy?: any;
    crossOriginOpenerPolicy?: any;
    crossOriginResourcePolicy?: any;
    originAgentCluster?: boolean;
    referrerPolicy?: any;
    strictTransportSecurity?: any;
    xContentTypeOptions?: any;
    xDnsPrefetchControl?: any;
    xDownloadOptions?: any;
    xFrameOptions?: any;
    xPermittedCrossDomainPolicies?: any;
    xPoweredBy?: any;
    xXssProtection?: any;
    [key: string]: any;
  }

  export interface Helmet {
    (options?: HelmetOptions): RequestHandler;
    [key: string]: any;
  }

  const helmet: Helmet;
  export default helmet;
}
