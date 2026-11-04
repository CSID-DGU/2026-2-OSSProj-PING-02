module.exports = {
  presets: ["module:@react-native/babel-preset"],
  plugins: [
    [
      "module-resolver",
      {
        root: ["./src"],
        extensions: [".ts", ".tsx", ".js", ".json"],
        alias: {
          "@core": "./src/core",
          "@pages": "./src/pages",
          "@components": "./src/components",
          "@routes": "./src/routes",
          "@hooks": "./src/hooks",
          "@apis": "./src/apis",
          "@constants": "./src/constants",
          "@assets": "./src/assets",
        },
      },
    ],
  ],
};
