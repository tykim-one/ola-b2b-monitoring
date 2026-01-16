# Chatbot DTOs

<!-- Parent: ../AGENTS.md -->

## Purpose

This directory contains Data Transfer Objects (DTOs) for the chatbot module. DTOs define the structure and validation rules for incoming API requests, ensuring type safety and data integrity.

## Key Files

### chat.dto.ts
Request DTO for chatbot chat endpoints using class-validator decorators.

**Exports:**
- `ChatRequestDto`: Validates chatbot message requests with required `message` and `pageContext` fields, plus optional `sessionId` for conversation continuity

**Validation Rules:**
- `message` (required): User's chat message, must be non-empty string
- `pageContext` (required): Context about the page/screen where chat occurs, must be non-empty string
- `sessionId` (optional): Session identifier for maintaining conversation history

## For AI Agents

### Validation Patterns
- Uses `class-validator` decorators for automatic validation in NestJS
- All fields use `@IsString()` for type checking
- Required fields use `@IsNotEmpty()` to prevent empty strings
- Optional fields use `@IsOptional()` decorator

### When Adding New DTOs
1. Import decorators from `class-validator`
2. Export class with descriptive JSDoc comment
3. Apply appropriate decorators for validation rules
4. Use `?` for optional fields in TypeScript
5. Follow naming convention: `{Action}{Entity}Dto` (e.g., `ChatRequestDto`, `UpdateSessionDto`)

### Usage in Controllers
DTOs are automatically validated by NestJS when used as parameter types in controller methods. Validation failures return 400 Bad Request with detailed error messages.

### Best Practices
- Keep DTOs simple and focused on data structure
- Use separate DTOs for request and response if structures differ
- Add JSDoc comments for clarity
- Consider using `class-transformer` decorators if type conversion is needed
