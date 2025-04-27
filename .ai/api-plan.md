# REST API Plan

## 1. Resources

- **Users** (mapped to the `users` table)
- **Flashcards** (mapped to the `flashcards` table)
- **Generations** (mapped to the `generations` table)
- **Generation Error Logs** (mapped to the `generation_error_logs` table; internal/admin use)
- **Learning Sessions** (API abstraction for spaced repetition sessions)

## 2. Endpoints

### A. Authentication & User Management
<!-- 1. **Register User**  
   - **Method:** POST  
   - **URL:** `/api/auth/register`  
   - **Description:** Register a new user account.  
   - **Request JSON:**
     ```json
     {
       "email": "user@example.com",
       "password": "securePassword"
     }
     ```  
   - **Response JSON:**
     ```json
     { "message": "User registered successfully" }
     ```  
   - **Success Codes:** 201  
   - **Error Codes:** 400 (validation error), 409 (email already exists)

2. **Login User**  
   - **Method:** POST  
   - **URL:** `/api/auth/login`  
   - **Description:** Authenticate a user and return a JWT token.  
   - **Request JSON:**
     ```json
     {
       "email": "user@example.com",
       "password": "securePassword"
     }
     ```  
   - **Response JSON:**
     ```json
     {
       "token": "jwt-token-string",
       "user": { "id": "user-uuid", "email": "user@example.com" }
     }
     ```  
   - **Success Codes:** 200  
   - **Error Codes:** 400 (validation error), 401 (incorrect credentials) -->

### B. Flashcards Management

1. **Get Flashcards**  
   - **Method:** GET  
   - **URL:** `/api/flashcards`  
   - **Description:** Retrieve a paginated list of flashcards for the authenticated user.  
   - **Query Parameters:**  
     - `page`: number (optional)  
     - `limit`: number (optional)  
     - `source`: string (filter by flashcard source e.g., "manual", "ai-edited", "ai-full")  
   - **Response JSON:**

     ```json
     {
       "data": [
         {
           "id": 123,
           "front": "Question?",
           "back": "Answer.",
           "source": "manual",
           "created_at": "2025-04-27T12:34:56Z",
           "updated_at": "2025-04-27T12:34:56Z"
         }
       ],
       "page": 1,
       "limit": 10,
       "total": 50
     }
     ```  

   - **Success Codes:** 200  
   - **Error Codes:** 401 (unauthorized)

2. **Create a Flashcard (Manual)**  
   - **Method:** POST  
   - **URL:** `/api/flashcards`  
   - **Description:** Create a new flashcard manually.  
   - **Request JSON:**

     ```json
     {
       "front": "What is the capital of France?",
       "back": "Paris",
       "source": "manual"
     }
     ```  

   - **Response JSON:**

     ```json
     {
       "id": 124,
       "front": "What is the capital of France?",
       "back": "Paris",
       "source": "manual",
       "created_at": "2025-04-27T12:45:00Z",
       "updated_at": "2025-04-27T12:45:00Z"
     }
     ```

   - **Success Codes:** 201  
   - **Error Codes:** 400 (validation errors), 401 (unauthorized)

3. **Update a Flashcard**  
   - **Method:** PUT  
   - **URL:** `/api/flashcards/{flashcardId}`  
   - **Description:** Update an existing flashcard.  
   - **Request JSON:**

     ```json
     {
       "front": "Updated question?",
       "back": "Updated answer."
     }
     ```  

   - **Response JSON:**

     ```json
     {
       "id": 124,
       "front": "Updated question?",
       "back": "Updated answer.",
       "source": "manual",
       "created_at": "2025-04-27T12:45:00Z",
       "updated_at": "2025-04-27T13:00:00Z"
     }
     ```  

   - **Success Codes:** 200  
   - **Error Codes:** 400 (validation error), 401 (unauthorized), 404 (not found)

