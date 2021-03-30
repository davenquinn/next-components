const ExtractCssChunks = require("extract-css-chunks-webpack-plugin");
const findUp = require("find-up");
const OptimizeCssAssetsWebpackPlugin = require("optimize-css-assets-webpack-plugin");

const fileExtensions = new Set();
let extractCssInitialized = false;

const cssLoaderConfig = (
  config,
  {
    extensions = [],
    cssModules = false,
    cssLoaderOptions = {},
    dev,
    isServer,
    postcssLoaderOptions = {},
    loaders = [],
  }
) => {
  // We have to keep a list of extensions for the splitchunk config
  for (const extension of extensions) {
    fileExtensions.add(extension);
  }

  if (!isServer) {
    config.optimization.splitChunks.cacheGroups.styles = {
      name: "styles",
      test: new RegExp(`\\.+(${[...fileExtensions].join("|")})$`),
      chunks: "all",
      enforce: true,
    };
  }

  if (!isServer && !extractCssInitialized) {
    config.plugins.push(
      new ExtractCssChunks({
        // Options similar to the same options in webpackOptions.output
        // both options are optional
        filename: dev
          ? "static/chunks/[name].css"
          : "static/chunks/[name].[contenthash:8].css",
        chunkFilename: dev
          ? "static/chunks/[name].chunk.css"
          : "static/chunks/[name].[contenthash:8].chunk.css",
        hot: dev,
      })
    );
    extractCssInitialized = true;
  }

  if (!dev) {
    if (!Array.isArray(config.optimization.minimizer)) {
      config.optimization.minimizer = [];
    }

    config.optimization.minimizer.push(
      new OptimizeCssAssetsWebpackPlugin({
        cssProcessorOptions: {
          discardComments: { removeAll: true },
        },
      })
    );
  }

  const postcssConfigPath = findUp.sync("postcss.config.js", {
    cwd: config.context,
  });
  let postcssLoader;

  if (postcssConfigPath) {
    // Copy the postcss-loader config options first.
    const postcssOptionsConfig = Object.assign(
      {},
      postcssLoaderOptions.config,
      { path: postcssConfigPath }
    );

    postcssLoader = {
      loader: "postcss-loader",
      options: Object.assign({}, postcssLoaderOptions, {
        config: postcssOptionsConfig,
      }),
    };
  }

  const cssLoader = {
    loader: "css-loader",
    options: Object.assign(
      {},
      {
        modules: cssModules,
        sourceMap: dev,
        importLoaders: loaders.length + (postcssLoader ? 1 : 0),
        exportOnlyLocals: isServer,
      },
      cssLoaderOptions
    ),
  };

  // When not using css modules we don't transpile on the server
  if (isServer && !cssLoader.options.modules) {
    return ["ignore-loader"];
  }

  // When on the server and using css modules we transpile the css
  if (isServer && cssLoader.options.modules) {
    return [cssLoader, postcssLoader, ...loaders].filter(Boolean);
  }

  return [
    !isServer && ExtractCssChunks.loader,
    cssLoader,
    postcssLoader,
    ...loaders,
  ].filter(Boolean);
};

//github.com/vercel/next.js/blob/ab158c0aee53882457d2bac3e36b8ccf197166f0/packages/next/build/webpack/config/blocks/css/index.ts

module.exports = (nextConfig = {}) => {
  return Object.assign({}, nextConfig, {
    webpack(config, options) {
      if (!options.defaultLoaders) {
        throw new Error(
          "This plugin is not compatible with Next.js versions below 5.0.0 https://err.sh/next-plugins/upgrade"
        );
      }

      const { dev, isServer } = options;
      const {
        cssModules,
        cssLoaderOptions,
        postcssLoaderOptions,
        stylusLoaderOptions = {},
      } = nextConfig;

      options.defaultLoaders.stylus = cssLoaderConfig(config, {
        extensions: ["styl"],
        cssLoaderOptions,
        cssModules: cssModules
          ? cssModules
          : {
              auto: true,
            },
        postcssLoaderOptions,
        dev,
        isServer,
        loaders: [
          {
            loader: "stylus-loader",
            options: stylusLoaderOptions,
          },
        ],
      });

      config.module.rules.push({
        test: /\.styl$/,
        use: options.defaultLoaders.stylus,
      });

      if (typeof nextConfig.webpack === "function") {
        return nextConfig.webpack(config, options);
      }

      return config;
    },
  });
};
