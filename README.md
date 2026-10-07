# TaskManager

Ett mindre fullstackprojekt byggt med **Angular** och **ASP.NET Core/.NET 9 i C#**.

Projektet är framtaget som en del av min förberedelse inför LIA och för att praktiskt arbeta med hur frontend, backend, API och authentication hänger ihop.

Användaren kan:

- Logga in
- Hämta tasks
- Skapa tasks
- Markera tasks som klara/inte klara
- Radera tasks

## Teknik

**Frontend**
- Angular
- TypeScript
- HttpClient

**Backend**
- C#
- ASP.NET Core / .NET 9
- REST API
- JWT authentication

## Starta projektet

Förutsättningar: **.NET 9 SDK**, **Node.js** och npm.

### Backend

Skapa först en lokal JWT-nyckel:

```bash
dotnet user-secrets set "Jwt:Key" "lokal-utvecklingsnyckel-for-taskmanager-123456789" --project backend
```

Starta sedan backend:

```bash
dotnet restore backend/backend.csproj
dotnet run --project backend --launch-profile http
```

Backend körs på:

`http://localhost:5218`

### Frontend

Öppna en ny terminal:

```bash
cd frontend
npm ci
npm start
```

Frontend körs på:

`http://localhost:4200`

Demo-login:

**Användarnamn:** `simon`  
**Lösenord:** `Demo123!`

## Arkitektur

```text
Angular
   ↓
HttpClient / HTTP
   ↓
ASP.NET Core API
   ↓
C# Controllers
   ↓
Task-lista i minnet
```

Angular använder services för API-anrop. JWT skickas som Bearer-token vid skyddade anrop och backend skyddar task-endpoints med `[Authorize]`.

API:t innehåller:

| Metod | Endpoint | Funktion |
| --- | --- | --- |
| POST | `/api/auth/login` | Logga in |
| GET | `/api/tasks` | Hämta tasks |
| POST | `/api/tasks` | Skapa task |
| PUT | `/api/tasks/{id}` | Uppdatera task |
| DELETE | `/api/tasks/{id}` | Radera task |

## Authentication

Efter lyckad login skapar backend en signerad JWT.

Angular lagrar token i `sessionStorage` och skickar den som:

```text
Authorization: Bearer <token>
```

Backend validerar token innan skyddade endpoints får användas.

## Begränsningar

Projektet är en lokal utbildningsdemo och inte en produktionslösning.

- Tasks lagras i minnet och försvinner när backend startas om.
- Alla inloggade användare delar samma task-lista.
- Demo-användaren är hårdkodad för lokal utveckling.
- Ingen registrering, databas, roller eller refresh-token finns.
- JWT-nyckeln lagras lokalt med .NET User Secrets och finns inte i Git.

## Verifiering

Verifierat 7 oktober 2026:

- 10 Angular-tester godkända
- Frontend production build godkänd
- Backend build: 0 fel och 0 varningar
- API-test för login, JWT och CRUD godkänt

Ett fullständigt webbläsar-E2E-test har inte körts.