4. **Delete a Flashcard**  
   - **Method:** DELETE  
   - **URL:** `/api/flashcards/{flashcardId}`  
   - **Description:** Delete a flashcard belonging to the authenticated user.  
   - **Response JSON:**

     ```json
     { "message": "Flashcard deleted successfully" }
     ```  

   - **Success Codes:** 200  
   - **Error Codes:** 401 (unauthorized), 404 (not found)

### C. AI-Generated Flashcards (Generations)

1. **Generate Flashcards via AI**  
   - **Method:** POST  
   - **URL:** `/api/generations`  
   - **Description:** Submit a text (1000 to 10000 characters) to generate flashcard suggestions using an AI model.  
   - **Request JSON:**

     ```json
     {
       "source_text": "The text to process...",
       "model": "chosen-model-identifier"
     }
     ```  

   - **Response JSON:**

     ```json
     {
       "generationId": 456,
       "flashcards": [
         { "front": "Generated question?", "back": "Generated answer." }
       ],
       "generated_count": 1,
       "accepted_unedited_count": null,
       "accepted_edited_count": null,
       "generation_duration": 3000,
       "created_at": "2025-04-27T13:20:00Z"
     }
     ```  

   - **Success Codes:** 201  
   - **Error Codes:** 400 (validation error, e.g., if text length is out of bounds), 401 (unauthorized), 500 (AI service error)

2. **Fetch Generation History**  
   - **Method:** GET  
   - **URL:** `/api/generations`  
   - **Description:** Retrieve a history of flashcard generations for the authenticated user.  
   - **Query Parameters:**  
     - `page`: number  
     - `limit`: number  
   - **Response JSON:**

     ```json
     {
       "data": [
         {
           "id": 456,
           "model": "chosen-model-identifier",
           "generated_count": 1,
           "accepted_unedited_count": null,
           "accepted_edited_count": null,
           "generation_duration": 3000,
           "created_at": "2025-04-27T13:20:00Z"
         }
       ],
       "page": 1,
       "limit": 10,
       "total": 5
     }
     ```  

   - **Success Codes:** 200  
   - **Error Codes:** 401 (unauthorized)

### E. Admin / Internal Endpoints (Optional)

1. **Get Generation Error Logs (Admin only)**  
   - **Method:** GET  
   - **URL:** `/api/admin/error-logs`  
   - **Description:** Retrieve a list of generation error logs; restricted access.  
   - **Response JSON:**

     ```json
     {
       "data": [
         {
           "id": 789,
           "error_code": "AI_GENERATION_FAILED",
           "error_message": "Detailed error message",
           "created_at": "2025-04-27T14:00:00Z"
         }
       ]
     }
     ```  

   - **Success Codes:** 200  
   - **Error Codes:** 401 (unauthorized), 403 (forbidden)

## 3. Authentication and Authorization

- **Mechanism:** JWT-based authentication using Supabase Auth integration.
- **Implementation Details:**  
  - Users receive a JWT token upon login.  
  - Endpoints validate the token and extract the user id from the token.  
  - All endpoints accessing user-specific data ensure that the user id in the token matches the `user_id` in the record using RLS policies (as specified in the DB plan and PRD).

## 4. Validation and Business Logic

- **Input Validation:**  
  - Validate email formats and password strength for registration.  
  - For AI generation, verify that the `source_text` length is between 1000 and 10000 characters.
  - Flashframe payloads enforce string lengths and required fields as per database schema constraints.
- **Error Handling:**  
  - Use guard clauses and early returns to handle invalid input or authentication errors.  
  - All endpoints return descriptive error messages along with appropriate HTTP status codes.
- **Business Logic Implementation:**  
  - **Registration and Login:** Early validation and token issuance.  
  - **Flashcard Generation:** Invokes an external AI service and records generation metadata in the `generations` table.  
  - **Flashcard CRUD:** Allows listing, creation, updating, and deletion while ensuring users only access their own records.  
  - **Learning Session:** Implements spaced repetition logic to serve the next due flashcard for review.
