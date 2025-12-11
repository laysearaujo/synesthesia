# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 14.18+ or 16+) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download here](https://git-scm.com/)

Verify your installation:

```bash
node --version
npm --version
git --version
```

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/laysearaujo/synesthesia
cd https://github.com/laysearaujo/synesthesia
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages defined in `package.json`.

### 3. Run the Development Server

```bash
npm run dev
```

The application will start at `http://localhost:5173` (default Vite port).

Open your browser and navigate to the URL shown in your terminal to see the app running.

## Project Structure

```
project-root/
├── node_modules/       # Dependencies
├── public/            # Static assets
├── src/               # Source files
│   ├── assets/        # Images, fonts, etc.
│   ├── components/    # React components
│   ├── App.jsx        # Main App component
│   └── main.jsx       # Entry point
├── index.html         # HTML template
├── package.json       # Project dependencies and scripts
├── vite.config.js     # Vite configuration
└── README.md          # This file
```

## Technologies Used

- **React** - UI library
- **Vite** - Build tool and dev server
- **JavaScript/JSX** - Programming language

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues or questions, please open an issue in the GitHub repository.

---

Built with ⚡️ Vite and ⚛️ React
