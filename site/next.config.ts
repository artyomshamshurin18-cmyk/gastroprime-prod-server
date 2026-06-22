import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  assetPrefix: "",
  trailingSlash: true,

  async rewrites() {
    return [];
  },

  async redirects() {
    return [
      { source: "/cosntructions", destination: "/construction", permanent: true },
      { source: "/productions", destination: "/production", permanent: true },
      { source: "/healthfood", destination: "/healthy-meals", permanent: true },
      { source: "/page127018316.html", destination: "/request", permanent: true },
      { source: "/page132357906.html", destination: "/offer", permanent: true },
      { source: "/page132359876.html", destination: "/refund", permanent: true },
      { source: "/page132368286.html", destination: "/request", permanent: true },
      { source: "/page132371166.html", destination: "/request", permanent: true },
      { source: "/page98232466.html", destination: "/construction", permanent: true },
      { source: "/page98259896.html", destination: "/production", permanent: true },
      { source: "/page98240666.html", destination: "/warehouses", permanent: true },
      { source: "/page98277776.html", destination: "/healthy-meals", permanent: true },
      { source: "/shop", destination: "/healthy-meals", permanent: false },
      { source: "/page132283616.html", destination: "/healthy-meals", permanent: false },
    ];
  },
};

export default nextConfig;
