/**
 * A simple function that returns a greeting message
 * @param name The name to greet
 * @returns Greeting message
 */
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

// Example usage
console.log(greet("TypeScript"));
