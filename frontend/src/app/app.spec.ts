import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { authInterceptor } from './services/auth-interceptor';

describe('TaskManager', () => {
  const apiUrl = 'http://localhost:5218/api/tasks';
  const initialTask = { id: 1, title: 'Plugga Angular', isCompleted: false };
  let http: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { http.verify(); sessionStorage.clear(); });

  async function loggedIn() {
    sessionStorage.setItem('taskmanager-token', 'test-token');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const request = http.expectOne({ method: 'GET', url: apiUrl });
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush([initialTask]);
    await fixture.whenStable();
    return fixture;
  }

  function enter(element: HTMLElement, selector: string, value: string) {
    const input = element.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('loggar in med ett klick, lagrar token, hämtar tasks och loggar ut', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    http.expectNone(apiUrl);
    enter(element, '#username', 'simon');
    enter(element, '#password', 'Demo123!');
    await fixture.whenStable();
    element.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    const login = http.expectOne('http://localhost:5218/api/auth/login');
    expect(login.request.method).toBe('POST');
    expect(login.request.body).toEqual({ username: 'simon', password: 'Demo123!' });
    expect(login.request.headers.has('Authorization')).toBe(false);
    login.flush({ token: 'test-token', expiresAt: '2099-01-01T00:00:00Z' });
    expect(sessionStorage.getItem('taskmanager-token')).toBe('test-token');
    const get = http.expectOne(apiUrl);
    expect(get.request.headers.get('Authorization')).toBe('Bearer test-token');
    get.flush([initialTask]);
    await fixture.whenStable();
    expect(element.textContent).toContain('Plugga Angular');
    element.querySelector<HTMLButtonElement>('header button')!.click();
    await fixture.whenStable();
    expect(sessionStorage.getItem('taskmanager-token')).toBeNull();
    expect(element.querySelector('#password')).not.toBeNull();
    expect(element.textContent).not.toContain('Plugga Angular');
  });

  it('visar GET-svaret utan ett klick', async () => {
    const fixture = await loggedIn();
    expect(fixture.nativeElement.textContent).toContain('Antal tasks: 1');
    expect(fixture.nativeElement.textContent).toContain('Plugga Angular');
  });

  it('visar rätt meddelande när login-endpointen saknas', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    fixture.componentInstance.username = 'simon';
    fixture.componentInstance.password = 'Demo123!';
    fixture.componentInstance.login();
    http.expectOne('http://localhost:5218/api/auth/login')
      .flush({}, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Login-endpointen hittades inte');
    expect(fixture.nativeElement.textContent).not.toContain('Uppgiften finns inte längre');
  });

  it('skapar med en POST och ett klick och hindrar dubbelklick under anropet', async () => {
    const fixture = await loggedIn();
    const element = fixture.nativeElement as HTMLElement;
    enter(element, '#task-title', '  Ny uppgift  ');
    await fixture.whenStable();
    element.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
    element.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    const request = http.expectOne({ method: 'POST', url: apiUrl });
    expect(request.request.body.title).toBe('Ny uppgift');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush({ id: 2, title: 'Ny uppgift', isCompleted: false }, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    expect(element.textContent).toContain('Antal tasks: 2');
    expect(element.textContent).toContain('Ny uppgift');
    expect(element.querySelector<HTMLInputElement>('#task-title')!.value).toBe('');
    http.expectNone(apiUrl);
  });

  it('markerar klar och inte klar med en PUT per klick', async () => {
    const fixture = await loggedIn();
    const element = fixture.nativeElement as HTMLElement;
    for (const completed of [true, false]) {
      element.querySelector<HTMLButtonElement>('.actions button')!.click();
      await fixture.whenStable();
      const request = http.expectOne({ method: 'PUT', url: `${apiUrl}/1` });
      expect(request.request.body.isCompleted).toBe(completed);
      request.flush({ ...initialTask, isCompleted: completed });
      await fixture.whenStable();
      expect(element.querySelector('.completed') !== null).toBe(completed);
      http.expectNone(`${apiUrl}/1`);
    }
  });

  it('raderar med en DELETE och ett klick efter lyckat svar', async () => {
    const fixture = await loggedIn();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.danger')!.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('Plugga Angular');
    http.expectOne({ method: 'DELETE', url: `${apiUrl}/1` }).flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    expect(element.textContent).not.toContain('Plugga Angular');
    expect(element.textContent).toContain('Antal tasks: 0');
  });

  it('visar 404 och behåller listan tills användaren uppdaterar den', async () => {
    const fixture = await loggedIn();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.danger')!.click();
    http.expectOne(`${apiUrl}/1`).flush({}, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    expect(element.querySelector('[role=alert]')!.textContent).toContain('finns inte längre');
    expect(element.textContent).toContain('Plugga Angular');
    fixture.componentInstance.loadTasks();
    http.expectOne(apiUrl).flush([]);
    await fixture.whenStable();
    expect(element.textContent).toContain('Antal tasks: 0');
  });

  it('loggar ut vid 401 från API:t', async () => {
    const fixture = await loggedIn();
    fixture.componentInstance.loadTasks();
    http.expectOne(apiUrl).flush({}, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    expect(sessionStorage.getItem('taskmanager-token')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Logga in igen');
    expect(fixture.nativeElement.querySelector('#username')).not.toBeNull();
  });

  it('behåller den skrivna titeln vid nätverksfel', async () => {
    const fixture = await loggedIn();
    fixture.componentInstance.newTitle = 'Försök igen';
    fixture.componentInstance.addTask();
    http.expectOne(apiUrl).error(new ProgressEvent('error'));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Kunde inte nå servern');
    expect(fixture.componentInstance.newTitle).toBe('Försök igen');
    expect(fixture.componentInstance.busy).toBe(false);
  });
});
