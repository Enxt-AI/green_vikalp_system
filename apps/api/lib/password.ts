import bcrypt from "bcrypt";
import crypto from "crypto";

const SALT_ROUNDS = 12;

/**
 * hashPassword - Securely hash a password using bcrypt
 * 
 * Security Features:
 * - Uses bcrypt algorithm (designed for password hashing)
 * - Salt rounds: 12 (good balance of security vs. performance)
 * - Automatic salt generation (unique per password)
 * - Resistant to rainbow table attacks
 * 
 * Cost Factor:
 * - Higher salt rounds = more secure but slower
 * - 12 rounds = ~250ms to hash (acceptable for auth)
 * - Increases time for brute force attacks exponentially
 * 
 * @param password - Plain text password from user
 * @returns Promise<string> - Bcrypt hash (includes salt and hash)
 * 
 * Storage:
 * - Store returned hash in database passwordHash field
 * - Never store plain text passwords
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * verifyPassword - Compare plain text password with bcrypt hash
 * 
 * Process:
 * 1. Extracts salt from stored hash
 * 2. Hashes provided password with extracted salt
 * 3. Compares resulting hash with stored hash
 * 4. Returns true only if exact match
 * 
 * Timing Attack Protection:
 * - bcrypt.compare uses constant-time comparison
 * - Prevents attackers from guessing passwords by timing
 * 
 * @param password - Plain text password from login attempt
 * @param hash - Stored bcrypt hash from database
 * @returns Promise<boolean> - true if password matches, false otherwise
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * generateRandomPassword - Create a secure random password for new users
 * 
 * Password Composition:
 * - 3 uppercase letters (A-Z, excluding easily confused: I, O)
 * - 3 lowercase letters (a-z, excluding easily confused: i, l, o)
 * - 2 digits (2-9, excluding 0, 1)
 * - 2 special characters (!@#$%&*)
 * Total: 10 characters
 * 
 * Security:
 * - Uses crypto.randomInt for cryptographically secure randomness
 * - Excludes ambiguous characters to prevent user confusion
 * - Shuffled using Fisher-Yates algorithm for unpredictability
 * 
 * Use Cases:
 * - Initial password for admin-created users
 * - Password reset by admins
 * - User forced to change on first login (needsPasswordChange flag)
 * 
 * @returns string - Random 10-character password
 */
export function generateRandomPassword(): string {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ"; 
  const lowercase = "abcdefghjkmnpqrstuvwxyz"; 
  const digits = "23456789";
  const special = "!@#$%&*";

  let password = "";

  // Add 3 uppercase
  for (let i = 0; i < 3; i++) {
    password += uppercase[crypto.randomInt(uppercase.length)];
  }

  // Add 3 lowercase
  for (let i = 0; i < 3; i++) {
    password += lowercase[crypto.randomInt(lowercase.length)];
  }

  // Add 2 digits
  for (let i = 0; i < 2; i++) {
    password += digits[crypto.randomInt(digits.length)];
  }

  // Add 2 special characters
  for (let i = 0; i < 2; i++) {
    password += special[crypto.randomInt(special.length)];
  }

  // Shuffle the password
  return shuffleString(password);
}

/**
 * Shuffle a string using Fisher-Yates algorithm
 */
function shuffleString(str: string): string {
  const arr = str.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    // Ensure arr[i] and arr[j] are defined strings
    const temp: string = arr[i] ?? "";
    arr[i] = arr[j] ?? "";
    arr[j] = temp;
  }
  return arr.join("");
}
