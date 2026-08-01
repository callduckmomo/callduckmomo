export function validateBankAccount(
  expectedAccount: string,
  apiAccountPattern: string
): boolean {
  try {
    if (!expectedAccount || !apiAccountPattern) {
      return false;
    }

    // Remove non-numeric characters from expected account
    const expectedNumbers = expectedAccount.replace(/[^0-9]/g, "");
    // Remove only dashes from API pattern
    const apiPattern = apiAccountPattern.replace(/-/g, "");

    if (!expectedNumbers || !apiPattern) {
      return false;
    }

    // If lengths don't match, use substring matching
    if (expectedNumbers.length !== apiPattern.length) {
      const apiNumbers = apiPattern.replace(/[^0-9]/g, "");
      return expectedNumbers.includes(apiNumbers) || apiNumbers.includes(expectedNumbers);
    }

    // Position-by-position pattern matching
    for (let i = 0; i < apiPattern.length; i++) {
      const expectedChar = expectedNumbers[i];
      const patternChar = apiPattern[i];

      // Skip hidden positions (x or X)
      if (patternChar === "x" || patternChar === "X") {
        continue;
      }

      // Check if it's a digit
      if (/\d/.test(patternChar)) {
        if (expectedChar !== patternChar) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error("Error in pattern matching:", error);
    return false;
  }
}

