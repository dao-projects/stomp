const path = require("path");
module.exports = {
  mode: "production",
  entry: "./src/index.js",
  output: {
    filename: "./index.js",
    libraryTarget: "umd",
    library: "Stomp",
    libraryExport: "default", // 增加这个属性
    path: path.resolve(__dirname, "lib"),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [["@babel/preset-env"]],
          },
        },
      },
    ],
  },
};
