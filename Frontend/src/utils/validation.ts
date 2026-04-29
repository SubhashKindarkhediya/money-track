/**
 * Validation Utility
 * 
 * This file contains validation functions for the application.
 * By centralizing validation logic here, we ensure that rules are consistent, 
 * easy to maintain and test, and we keep our React components clean.
 * 
 * The validateTransaction function checks if the transaction details are correct:
 * - Amount must be provided.
 * - Amount must be a valid number greater than 0.
 * - In 'single' mode, a person must be selected.
 * - In 'group' mode, at least one person must be selected.
 * 
 * It returns an object with an isValid boolean and an error message if any.
 */

export const validateTransaction = (
  mode: "single" | "group",
  amount: string,
  personId: string | undefined,
  selectedPersonsLength: number
): { isValid: boolean; error: string | null } => {
  if (!amount || amount.trim() === "") {
    return { isValid: false, error: "Please enter an amount." };
  }

  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount) || numAmount <= 0) {
    return { isValid: false, error: "Please enter a valid amount greater than 0." };
  }

  if (mode === "single" && !personId) {
    return { isValid: false, error: "Please select a person for the transaction." };
  }

  if (mode === "group" && selectedPersonsLength === 0) {
    return { isValid: false, error: "Please select at least one person for the group transaction." };
  }

  return { isValid: true, error: null };
};
