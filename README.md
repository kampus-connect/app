# Thanks for checking out Marko

# Installation

Make sure that there is sibling folder called 'db' it will contain your custom database

```
npm install -D @marko/type-check
npm audit fix
```

## Overview

This project is powered by [@marko/run](https://github.com/marko-js/run).

- Run `npm run dev` to start the development server
- Run `npm run build` to build a production-ready node.js server
- Run `npm run preview` to run the production server

## Adding Pages

Pages map to the directory structure. You can add additional pages by creating files/directories under `src/routes` with `+page.marko` files. Learn more in the [`@marko/run` docs](https://github.com/marko-js/run/#file-based-routing).
