# TaskManager

Utbildningsprojekt för LIA: Angular-frontend och ASP.NET Core/.NET 9-backend i C#.
Användaren kan logga in, hämta uppgifter, lägga till, markera klar/inte klar och radera.

## Starta

Förutsättningar: **.NET 9 SDK**, **Node.js 24.21.0** (verifierad version) och npm.
Projektet använder Angular 22.

### Konfigurera din lokala JWT-nyckel först

Alla kommandon för backend nedan körs från projektroten (`TaskManager`).
Signeringsnyckeln ligger inte i Git. Skapa en egen slumpmässig nyckel och spara den
med .NET user-secrets. Den lagras utanför repot och läses automatiskt i Development.
Kör en gång på din dator:

macOS/Linux (OpenSSL):

```bash
dotnet user-secrets set "Jwt:Key" "$(openssl rand -base64 48)" --project backend
```

Windows PowerShell:

```powershell
$keyBytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($keyBytes)
$rng.Dispose()
dotnet user-secrets set "Jwt:Key" ([Convert]::ToBase64String($keyBytes)) --project backend
```

Dela inte nyckeln och använd inte demo-inställningar i produktion. User-secrets är
lokal utvecklingslagring, inte ett krypterat produktionsvalv. Backend kan också läsa
en miljövariabel `Jwt__Key` om du föredrar det. Utan nyckel fungerar inte JWT-login.

### Starta backend och frontend

Terminal 1, från projektets rot:

```bash
dotnet restore backend/backend.csproj
dotnet run --project backend --launch-profile http
```

Backend: `http://localhost:5218`.

Terminal 2:

```bash
cd frontend
npm ci
npm start
```

Frontend: `http://localhost:4200`. Logga in med **simon / Demo123!**.
Demo-inställningarna ligger i `backend/appsettings.Development.json` och används av utvecklingsprofilen.
CORS tillåter frontend på exakt `http://localhost:4200`.

## Arkitektur

**Angular → HttpClient/HTTP med JSON → ASP.NET Core controllers i C# → task-lista i minnet.**

- `app.ts` hanterar användarens handlingar, listan och felmeddelanden.
- `services/task.ts` skickar GET, POST, PUT och DELETE.
- `services/auth.ts` loggar in och lagrar token i `sessionStorage`.
- `services/auth-interceptor.ts` lägger till Bearer-header på task-anrop till backend.
- `TaskController.cs` hanterar uppgifterna. En räknare ger unika ID:n även efter radering.
- `AuthController.cs` kontrollerar demo-inloggningen och skapar JWT.
- `Program.cs` kopplar ihop controllers, CORS, authentication och authorization.

Angular använder zoneless change detection. Efter HTTP-svar anropas `markForCheck()` så att
vyn uppdateras utan ett extra klick. Listan ändras först efter lyckat API-svar. Knapparna
inaktiveras medan ett anrop pågår. Vid misslyckad POST behålls den skrivna titeln.

## Endpoints

| Metod | Endpoint | Inloggning | Resultat |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Nej | 200 med `{ token, expiresAt }`; 401 vid fel uppgifter |
| GET | `/api/tasks` | Ja | 200 med array av tasks |
| POST | `/api/tasks` | Ja | 201 med skapad task |
| PUT | `/api/tasks/{id}` | Ja | 200 med uppdaterad task; 404 om ID saknas |
| DELETE | `/api/tasks/{id}` | Ja | 204 utan body; 404 om ID saknas |

Login-body: `{ "username": "simon", "password": "Demo123!" }`.
POST-body: `{ "title": "Visa projektet" }`.
PUT-body: `{ "title": "Visa projektet", "isCompleted": true }`.
ID i URL är det som används vid PUT. Tom titel ger 400. Saknad/ogiltig/utgången token ger 401.
Angular visar meddelanden för 401, 404, nätverksfel och andra API-fel. Efter 404 kan listan
hämtas igen med **Uppdatera listan**.

## JWT, authentication och authorization

1. Angular skickar användarnamn/lösenord till login-endpointen.
2. Backend kontrollerar dem och returnerar en signerad JWT med användarnamn och 30 minuters giltighetstid.
3. Angular lagrar token i `sessionStorage` (för den aktuella fliken, överlever omladdning).
4. Interceptorn skickar `Authorization: Bearer <token>` på task-anrop.
5. **Authentication** (`AddJwtBearer`/`UseAuthentication`) validerar signatur, issuer,
   audience och giltighetstid och identifierar användaren.
6. **Authorization** (`[Authorize]`/`UseAuthorization`) avgör om användaren får använda
   task-endpointen. Här är regeln enkel: alla inloggade användare får använda alla tasks.
7. Logout tar bort token och tömmer listan i UI:t. Vid 401 krävs ny inloggning.

JWT är signerad, inte krypterad. Lösenordet finns inte i token.
Implementationen använder Microsofts JWT Bearer-paket:
[officiell dokumentation](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-jwt-bearer-authentication?view=aspnetcore-9.0).

## Förenklingar och produktion

Detta är en **lokal demo, inte produktionssäker autentisering**:

- `simon / Demo123!` är ett avsiktligt offentligt lokalt utbildningskonto. Dessa credentials
  får aldrig användas i produktion eller återanvändas för riktiga konton.
- JWT-signeringsnyckeln skapas lokalt via user-secrets och ingår inte i Git.
  Produktion kräver säker hemlighetshantering, riktig användarhantering och säkra
  lösenordshashar eller en identitetsleverantör.
- Tasks lagras i en delad statisk lista och försvinner vid backend-omstart. Ingen databas
  eller koppling mellan task och användare. Ett lås skyddar listan vid samtidiga anrop.
- HTTP används lokalt. Produktion behöver HTTPS och rätt CORS-konfiguration.
- Token i `sessionStorage` är läsbar av JavaScript och kan stjälas vid XSS.
  Produktionslösningen behöver en genomtänkt sessionslösning och XSS-skydd.
- Ingen registrering, roller, refresh-token, rate limiting eller serverbaserad återkallelse.
  Logout tar bara bort den lokala token; en kopierad token fungerar tills den går ut.
- .NET/Angular och paket behöver hållas på supportade, uppdaterade versioner.

## Verifiering

```bash
cd frontend
npm test -- --watch=false
npm run build
```

Från projektets rot:

```bash
dotnet build backend/backend.csproj
```

Starta en separat test-backend i en terminal så att redovisningens data inte påverkas:

```bash
dotnet run --project backend --launch-profile http -- --urls http://localhost:5219
```

Kör sedan (Python 3, standardbibliotek):

```bash
python3 scripts/verify-api.py http://localhost:5219
```

API-testet kontrollerar login, JWT, 401 för alla task-metoder utan token, ogiltig token,
GET/POST/PUT/DELETE, 400/404 och unika ID:n efter radering. Testuppgifterna raderas efteråt.
Angular-testerna använder simulerade HTTP-svar och verkliga knappklick i en DOM-testmiljö:
login/logout, Bearer-header, ett anrop per handling, direkt UI-uppdatering, 401/404 och nätverksfel.
De ersätter inte ett fullständigt webbläsartest mot den riktiga backend-servern.

## Verifiering

Verifierat 7 oktober 2026:

- 10 Angular-tester godkända
- Frontend production build godkänd
- Backend build godkänd med 0 varningar och 0 fel
- API-test godkänt mot separat backend
- Skyddade endpoints verifierade med och utan giltig JWT
