// const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
// const { join } = require('path');

// module.exports = {
//   output: {
//     path: join(__dirname, '../../dist/apps/gateway'),
//     clean: true,
//     ...(process.env.NODE_ENV !== 'production' && {
//       devtoolModuleFilenameTemplate: '[absolute-resource-path]',
//     }),
//   },
//   plugins: [
//     new NxAppWebpackPlugin({
//       target: 'node',
//       compiler: 'tsc',
//       main: './src/main.ts',
//       tsConfig: './tsconfig.app.json',
//       assets: ['./src/assets'],
//       optimization: false,
//       outputHashing: 'none',
//       generatePackageJson: true,
//       sourceMap: true,
//     }),
//   ],
// };

const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/gateway'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMap: true,
      // Add the NestJS Swagger Plugin here:
      transformers: [
        {
          name: '@nestjs/swagger/plugin',
          options: {
            dtoFileNameSuffix: ['.dto.ts', '.entity.ts'],
            controllerFileNameSuffix: ['.controller.ts'],
            classValidatorShim: true,
            introspectComments: true,
            typeCheck: true,
          },
        },
      ],
    }),
  ],
};
