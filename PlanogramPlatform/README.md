# PlanogramPlatform Architecture

The **PlanogramPlatform** is the core web application of the Planitt retail ecosystem. It provides the interface and server infrastructure for designing planograms, monitoring compliance, tracking inventory forecasting, and managing retail optimization strategies.

This platform follows a decoupled **Client-Server Architecture**, divided into a modern React frontend and a robust Node.js/Express backend.

---

## 1. Frontend Architecture (`/frontend`)

The frontend is a Single Page Application (SPA) built to deliver a highly interactive, responsive, and data-rich user experience for retail managers and staff.

### Tech Stack
- **Framework:** React 18
- **Build Tool / Bundler:** Vite (for fast HMR and optimized builds)
- **Routing:** React Router v7 (`react-router-dom`)
- **Styling:** TailwindCSS with `tailwindcss-animate`
- **UI Components:** Radix UI primitives (`@radix-ui/react-*`), Lucide Icons, React Icons
- **Data Visualization:** Recharts
- **HTTP Client:** Axios

### Directory Structure & Responsibilities
- **`src/App.jsx` & `src/main.jsx`**: The application entry points. Handles the top-level Router setup and wraps the application in the `AuthProvider`.
- **`src/pages/`**: Contains the top-level route views.
  - `LandingPage.jsx`, `LoginPage.jsx`, `SignupPage.jsx` for unauthenticated flows.
  - `Dashboard.jsx`: The core authenticated layout that nests the numerous modular dashboard views (Analytics, Planograms, Optimization, StoreInfo, Settings, etc.).
- **`src/components/`**: Houses reusable UI elements.
  - Contains over 60 granular components, ranging from generic UI wrappers (buttons, inputs) to complex, domain-specific widgets (`ExternalFactorsWidget.jsx`, `ReplenishmentQueue.jsx`, `WasteAlerts.jsx`).
  - Contains modular sub-directories like `Optimization/` for specific workflow features.
- **`src/context/`**: Manages global React State. Contains `AuthContext.jsx` for managing user sessions and providing route protection (`ProtectedRoute`).
- **`src/services/` & `src/api/`**: Encapsulates external API calls to the central backend.
- **`src/lib/`**: Contains utility functions (like Tailwind class merging helpers: `cn` using `clsx` and `tailwind-merge`).

### Key Concepts
- **Route Protection:** Access to the `Dashboard` and its nested routes is strictly governed by the `AuthContext` state, ensuring unauthenticated users are redirected.
- **Modularity:** Massive features like "Optimization" or "Inventory" are broken into their own isolated views to prevent component bloat.

---

## 2. Backend Architecture (`/backend`)

The backend is a RESTful API service responsible for data persistence, business logic, authentication, and orchestrating requests to the external Python AI models.

### Tech Stack
- **Runtime:** Node.js
- **Web Framework:** Express.js
- **Database ORM:** Mongoose (MongoDB)
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs (password hashing)
- **Validation:** Zod
- **External Integration:** OpenAI API (for dynamic LLM generation)

### Directory Structure & Responsibilities
- **`src/server.js` & `src/app.js`**: Application configuration and server bootstrapping. Sets up CORS to allow connections from the Vite frontend, configures JSON parsing, cookie parsing, and maps standard API routes.
- **`src/routes/`**: Defines the API contract and maps HTTP methods/URLs to specific controller functions.
  - Modularized by domain: `authRoutes`, `userRoutes`, `planogramRoutes`, `storeRoutes`, `productRoutes`, `inventoryRoutes`, `complianceRoutes`, `promotionRoutes`, etc.
- **`src/controllers/`**: Contains the core business logic. Extracts request payloads, orchestrates data updates, and formats HTTP responses.
- **`src/models/`**: Defines Mongoose schemas for MongoDB.
  - Enforces data integrity for Users, Stores, Products, Planograms, and system Events before writing to the database.
- **`src/middleware/`**: Contains interceptor functions that run before controllers.
  - Handles authentication validation (verifying JWTs from cookies/headers), role-based authorization, and potential request validation using Zod.
- **`src/agents/` & `src/agentLogic/`**: Specialized directories that likely interface with or mimic the intelligent agent workflows, potentially structuring payloads to send to the Python microservices.
- **`src/services/`**: Abstracts complex, reusable logic out of the controllers (e.g., executing Python scripts, managing complex third-party API calls, or database aggregations).

### Key Concepts
- **Stateless Authentication:** The backend uses JWTs, allowing it to scale horizontally without managing session memory.
- **Separation of Concerns:** The MVC-like pattern (Routes -> Controllers -> Models/Services) ensures the codebase remains maintainable as the retail platform scales.

---

## Integration

1. The user interacts with the **React Frontend** (`localhost:5173`).
2. The frontend uses **Axios** (with `withCredentials: true`) to send requests to the **Express Backend** (`localhost:3000`).
3. The **Backend** processes logic, queries **MongoDB** via **Mongoose**, or forwards specialized algorithmic requests to one of the **PythonModels** endpoints running concurrently.
4. Data flows back to the frontend to update the interactive **Recharts** visualizations and Radix-based dashboards.
