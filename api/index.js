
const cors = require("cors");

// Adjust these to your exact domains
const PROD_FRONTEND = "https://personal-finance-tracker-bul7.vercel.app";
const LOCAL_DEV = "http://localhost:5173";

function isAllowedOrigin(origin) {
  if (!origin) return true; // allow curl/postman/no-origin
  try {
    const url = new URL(origin);

    if (origin === PROD_FRONTEND) return true;

    // Allow Vercel preview URLs for this project:
    // e.g., https://personal-finance-tracker-bul7-abc123-user.vercel.app
    if (
      url.hostname.endsWith(".vercel.app") &&
      url.hostname.startsWith("personal-finance-tracker-bul7-")
    ) {
      return true;
    }

    if (origin === LOCAL_DEV) return true;

    return false;
  } catch {
    return false;
  }
}

const corsOptions = {
  origin(origin, cb) {
    if (isAllowedOrigin(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
};

// MUST be before any other middleware/routes
app.use(cors(corsOptions));
// Ensure preflight never 404s
app.options("*", cors(corsOptions));
