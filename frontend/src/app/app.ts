import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Task, TaskItem } from './services/task';
import { Auth } from './services/auth';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  tasks: TaskItem[] = [];
  username = '';
  password = '';
  newTitle = '';
  errorMessage = '';
  busy = false;

  constructor(private taskService: Task, public auth: Auth,
    private changeDetector: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (this.auth.token) this.loadTasks();
  }

  login(): void {
    if (this.busy || !this.username.trim() || !this.password) return;
    this.busy = true;
    this.errorMessage = '';
    this.auth.login(this.username.trim(), this.password).subscribe({
      next: () => {
        this.password = '';
        this.loadTasks();
      },
      error: (error: HttpErrorResponse) => this.handleError(error, true),
    });
  }

  logout(): void {
    this.auth.logout();
    this.tasks = [];
    this.password = '';
    this.newTitle = '';
    this.errorMessage = '';
  }

  loadTasks(): void {
    this.busy = true;
    this.errorMessage = '';
    this.taskService.getTasks().subscribe({
      next: data => {
        this.tasks = data;
        this.finishRequest();
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  addTask(): void {
    const title = this.newTitle.trim();
    if (this.busy || !title) return;
    this.busy = true;
    this.errorMessage = '';
    this.taskService.addTask(title).subscribe({
      next: newTask => {
        this.tasks = [...this.tasks, newTask];
        this.newTitle = '';
        this.finishRequest();
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  toggleTask(task: TaskItem): void {
    if (this.busy) return;
    this.busy = true;
    this.errorMessage = '';
    this.taskService.updateTask({ ...task, isCompleted: !task.isCompleted }).subscribe({
      next: updatedTask => {
        this.tasks = this.tasks.map(item => item.id === updatedTask.id ? updatedTask : item);
        this.finishRequest();
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  deleteTask(task: TaskItem): void {
    if (this.busy) return;
    this.busy = true;
    this.errorMessage = '';
    this.taskService.deleteTask(task.id).subscribe({
      next: () => {
        this.tasks = this.tasks.filter(item => item.id !== task.id);
        this.finishRequest();
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  private finishRequest(): void {
    this.busy = false;
    this.changeDetector.markForCheck();
  }

  private handleError(error: HttpErrorResponse, login = false): void {
    if (error.status === 401) {
      this.logout();
      this.errorMessage = login ? 'Fel användarnamn eller lösenord.' :
        'Din inloggning har gått ut eller är ogiltig. Logga in igen.';
    } else if (error.status === 404) {
      this.errorMessage = login
        ? 'Login-endpointen hittades inte. Starta om backend med den senaste koden.'
        : 'Uppgiften finns inte längre. Uppdatera listan.';
    } else if (error.status === 0) {
      this.errorMessage = 'Kunde inte nå servern. Kontrollera att backend körs.';
    } else {
      this.errorMessage = error.error?.message || 'Anropet misslyckades. Försök igen.';
    }
    this.finishRequest();
  }
}
