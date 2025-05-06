# API Endpoint Implementation Plan: GET /generations and GET /generations/{id}

## 1. Przegląd punktu końcowego

### GET /generations

Endpoint zwracający listę żądań generacji dla zalogowanego użytkownika z opcjonalną paginacją.

### GET /generations/{id}

Endpoint zwracający szczegółowe informacje o konkretnej generacji

## 2. Szczegóły żądania

### **GET /generations**

- Metoda HTTP: GET
- Struktura URL: `/generations`
- Parametry Query:
  - `page` (opcjonalny): numer strony, domyślnie 1
  - `limit` (opcjonalny): liczba wyników na stronę, domyślnie 10
- Headers:
  - Accept: application/json

### **GET /generations/{id}**

- Metoda HTTP: GET
- Struktura URL: `/generations/{id}`
- Parametry Path:
  - `id`: identyfikator generacji (number)
- Headers:
  - Accept: application/json

## 3. Wykorzystywane typy

```typescript
// Typy bazy danych
type Generation = Database["public"]["Tables"]["generations"]["Row"];
type Flashcard = Database["public"]["Tables"]["flashcards"]["Row"];

// DTOs
interface PaginationDto {
  page: number;
  limit: number;
  total: number;
}

interface GenerationsListResponseDto {
  data: Generation[];
  pagination: PaginationDto;
}

type GenerationDetailDto = Generation & {
  flashcards?: FlashcardDto[];
};
```

## 4. Przepływ danych

### 4.1 **GET /generations**

- Walidacja parametrów paginacji
- Pobranie total count dla paginacji
- Pobranie generacji dla użytkownika z paginacją
- Mapowanie do DTO
- Zwrócenie odpowiedzi z paginacją

### 4.2 **GET /generations/{id}**

-Walidacja ID generacji
-Pobranie generacji z bazy
-Pobranie powiązanych fiszek
-Mapowanie do DTO
-Zwrócenie odpowiedzi lub 404

## 5. Względy bezpieczeństwa

Sprawdzenie autentykacji użytkownika przez Astro middleware
Filtrowanie wyników tylko do generacji zalogowanego użytkownika
Walidacja parametrów wejściowych przez schemat Zod
Sanityzacja danych wyjściowych (tylko wymagane pola)

## 6. Obsługa błędów

400 Bad Request: Nieprawidłowe parametry paginacji
401 Unauthorized: Brak autoryzacji
404 Not Found: Generacja nie istnieje
500 Internal Server Error: Błędy bazy danych

## 7. Rozważania dotyczące wydajności

Indeks na kolumnie user_id w tabeli generations
Indeks na kolumnie generation_id w tabeli flashcards
Limit ilości zwracanych rekordów

## 8. Etapy wdrożenia

### 8.1 Rozszerzenie GenerationService

```ts
class GenerationService {
  async list(userId: string, page: number, limit: number): Promise<GenerationsListResponseDto>;
  async getById(userId: string, id: number): Promise<GenerationDetailDto>;
}
```

### 8.2 Implementacja walidacji (src/pages/api/generations.ts)

```ts
const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10)
});
```

### 8.3 Implementacja endpointu listy

- Walidacja parametrów
- Użycie GenerationService
- Obsługa błędów
- Formatowanie odpowiedzi

### 8.4 Implementacja endpointu szczegółów

- Walidacja ID
- Użycie GenerationService
- Obsługa 404
- Dołączenie powiązanych fiszek
