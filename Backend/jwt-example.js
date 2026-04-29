const jwt = require("jsonwebtoken");

const SECRET_KEY = "my_super_secret_key";

console.log("=== Node.js JWT Authentication Example ===\n");

// 1. Simulate a User Login (Generating a Token)
const generateToken = (user) => {
  console.log(`[1] User '${user.email}' is logging in...`);
  const payload = {
    userId: user.id,
    role: user.role,
  };
  
  // Sign the JWT
  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" });
  console.log(`[2] Generated JWT Token:\n${token}\n`);
  return token;
};

// 2. Simulate an API Request with the Token (Verifying a Token)
const verifyToken = (token) => {
  console.log(`[3] Simulating API request with Token...`);
  try {
    // Verify the JWT
    const decoded = jwt.verify(token, SECRET_KEY);
    console.log(`[4] Token verified successfully! Decoded Payload:`);
    console.log(decoded);
  } catch (error) {
    console.log(`[4] Token verification failed: ${error.message}`);
  }
};

// --- RUN THE EXAMPLE ---

// Mock User Data
const mockUser = { id: 101, email: "john@example.com", role: "admin" };

// Generate Token
const myToken = generateToken(mockUser);

// Verify valid Token
verifyToken(myToken);

console.log("\n-------------------------");

// Verify invalid Token
console.log("\n[5] Trying to verify an invalid token...");
verifyToken("invalid.token.string");
